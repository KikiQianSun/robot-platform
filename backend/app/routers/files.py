from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.repositories.upload_record_repository import UploadRecordRepository
from app.schemas.upload_record import UploadRecordInsightsResponse, UploadRecordOut, UploadRecordRowsResponse
from app.services.file_storage_service import extract_filename_from_url
from app.services.upload_record_service import delete_upload_record, get_upload_insights, get_upload_rows, upload_csv_file

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    repository = UploadRecordRepository(db)
    return await upload_csv_file(file, repository)


@router.get("/history", response_model=list[UploadRecordOut])
def get_upload_history(db: Session = Depends(get_db)):
    repository = UploadRecordRepository(db)
    return repository.list_history()


@router.get("/history/{record_id}/rows", response_model=UploadRecordRowsResponse)
async def get_upload_record_rows(record_id: int, robot_id: str | None = Query(default=None), start_time: str | None = Query(default=None), end_time: str | None = Query(default=None), device_status: str | None = Query(default=None), device_b_status: str | None = Query(default=None), error_code: str | None = Query(default=None), error_only: bool = Query(default=False), page: int = Query(default=1, ge=1), page_size: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    repository = UploadRecordRepository(db)
    record = repository.get_by_id(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")
    return await get_upload_rows(record, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only, page, page_size)


@router.get("/history/{record_id}/insights", response_model=UploadRecordInsightsResponse)
async def get_upload_record_insights(record_id: int, scope: str = Query(default="filtered"), time_window: str = Query(default="1y"), robot_id: str | None = Query(default=None), start_time: str | None = Query(default=None), end_time: str | None = Query(default=None), device_status: str | None = Query(default=None), device_b_status: str | None = Query(default=None), error_code: str | None = Query(default=None), error_only: bool = Query(default=False), db: Session = Depends(get_db)):
    repository = UploadRecordRepository(db)
    record = repository.get_by_id(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")
    return await get_upload_insights(record, scope, time_window, robot_id, start_time, end_time, device_status, device_b_status, error_code, error_only)


@router.delete("/history/{record_id}")
async def remove_upload_record(record_id: int, db: Session = Depends(get_db)):
    repository = UploadRecordRepository(db)
    record = repository.get_by_id(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")
    return await delete_upload_record(record, repository)


@router.get("/{filename}")
async def serve_file(filename: str):
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Use Supabase URL directly in production")
    path = settings.UPLOAD_DIR.rstrip("/\\") + "/" + filename
    if not settings.UPLOAD_DIR or not filename:
        raise HTTPException(status_code=404, detail="File not found")
    if not __import__("os").path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

@router.get("/health")
async def health_check():
    return {"status": "ok"}