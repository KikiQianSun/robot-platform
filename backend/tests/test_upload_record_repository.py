import os
import sys
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import Base
from app.models import upload_record  # noqa: F401
from app.repositories.upload_record_repository import UploadRecordRepository


class UploadRecordRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test.db")
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

    def test_create_get_list_and_delete_record(self):
        created = self.repository.create(
            original_filename="logs.csv",
            file_url="http://testserver/api/v1/files/logs.csv",
            row_count=2,
        )

        fetched = self.repository.get_by_id(created.id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.original_filename, "logs.csv")

        history = self.repository.list_history()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].row_count, 2)

        self.repository.delete(created)
        self.assertIsNone(self.repository.get_by_id(created.id))
        self.assertEqual(self.repository.list_history(), [])


if __name__ == "__main__":
    unittest.main()
