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
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"

    # File storage
    UPLOAD_DIR: str = "./uploads"

    @property
    def origins(self) -> List[str]:
        return [
            "http://localhost:5173",
            "https://robot-platform-frontend-92x0iza4u-kikiqiansuns-projects.vercel.app",
        ]

    @property
    def allowed_origin_regex(self) -> str:
        return r"https://robot-platform-frontend(?:-[a-z0-9-]+)?-kikiqiansuns-projects\.vercel\.app"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
