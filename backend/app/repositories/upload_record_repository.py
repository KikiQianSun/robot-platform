from sqlalchemy.orm import Session

from app.models.upload_record import UploadRecord


class UploadRecordRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, original_filename: str, file_url: str, row_count: int) -> UploadRecord:
        record = UploadRecord(
            original_filename=original_filename,
            file_url=file_url,
            row_count=row_count,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_history(self) -> list[UploadRecord]:
        return self.db.query(UploadRecord).order_by(UploadRecord.uploaded_at.desc()).all()

    def get_by_id(self, record_id: int) -> UploadRecord | None:
        return self.db.query(UploadRecord).filter(UploadRecord.id == record_id).first()

    def delete(self, record: UploadRecord) -> None:
        self.db.delete(record)
        self.db.commit()
