from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # App settings
    app_name: str = "Korean Stock Screener"
    debug: bool = False

    # CORS settings
    cors_origins: list[str] = [
        "*",
        "https://korean-stock-screener.web.app",
        "https://korean-stock-screener.firebaseapp.com",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
