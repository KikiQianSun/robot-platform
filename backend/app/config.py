from typing import List

from pydantic_settings import BaseSettings


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
    PUBLIC_BACKEND_URL: str = "https://robot-platform-production.up.railway.app"

    # File storage
    UPLOAD_DIR: str = "./uploads"

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

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
