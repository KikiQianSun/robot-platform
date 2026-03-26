from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import files
from app.models import upload_record  # ensure upload_records table is registered

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Robot Platform API",
    description="Backend API for the Robot Management Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Robot Platform API", "version": "1.0.0", "env": settings.APP_ENV}


@app.get("/health")
def health():
    return {"status": "ok"}
