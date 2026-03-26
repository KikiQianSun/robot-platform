from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class UploadRecord(Base):
    __tablename__ = "upload_records"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
