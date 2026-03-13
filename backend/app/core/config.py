from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    clerk_secret_key: str = ""
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    ENVIRONMENT: str = "development"
    SENDGRID_API_KEY: Optional[str] = None
    NOTIFICATION_EMAIL: str = "remi@balassanian.com"
    FROM_EMAIL: str = "remi@balassanian.com"
    FIRECRAWL_API_KEY: Optional[str] = None
    BRAVE_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()

