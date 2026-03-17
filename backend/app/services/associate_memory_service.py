import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.associate_memory import AssociateMemory
from app.services.classifier import generate_embedding

logger = logging.getLogger(__name__)


async def write_memory(
    db: AsyncSession,
    user_id: str,
    memory_type: str,
    content: str,
    company_id: int = None,
    company_name: str = None,
) -> AssociateMemory:
    try:
        embedding = await generate_embedding(content)
        memory = AssociateMemory(
            user_id=user_id,
            memory_type=memory_type,
            content=content,
            company_id=company_id,
            company_name=company_name,
            embedding=embedding,
        )
        db.add(memory)
        await db.commit()
        await db.refresh(memory)
        logger.info(f"Memory written for {user_id}: {content[:80]}")
        return memory
    except Exception as e:
        logger.error(f"Failed to write memory: {e}")
        return None


async def retrieve_memories(
    db: AsyncSession,
    user_id: str,
    query: str,
    limit: int = 5,
) -> list:
    try:
        query_embedding = await generate_embedding(query)
        if not query_embedding:
            result = await db.execute(
                select(AssociateMemory)
                .where(AssociateMemory.user_id == user_id)
                .order_by(AssociateMemory.created_at.desc())
                .limit(limit)
            )
            return result.scalars().all()

        vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        result = await db.execute(
            text(f"""
                SELECT id, user_id, memory_type, content, company_id, company_name, created_at
                FROM associate_memory
                WHERE user_id = :user_id
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> '{vec_str}'::vector
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": limit}
        )
        rows = result.fetchall()
        return [
            AssociateMemory(
                id=r.id,
                user_id=r.user_id,
                memory_type=r.memory_type,
                content=r.content,
                company_id=r.company_id,
                company_name=r.company_name,
                created_at=r.created_at,
            )
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Failed to retrieve memories: {e}")
        return []


async def format_memories_for_prompt(memories: list) -> str:
    if not memories:
        return ""
    lines = ["RELEVANT MEMORY FROM PAST SESSIONS:"]
    for m in memories:
        date_str = m.created_at.strftime("%b %d") if m.created_at else "recently"
        lines.append(f"- [{m.memory_type.upper()}] {date_str}: {m.content}")
    return "\n".join(lines)
