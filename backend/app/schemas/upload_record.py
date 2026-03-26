from datetime import datetime

from pydantic import BaseModel


class UploadRecordOut(BaseModel):
    id: int
    original_filename: str
    file_url: str
    row_count: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class UploadRecordRow(BaseModel):
    robot_id: str
    timestamp: str
    location_x: float
    location_y: float
    battery_level: int
    device_a_status: str
    device_b_status: str
    speed: float
    error_code: int | None


class UploadRecordRowsResponse(BaseModel):
    record_id: int
    original_filename: str
    total: int
    page: int
    page_size: int
    items: list[UploadRecordRow]


class InsightTimeBucket(BaseModel):
    label: str
    total_records: int
    fault_count: int
    fault_rate: float
    warning_count: int
    warning_rate: float


class InsightRobotBucket(BaseModel):
    robot_id: str
    total_records: int
    fault_count: int
    fault_rate: float
    warning_count: int
    warning_rate: float


class InsightBatteryBucket(BaseModel):
    label: str
    total_records: int
    fault_count: int
    fault_rate: float
    warning_count: int
    warning_rate: float


class UploadRecordInsightsResponse(BaseModel):
    record_id: int
    original_filename: str
    scope: str
    time_window: str
    total_records: int
    fault_records: int
    warning_records: int
    time_buckets: list[InsightTimeBucket]
    robot_buckets: list[InsightRobotBucket]
    battery_buckets: list[InsightBatteryBucket]
