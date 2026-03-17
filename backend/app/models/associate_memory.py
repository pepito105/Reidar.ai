from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class AssociateMemory(Base):
    __tablename__ = "associate_memory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    memory_type = Column(String(50), nullable=False)  # decision, preference, fact, pattern
    content = Column(Text, nullable=False)
    company_id = Column(Integer, nullable=True)
    company_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    embedding = Column(Vector(1536), nullable=True)
