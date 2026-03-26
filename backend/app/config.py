from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"

    # Database
    DATABASE_URL: str = "sqlite:///./robot_platform.db"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "robot-files"

    # Public backend base URL (used to build absolute file URLs)
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # File storage
    UPLOAD_DIR: str = "./uploads"

    @property
    def origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
