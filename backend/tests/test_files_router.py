import os
import sys
import tempfile
import unittest
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import Base, get_db
from app.models import upload_record  # noqa: F401
from app.routers import files


VALID_CSV = """robot_id,timestamp,location_x,location_y,battery_level,device_a_status,device_b_status,speed,error_code
robot_001,2024-03-15T14:23:01Z,12.34,-5.67,85,ok,warning,1.5,
robot_002,2024-03-15T14:24:01Z,10.00,-4.50,80,warning,ok,1.2,400
"""

INVALID_CSV_MISSING_FIELDS = """robot_id,timestamp
robot_001,2024-03-15T14:23:01Z
"""


class FilesRouterTests(unittest.TestCase):
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
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        app = FastAPI()
        app.include_router(files.router, prefix="/api/v1")

        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.app = app

    def tearDown(self):
        self.app.dependency_overrides.clear()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def test_upload_csv_success_creates_file_and_returns_summary(self):
        response = self.client.post(
            "/api/v1/files/upload/csv",
            files={"file": ("logs.csv", VALID_CSV.encode("utf-8"), "text/csv")},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["original_filename"], "logs.csv")
        self.assertEqual(data["row_count"], 2)
        self.assertEqual(len(data["preview"]), 2)
        self.assertTrue(data["url"].startswith("http://testserver/api/v1/files/"))
        self.assertTrue(os.path.exists(os.path.join(self.upload_dir, data["filename"])))

    def test_upload_csv_validation_error_returns_422(self):
        response = self.client.post(
            "/api/v1/files/upload/csv",
            files={"file": ("invalid.csv", INVALID_CSV_MISSING_FIELDS.encode("utf-8"), "text/csv")},
        )

        self.assertEqual(response.status_code, 422)
        detail = response.json()["detail"]
        self.assertEqual(detail["message"], "Missing required fields")
        self.assertIn("location_x", detail["missing_fields"])

    def test_history_returns_uploaded_records(self):
        self.client.post(
            "/api/v1/files/upload/csv",
            files={"file": ("logs.csv", VALID_CSV.encode("utf-8"), "text/csv")},
        )

        response = self.client.get("/api/v1/files/history")

        self.assertEqual(response.status_code, 200)
        records = response.json()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["original_filename"], "logs.csv")
        self.assertEqual(records[0]["row_count"], 2)
        self.assertTrue(records[0]["file_url"].startswith("http://testserver/api/v1/files/"))

    def test_delete_file_removes_physical_file_and_history_record(self):
        upload_response = self.client.post(
            "/api/v1/files/upload/csv",
            files={"file": ("logs.csv", VALID_CSV.encode("utf-8"), "text/csv")},
        )
        upload_data = upload_response.json()

        history_response = self.client.get("/api/v1/files/history")
        record_id = history_response.json()[0]["id"]
        file_path = os.path.join(self.upload_dir, upload_data["filename"])
        self.assertTrue(os.path.exists(file_path))

        delete_response = self.client.delete(f"/api/v1/files/history/{record_id}")

        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.json()["message"], "File deleted")
        self.assertFalse(os.path.exists(file_path))
        final_history = self.client.get("/api/v1/files/history")
        self.assertEqual(final_history.status_code, 200)
        self.assertEqual(final_history.json(), [])


if __name__ == "__main__":
    unittest.main()
