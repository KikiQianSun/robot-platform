from app.models.upload_record import UploadRecord
from app.repositories.upload_record_repository import UploadRecordRepository
from app.services.csv_processing_service import upload_csv_file
from app.services.file_storage_service import delete_stored_file, extract_filename_from_url
from app.services.upload_insights_service import get_upload_insights, get_upload_rows


async def delete_upload_record(record: UploadRecord, repository: UploadRecordRepository) -> dict:
    await delete_stored_file(extract_filename_from_url(record.file_url))
    repository.delete(record)
    return {"message": "File deleted"}


__all__ = [
    "upload_csv_file",
    "get_upload_rows",
    "get_upload_insights",
    "delete_upload_record",
]
