import io
import os
import uuid

import aiofiles
from fastapi import HTTPException, UploadFile

from app.config import settings

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def build_local_file_url(filename: str) -> str:
    base = settings.PUBLIC_BACKEND_URL.rstrip("/")
    return f"{base}/api/v1/files/{filename}"


def extract_filename_from_url(file_url: str) -> str:
    return file_url.rstrip("/").split("/")[-1]


async def upload_to_local(file: UploadFile, content_bytes: bytes | None = None) -> dict:
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, filename)
    payload = content_bytes if content_bytes is not None else await file.read()
    async with aiofiles.open(dest, "wb") as f:
        await f.write(payload)
    return {"filename": filename, "url": build_local_file_url(filename)}


async def upload_to_supabase(file: UploadFile, content_bytes: bytes | None = None) -> dict:
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        ext = os.path.splitext(file.filename or "")[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        content = content_bytes if content_bytes is not None else await file.read()
        client.storage.from_(settings.SUPABASE_BUCKET).upload(filename, content)
        url = client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(filename)
        return {"filename": filename, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def store_upload(file: UploadFile, content_bytes: bytes | None = None) -> dict:
    if settings.is_production:
        return await upload_to_supabase(file, content_bytes)
    return await upload_to_local(file, content_bytes)


def delete_local_file(filename: str) -> None:
    path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(path):
        os.remove(path)


async def delete_supabase_file(filename: str) -> None:
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        client.storage.from_(settings.SUPABASE_BUCKET).remove([filename])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def delete_stored_file(filename: str) -> None:
    if settings.is_production:
        await delete_supabase_file(filename)
    else:
        delete_local_file(filename)
