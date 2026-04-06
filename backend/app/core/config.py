from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    clerk_secret_key: str = ""
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    SENDGRID_API_KEY: Optional[str] = None
    NOTIFICATION_EMAIL: str = "remi@balassanian.com"
    FROM_EMAIL: str = "remi@balassanian.com"
    APP_URL: str = "http://localhost:5173"
    FIRECRAWL_API_KEY: Optional[str] = None
    BRAVE_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "https://reidar.ai"
    # When True, APScheduler registers no jobs (no nightly sourcing, signal refresh, weekly digest, Gmail polling).
    DISABLE_SCHEDULED_JOBS: bool = True

    class Config:
        env_file = ".env"

settings = Settings()

