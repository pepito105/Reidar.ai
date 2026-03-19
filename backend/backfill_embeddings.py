"""
One-time script to generate embeddings for all existing startups.
Run from backend directory: python backfill_embeddings.py
"""
import asyncio
import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.services.classifier import generate_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def backfill():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Startup).where(
                Startup.embedding == None,
                Startup.one_liner != None
            )
        )
        startups = result.scalars().all()
        logger.info(f"Found {len(startups)} startups without embeddings")

        success, failed = 0, 0
        for i, startup in enumerate(startups):
            try:
                embed_input = f"{startup.name}. {startup.one_liner or ''}. {startup.sector or ''}. {', '.join(startup.thesis_tags or [])}"
                embedding = await generate_embedding(embed_input)
                if embedding:
                    startup.embedding = embedding
                    success += 1
                else:
                    failed += 1
            except Exception as e:
                logger.warning(f"Failed for {startup.name}: {e}")
                failed += 1

            if (i + 1) % 20 == 0:
                await db.commit()
                logger.info(f"Progress: {i+1}/{len(startups)} — {success} ok, {failed} failed")

        await db.commit()
        logger.info(f"Done. {success} embeddings generated, {failed} failed.")

if __name__ == "__main__":
    asyncio.run(backfill())
