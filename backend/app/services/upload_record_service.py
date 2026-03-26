import csv
import io
import os
from datetime import datetime

import aiofiles
import httpx
from fastapi import HTTPException, UploadFile

from app.config import settings
from app.csv_field_config import ALIAS_LOOKUP, ALL_FIELDS, FIELD_SPECS, FieldError, normalize, validate_and_convert
from app.models.upload_record import UploadRecord
from app.repositories.upload_record_repository import UploadRecordRepository
from app.services.file_storage_service import delete_stored_file, extract_filename_from_url, store_upload


def normalize_headers(raw_headers: list[str]) -> tuple[dict[str, str], list[str]]:
    header_map: dict[str, str] = {}
    unknown_columns: list[str] = []
    seen_canonical: set[str] = set()
    for raw in raw_headers:
        canonical = ALIAS_LOOKUP.get(normalize(raw))
        if canonical and canonical not in seen_canonical:
            header_map[raw] = canonical
            seen_canonical.add(canonical)
        else:
            unknown_columns.append(raw)
    return header_map, unknown_columns


def validate_rows(rows: list[dict], header_map: dict[str, str]) -> tuple[list[dict], list[dict]]:
    converted_rows: list[dict] = []
    errors: list[dict] = []
    for row_idx, raw_row in enumerate(rows, start=2):
        converted: dict = {}
        for raw_col, canonical in header_map.items():
            raw_val = raw_row.get(raw_col, "")
            try:
                converted[canonical] = validate_and_convert(canonical, raw_val or "")
            except FieldError as exc:
                errors.append({"row": row_idx, "field": canonical, "raw_value": raw_val, "reason": str(exc)})
        converted_rows.append(converted)
    return converted_rows, errors


async def read_stored_file_bytes(record: UploadRecord) -> bytes:
    if settings.is_production:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(record.file_url)
                response.raise_for_status()
            return response.content
        except httpx.HTTPError:
            raise HTTPException(status_code=404, detail="File not found")

    filename = extract_filename_from_url(record.file_url)
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    async with aiofiles.open(path, "rb") as f:
        return await f.read()


async def load_converted_rows(record: UploadRecord) -> list[dict]:
    content_bytes = await read_stored_file_bytes(record)
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    raw_headers = list(reader.fieldnames or [])
    if not raw_headers:
        raise HTTPException(status_code=422, detail="CSV file has no headers")

    header_map, _ = normalize_headers(raw_headers)
    missing = [field for field in ALL_FIELDS if field not in header_map.values()]
    if missing:
        raise HTTPException(status_code=422, detail="Stored CSV file is missing required fields")

    converted_rows, errors = validate_rows(rows, header_map)
    if errors:
        raise HTTPException(status_code=422, detail="Stored CSV file contains invalid rows")
    return converted_rows


def parse_datetime(value: str) -> datetime:
    value = value.strip().replace("Z", "+00:00")
    if "T" in value:
        time_part = value.split("T", 1)[1]
        for sep in ("+", "-"):
            if sep in time_part[1:]:
                time_part = time_part[:time_part[1:].index(sep) + 1]
                break
        if len(time_part) == 5:
            insert_at = value.index("T") + 6
            value = value[:insert_at] + ":00" + value[insert_at:]
    if "+" not in value[10:] and value[-1] != "Z":
        value = value + "+00:00"
    return datetime.fromisoformat(value)


def matches_filters(row: dict, robot_id: str | None, start_time: str | None, end_time: str | None, device_status: str | None, device_b_status: str | None, error_code: str | None, error_only: bool) -> bool:
    if robot_id and row["robot_id"] != robot_id:
        return False
    row_time = parse_datetime(row["timestamp"])
    if start_time and row_time < parse_datetime(start_time):
        return False
    if end_time and row_time > parse_datetime(end_time):
        return False
    if device_status and row["device_a_status"] != device_status:
        return False
    if device_b_status and row["device_b_status"] != device_b_status:
        return False
    if error_code not in (None, ""):
        try:
            if row["error_code"] != int(error_code):
                return False
        except ValueError:
            return False
    return not error_only or row["error_code"] is not None


def is_fault(row: dict) -> bool:
    return row["error_code"] is not None


def is_warning(row: dict) -> bool:
    return row["device_a_status"] == "warning" or row["device_b_status"] == "warning"
