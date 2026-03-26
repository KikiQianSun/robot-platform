import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import Base
from app.models import upload_record  # noqa: F401
from app.repositories.upload_record_repository import UploadRecordRepository
from app.services.csv_processing_service import (
    normalize_headers,
    upload_csv_file,
    validate_rows,
)
from app.services.upload_insights_service import (
    build_battery_buckets,
    build_time_buckets,
    filter_rows_by_time_window,
    get_upload_insights,
    matches_filters,
)


VALID_CSV = """robot_id,timestamp,location_x,location_y,battery_level,device_a_status,device_b_status,speed,error_code
robot_001,2024-03-15T14:23:01Z,12.34,-5.67,85,ok,warning,1.5,
robot_002,2024-03-15T14:24:01Z,10.00,-4.50,80,warning,ok,1.2,400
"""


class UploadRecordServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.upload_dir = os.path.join(self.temp_dir.name, "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self.db_path = os.path.join(self.temp_dir.name, "test.db")

        settings.APP_ENV = "development"
        settings.UPLOAD_DIR = self.upload_dir
        settings.PUBLIC_BACKEND_URL = "http://testserver"

        self.engine = create_engine(
            f"sqlite:///{self.db_path}",
            connect_args={"check_same_thread": False},
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()
        self.repository = UploadRecordRepository(self.db)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def test_normalize_headers_and_validate_rows(self):
        header_map, unknown_columns = normalize_headers([
            "robot_id",
            "timestamp",
            "location_x",
            "location_y",
            "battery_level",
            "device_a_status",
            "device_b_status",
            "speed",
            "error_code",
            "extra_col",
        ])
        self.assertEqual(header_map["robot_id"], "robot_id")
        self.assertEqual(unknown_columns, ["extra_col"])

        rows = [{
            "robot_id": "robot_001",
            "timestamp": "2024-03-15T14:23:01Z",
            "location_x": "12.34",
            "location_y": "-5.67",
            "battery_level": "85",
            "device_a_status": "ok",
            "device_b_status": "warning",
            "speed": "1.5",
            "error_code": "",
        }]
        converted_rows, errors = validate_rows(rows, header_map)
        self.assertEqual(errors, [])
        self.assertEqual(converted_rows[0]["battery_level"], 85)
        self.assertIsNone(converted_rows[0]["error_code"])

    async def test_upload_csv_file_and_get_insights(self):
        upload = UploadFile(filename="logs.csv", file=io.BytesIO(VALID_CSV.encode("utf-8")))
        result = await upload_csv_file(upload, self.repository)

        self.assertEqual(result["original_filename"], "logs.csv")
        self.assertEqual(result["row_count"], 2)
        self.assertEqual(len(self.repository.list_history()), 1)

        record = self.repository.list_history()[0]
        insights = await get_upload_insights(
            record,
            scope="all",
            time_window="1y",
            robot_id=None,
            start_time=None,
            end_time=None,
            device_status=None,
            device_b_status=None,
            error_code=None,
            error_only=False,
        )
        self.assertEqual(insights["total_records"], 2)
        self.assertEqual(insights["fault_records"], 1)
        self.assertEqual(insights["warning_records"], 2)
        self.assertEqual(len(insights["time_buckets"]), 1)

    def test_filter_and_bucket_helpers(self):
        rows = [
            {
                "robot_id": "robot_001",
                "timestamp": "2024-03-15T14:23:01Z",
                "location_x": 12.34,
                "location_y": -5.67,
                "battery_level": 85,
                "device_a_status": "ok",
                "device_b_status": "warning",
                "speed": 1.5,
                "error_code": None,
            },
            {
                "robot_id": "robot_002",
                "timestamp": "2024-03-15T14:24:01Z",
                "location_x": 10.0,
                "location_y": -4.5,
                "battery_level": 80,
                "device_a_status": "warning",
                "device_b_status": "ok",
                "speed": 1.2,
                "error_code": 400,
            },
        ]

        self.assertTrue(matches_filters(rows[1], None, None, None, None, None, "400", True))
        self.assertEqual(len(filter_rows_by_time_window(rows, "1y")), 2)

        time_buckets = build_time_buckets(rows)
        battery_buckets = build_battery_buckets(rows)
        self.assertEqual(time_buckets[0]["fault_count"], 1)
        self.assertEqual(time_buckets[0]["warning_count"], 2)
        self.assertEqual(sum(bucket["total_records"] for bucket in battery_buckets), 2)


if __name__ == "__main__":
    unittest.main()
