from typing import List

from pydantic_settings import BaseSettings


PRODUCTION_DATABASE_URL = "postgresql://postgres:7afWs_2&h/L#-#e@db.ocxmoqkptenmzazumpcc.supabase.co:5432/postgres?sslmode=require"
SUPABASE_PROJECT_URL = "https://ocxmoqkptenmzazumpcc.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeG1vcWtwdGVubXphenVtcGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUzMjY3OCwiZXhwIjoyMDkwMTA4Njc4fQ.Sz7cYQzHV2ITf7yB3lTqtifWnQwc7GA2_Kc33Ri0KuY"
SUPABASE_BUCKET_NAME = "robot-files"


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"

    # Database
    DATABASE_URL: str = "sqlite:///./robot_platform.db"

    # Supabase
    SUPABASE_URL: str = SUPABASE_PROJECT_URL
    SUPABASE_KEY: str = SUPABASE_SERVICE_ROLE_KEY
    SUPABASE_BUCKET: str = SUPABASE_BUCKET_NAME

    # Public backend base URL (used to build absolute file URLs)
    PUBLIC_BACKEND_URL: str = "https://robot-platform-production.up.railway.app"

    # File storage
    UPLOAD_DIR: str = "./uploads"

    @property
    def database_url(self) -> str:
        return PRODUCTION_DATABASE_URL if self.is_production else self.DATABASE_URL

    @property
    def origins(self) -> List[str]:
        return [
            "http://localhost:5173",
            "https://robot-platform-frontend.vercel.app",
        ]

    @property
    def allowed_origin_regex(self) -> str:
        return r"https://robot-platform-frontend(?:-[a-z0-9-]+)?\.vercel\.app"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
