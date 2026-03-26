import csv
import io
import os
import uuid
from datetime import datetime

import aiofiles
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.csv_field_config import (
    ALIAS_LOOKUP,
    ALL_FIELDS,
    FIELD_SPECS,
    FieldError,
    normalize,
    validate_and_convert,
)
from app.database import get_db
from app.models.upload_record import UploadRecord
from app.schemas.upload_record import (
    UploadRecordInsightsResponse,
    UploadRecordOut,
    UploadRecordRowsResponse,
)

router = APIRouter(prefix="/files", tags=["files"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _build_local_file_url(filename: str) -> str:
    base = settings.PUBLIC_BACKEND_URL.rstrip("/")
    return f"{base}/api/v1/files/{filename}"


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file. Uses local disk in dev, Supabase Storage in production."""
    if settings.is_production:
        return await _upload_to_supabase(file)
    return await _upload_to_local(file)


async def _upload_to_local(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)
    return {"filename": filename, "url": _build_local_file_url(filename)}


async def _upload_to_supabase(file: UploadFile):
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        ext = os.path.splitext(file.filename or "")[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        content = await file.read()
        client.storage.from_(settings.SUPABASE_BUCKET).upload(filename, content)
        url = client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(filename)
        return {"filename": filename, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract_filename_from_url(file_url: str) -> str:
    return file_url.rstrip("/").split("/")[-1]


def _delete_local_file(filename: str):
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(path):
        os.remove(path)


async def _delete_supabase_file(filename: str):
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        client.storage.from_(settings.SUPABASE_BUCKET).remove([filename])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _normalize_headers(raw_headers: list[str]) -> tuple[dict[str, str], list[str]]:
    header_map: dict[str, str] = {}
    unknown_columns: list[str] = []
    seen_canonical: set[str] = set()

    for raw in raw_headers:
        key = normalize(raw)
        canonical = ALIAS_LOOKUP.get(key)
        if canonical and canonical not in seen_canonical:
            header_map[raw] = canonical
            seen_canonical.add(canonical)
        else:
            unknown_columns.append(raw)

    return header_map, unknown_columns


def _validate_rows(rows: list[dict], header_map: dict[str, str]) -> tuple[list[dict], list[dict]]:
    converted_rows: list[dict] = []
    errors: list[dict] = []

    for row_idx, raw_row in enumerate(rows, start=2):
        converted: dict = {}
        for raw_col, canonical in header_map.items():
            raw_val = raw_row.get(raw_col, "")
            try:
                converted[canonical] = validate_and_convert(canonical, raw_val or "")
            except FieldError as exc:
                errors.append(
                    {
                        "row": row_idx,
                        "field": canonical,
                        "raw_value": raw_val,
                        "reason": str(exc),
                    }
                )
        converted_rows.append(converted)

    return converted_rows, errors


async def _read_stored_file_bytes(record: UploadRecord) -> bytes:
    if settings.is_production:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(record.file_url)
                response.raise_for_status()
            return response.content
        except httpx.HTTPError:
            raise HTTPException(status_code=404, detail="File not found")

    filename = _extract_filename_from_url(record.file_url)
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    async with aiofiles.open(path, "rb") as f:
        return await f.read()


async def _load_converted_rows(record: UploadRecord) -> list[dict]:
    content_bytes = await _read_stored_file_bytes(record)

    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    raw_headers: list[str] = list(reader.fieldnames or [])
    if not raw_headers:
        raise HTTPException(status_code=422, detail="CSV file has no headers")

    header_map, _unknown_columns = _normalize_headers(raw_headers)
    missing = [field for field in ALL_FIELDS if field not in header_map.values()]
    if missing:
        raise HTTPException(status_code=422, detail="Stored CSV file is missing required fields")

    converted_rows, errors = _validate_rows(rows, header_map)
    if errors:
        raise HTTPException(status_code=422, detail="Stored CSV file contains invalid rows")

    return converted_rows


def _parse_datetime(value: str) -> datetime:
    """Parse ISO 8601 datetime string, tolerating missing seconds and timezone."""
    value = value.strip()
    # Normalise Z suffix
    value = value.replace("Z", "+00:00")
    # datetime-local inputs omit seconds: '2026-03-12T15:35' -> append ':00'
    if "T" in value:
        time_part = value.split("T", 1)[1]
        # Strip timezone suffix to check the time portion length
        for sep in ("+", "-"):
            if sep in time_part[1:]:  # skip leading '-' in negative offsets
                time_part = time_part[:time_part[1:].index(sep) + 1]
                break
        if len(time_part) == 5:  # HH:MM only
            insert_at = value.index("T") + 6
            value = value[:insert_at] + ":00" + value[insert_at:]
    # If still no timezone info, treat as UTC
    if "+" not in value[10:] and value[-1] != "Z":
        value = value + "+00:00"
    return datetime.fromisoformat(value)


def _matches_filters(
    row: dict,
    robot_id: str | None,
    start_time: str | None,
    end_time: str | None,
    device_status: str | None,
    device_b_status: str | None,
    error_code: str | None,
    error_only: bool,
) -> bool:
    if robot_id and row["robot_id"] != robot_id:
        return False

    row_time = _parse_datetime(row["timestamp"])

    if start_time:
        if row_time < _parse_datetime(start_time):
            return False

    if end_time:
        if row_time > _parse_datetime(end_time):
            return False

    if device_status and row["device_a_status"] != device_status:
        return False

    if device_b_status and row["device_b_status"] != device_b_status:
        return False

    if error_code is not None and error_code != "":
        try:
            if row["error_code"] != int(error_code):
                return False
        except ValueError:
            return False

    if error_only:
        if row["error_code"] is None:
            return False

    return True


def _is_fault(row: dict) -> bool:
    return row["error_code"] is not None


def _is_warning(row: dict) -> bool:
    return row["device_a_status"] == "warning" or row["device_b_status"] == "warning"


def _filter_rows_by_time_window(rows: list[dict], time_window: str) -> list[dict]:
    if not rows:
        return rows

    latest = max(_parse_datetime(row["timestamp"]) for row in rows)
    months_back_map = {
        "6m": 6,
        "1y": 12,
        "2y": 24,
    }
    months_back = months_back_map.get(time_window)
    if months_back is None:
        return rows

    boundary_month = latest.month - months_back
    boundary_year = latest.year
    while boundary_month <= 0:
        boundary_month += 12
        boundary_year -= 1
    boundary = latest.replace(year=boundary_year, month=boundary_month)
    return [row for row in rows if _parse_datetime(row["timestamp"]) >= boundary]


def _build_time_buckets(rows: list[dict]) -> list[dict]:
    buckets: dict[str, dict[str, int]] = {}
    for row in rows:
        dt = _parse_datetime(row["timestamp"])
        quarter = (dt.month - 1) // 3 + 1
        label = f"{dt.year} Q{quarter}"
        bucket = buckets.setdefault(label, {"total_records": 0, "fault_count": 0, "warning_count": 0})
        bucket["total_records"] += 1
        if _is_fault(row):
            bucket["fault_count"] += 1
        if _is_warning(row):
            bucket["warning_count"] += 1

    return [
        {
            "label": label,
            "total_records": values["total_records"],
            "fault_count": values["fault_count"],
            "fault_rate": round(values["fault_count"] / values["total_records"], 4) if values["total_records"] else 0,
            "warning_count": values["warning_count"],
            "warning_rate": round(values["warning_count"] / values["total_records"], 4) if values["total_records"] else 0,
        }
        for label, values in sorted(buckets.items())
    ]


def _build_robot_buckets(rows: list[dict]) -> list[dict]:
    buckets: dict[str, dict[str, int]] = {}
    for row in rows:
        robot_id = row["robot_id"]
        bucket = buckets.setdefault(robot_id, {"total_records": 0, "fault_count": 0, "warning_count": 0})
        bucket["total_records"] += 1
        if _is_fault(row):
            bucket["fault_count"] += 1
        if _is_warning(row):
            bucket["warning_count"] += 1

    result = [
        {
            "robot_id": robot_id,
            "total_records": values["total_records"],
            "fault_count": values["fault_count"],
            "fault_rate": round(values["fault_count"] / values["total_records"], 4) if values["total_records"] else 0,
            "warning_count": values["warning_count"],
            "warning_rate": round(values["warning_count"] / values["total_records"], 4) if values["total_records"] else 0,
        }
        for robot_id, values in buckets.items()
    ]
    return sorted(result, key=lambda item: (-item["fault_rate"], -item["warning_rate"], item["robot_id"]))


def _build_battery_buckets(rows: list[dict]) -> list[dict]:
    ranges = [
        (0, 20, "0-20"),
        (21, 40, "21-40"),
        (41, 60, "41-60"),
        (61, 80, "61-80"),
        (81, 100, "81-100"),
    ]
    buckets = {label: {"total_records": 0, "fault_count": 0, "warning_count": 0} for _, _, label in ranges}

    for row in rows:
        battery_level = row["battery_level"]
        for start, end, label in ranges:
            if start <= battery_level <= end:
                buckets[label]["total_records"] += 1
                if _is_fault(row):
                    buckets[label]["fault_count"] += 1
                if _is_warning(row):
                    buckets[label]["warning_count"] += 1
                break

    return [
        {
            "label": label,
            "total_records": values["total_records"],
            "fault_count": values["fault_count"],
            "fault_rate": round(values["fault_count"] / values["total_records"], 4) if values["total_records"] else 0,
            "warning_count": values["warning_count"],
            "warning_rate": round(values["warning_count"] / values["total_records"], 4) if values["total_records"] else 0,
        }
        for _, _, label in ranges
        for values in [buckets[label]]
    ]



@router.post("/upload/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    content_bytes = await file.read()

    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    raw_headers: list[str] = list(reader.fieldnames or [])

    if not raw_headers:
        raise HTTPException(status_code=422, detail="CSV file has no headers")

    header_map, unknown_columns = _normalize_headers(raw_headers)

    missing = [f for f in ALL_FIELDS if f not in header_map.values()]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Missing required fields",
                "missing_fields": missing,
                "unknown_columns": unknown_columns,
            },
        )

    converted_rows, errors = _validate_rows(rows, header_map)
    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Validation failed: {len(errors)} error(s) found",
                "errors": errors,
                "unknown_columns": unknown_columns,
            },
        )

    if settings.is_production:
        file.file = io.BytesIO(content_bytes)
        store_result = await _upload_to_supabase(file)
    else:
        ext = os.path.splitext(file.filename or "log")[1] or ".csv"
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(settings.UPLOAD_DIR, filename)
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content_bytes)
        store_result = {"filename": filename, "url": _build_local_file_url(filename)}

    db.add(
        UploadRecord(
            original_filename=file.filename or "uploaded.csv",
            file_url=store_result["url"],
            row_count=len(rows),
        )
    )
    db.commit()

    return {
        **store_result,
        "original_filename": file.filename,
        "row_count": len(rows),
        "headers": list(ALL_FIELDS),
        "preview": [{k: ("" if v is None else v) for k, v in row.items()} for row in converted_rows[:10]],
        "unknown_columns": unknown_columns,
        "errors": [],
        "field_specs": FIELD_SPECS,
    }


@router.get("/history", response_model=list[UploadRecordOut])
def get_upload_history(db: Session = Depends(get_db)):
    return db.query(UploadRecord).order_by(UploadRecord.uploaded_at.desc()).all()


@router.get("/history/{record_id}/rows", response_model=UploadRecordRowsResponse)
async def get_upload_record_rows(
    record_id: int,
    robot_id: str | None = Query(default=None),
    start_time: str | None = Query(default=None),
    end_time: str | None = Query(default=None),
    device_status: str | None = Query(default=None),
    device_b_status: str | None = Query(default=None),
    error_code: str | None = Query(default=None),
    error_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    record = db.query(UploadRecord).filter(UploadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")

    rows = await _load_converted_rows(record)
    filtered_rows = [
        row
        for row in rows
        if _matches_filters(row, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only)
    ]

    total = len(filtered_rows)
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "record_id": record.id,
        "original_filename": record.original_filename,
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": filtered_rows[start:end],
    }


@router.get("/history/{record_id}/insights", response_model=UploadRecordInsightsResponse)
async def get_upload_record_insights(
    record_id: int,
    scope: str = Query(default="filtered"),
    time_window: str = Query(default="1y"),
    robot_id: str | None = Query(default=None),
    start_time: str | None = Query(default=None),
    end_time: str | None = Query(default=None),
    device_status: str | None = Query(default=None),
    device_b_status: str | None = Query(default=None),
    error_code: str | None = Query(default=None),
    error_only: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    record = db.query(UploadRecord).filter(UploadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")

    rows = await _load_converted_rows(record)
    if scope == "filtered":
        rows = [
            row
            for row in rows
            if _matches_filters(row, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only)
        ]
    elif scope != "all":
        raise HTTPException(status_code=400, detail="scope must be 'filtered' or 'all'")

    if time_window not in {"6m", "1y", "2y"}:
        raise HTTPException(status_code=400, detail="time_window must be '6m', '1y', or '2y'")

    rows = _filter_rows_by_time_window(rows, time_window)
    fault_records = sum(1 for row in rows if _is_fault(row))
    warning_records = sum(1 for row in rows if _is_warning(row))

    return {
        "record_id": record.id,
        "original_filename": record.original_filename,
        "scope": scope,
        "time_window": time_window,
        "total_records": len(rows),
        "fault_records": fault_records,
        "warning_records": warning_records,
        "time_buckets": _build_time_buckets(rows),
        "robot_buckets": _build_robot_buckets(rows),
        "battery_buckets": _build_battery_buckets(rows),
    }


@router.delete("/history/{record_id}")
async def delete_upload_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(UploadRecord).filter(UploadRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")

    filename = _extract_filename_from_url(record.file_url)
    if settings.is_production:
        await _delete_supabase_file(filename)
    else:
        _delete_local_file(filename)

    db.delete(record)
    db.commit()
    return {"message": "File deleted"}


@router.get("/{filename}")
async def serve_file(filename: str):
    """Serve uploaded file (development only)."""
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Use Supabase URL directly in production")
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
