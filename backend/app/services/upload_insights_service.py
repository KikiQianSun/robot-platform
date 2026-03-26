from datetime import datetime

from fastapi import HTTPException

from app.models.upload_record import UploadRecord
from app.services.csv_processing_service import load_converted_rows


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


def filter_rows_by_time_window(rows: list[dict], time_window: str) -> list[dict]:
    if not rows:
        return rows
    latest = max(parse_datetime(row["timestamp"]) for row in rows)
    months_back = {"6m": 6, "1y": 12, "2y": 24}.get(time_window)
    if months_back is None:
        return rows
    boundary_month = latest.month - months_back
    boundary_year = latest.year
    while boundary_month <= 0:
        boundary_month += 12
        boundary_year -= 1
    boundary = latest.replace(year=boundary_year, month=boundary_month)
    return [row for row in rows if parse_datetime(row["timestamp"]) >= boundary]


def build_time_buckets(rows: list[dict]) -> list[dict]:
    buckets: dict[str, dict[str, int]] = {}
    for row in rows:
        dt = parse_datetime(row["timestamp"])
        label = f"{dt.year} Q{(dt.month - 1) // 3 + 1}"
        bucket = buckets.setdefault(label, {"total_records": 0, "fault_count": 0, "warning_count": 0})
        bucket["total_records"] += 1
        if is_fault(row):
            bucket["fault_count"] += 1
        if is_warning(row):
            bucket["warning_count"] += 1
    return [{"label": label, "total_records": v["total_records"], "fault_count": v["fault_count"], "fault_rate": round(v["fault_count"] / v["total_records"], 4) if v["total_records"] else 0, "warning_count": v["warning_count"], "warning_rate": round(v["warning_count"] / v["total_records"], 4) if v["total_records"] else 0} for label, v in sorted(buckets.items())]


def build_robot_buckets(rows: list[dict]) -> list[dict]:
    buckets: dict[str, dict[str, int]] = {}
    for row in rows:
        bucket = buckets.setdefault(row["robot_id"], {"total_records": 0, "fault_count": 0, "warning_count": 0})
        bucket["total_records"] += 1
        if is_fault(row):
            bucket["fault_count"] += 1
        if is_warning(row):
            bucket["warning_count"] += 1
    result = [{"robot_id": robot_id, "total_records": v["total_records"], "fault_count": v["fault_count"], "fault_rate": round(v["fault_count"] / v["total_records"], 4) if v["total_records"] else 0, "warning_count": v["warning_count"], "warning_rate": round(v["warning_count"] / v["total_records"], 4) if v["total_records"] else 0} for robot_id, v in buckets.items()]
    return sorted(result, key=lambda item: (-item["fault_rate"], -item["warning_rate"], item["robot_id"]))


def build_battery_buckets(rows: list[dict]) -> list[dict]:
    ranges = [(0, 20, "0-20"), (21, 40, "21-40"), (41, 60, "41-60"), (61, 80, "61-80"), (81, 100, "81-100")]
    buckets = {label: {"total_records": 0, "fault_count": 0, "warning_count": 0} for _, _, label in ranges}
    for row in rows:
        for start, end, label in ranges:
            if start <= row["battery_level"] <= end:
                buckets[label]["total_records"] += 1
                if is_fault(row):
                    buckets[label]["fault_count"] += 1
                if is_warning(row):
                    buckets[label]["warning_count"] += 1
                break
    return [{"label": label, "total_records": v["total_records"], "fault_count": v["fault_count"], "fault_rate": round(v["fault_count"] / v["total_records"], 4) if v["total_records"] else 0, "warning_count": v["warning_count"], "warning_rate": round(v["warning_count"] / v["total_records"], 4) if v["total_records"] else 0} for _, _, label in ranges for v in [buckets[label]]]


async def get_upload_rows(record: UploadRecord, robot_id: str | None, start_time: str | None, end_time: str | None, device_status: str | None, device_b_status: str | None, error_code: str | None, error_only: bool, page: int, page_size: int) -> dict:
    rows = await load_converted_rows(record)
    filtered_rows = [row for row in rows if matches_filters(row, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only)]
    start = (page - 1) * page_size
    end = start + page_size
    return {"record_id": record.id, "original_filename": record.original_filename, "total": len(filtered_rows), "page": page, "page_size": page_size, "items": filtered_rows[start:end]}


async def get_upload_insights(record: UploadRecord, scope: str, time_window: str, robot_id: str | None, start_time: str | None, end_time: str | None, device_status: str | None, device_b_status: str | None, error_code: str | None, error_only: bool) -> dict:
    rows = await load_converted_rows(record)
    if scope == "filtered":
        rows = [row for row in rows if matches_filters(row, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only)]
    elif scope != "all":
        raise HTTPException(status_code=400, detail="scope must be 'filtered' or 'all'")
    if time_window not in {"6m", "1y", "2y"}:
        raise HTTPException(status_code=400, detail="time_window must be '6m', '1y', or '2y'")
    rows = filter_rows_by_time_window(rows, time_window)
    return {"record_id": record.id, "original_filename": record.original_filename, "scope": scope, "time_window": time_window, "total_records": len(rows), "fault_records": sum(1 for row in rows if is_fault(row)), "warning_records": sum(1 for row in rows if is_warning(row)), "time_buckets": build_time_buckets(rows), "robot_buckets": build_robot_buckets(rows), "battery_buckets": build_battery_buckets(rows)}
