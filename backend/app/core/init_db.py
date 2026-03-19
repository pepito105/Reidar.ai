import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
from app.models import Company, FirmCompanyScore, FirmProfile

async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
