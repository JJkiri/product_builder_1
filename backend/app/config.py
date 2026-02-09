from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # App settings
    app_name: str = "Korean Stock Screener"
    debug: bool = False

    # CORS settings
    cors_origins: list[str] = ["*"]

    # Firebase/Firestore settings
    google_cloud_project: str = ""
    firestore_database: str = "(default)"

    # Data collection settings
    collection_interval_minutes: int = 5
    market_open_hour: int = 9
    market_close_hour: int = 16

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
