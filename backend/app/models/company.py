from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

from app.core.database import Base


class Company(Base):
    """Global company record — factual, mandate-agnostic, shared across tenants."""
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    website = Column(String(500), unique=True, index=True, nullable=True)
    one_liner = Column(String(500), nullable=True)
    ai_summary = Column(Text, nullable=True)
    founding_year = Column(Integer, nullable=True)
    funding_stage = Column(String(50), nullable=True)
    funding_amount_usd = Column(Float, nullable=True)
    top_investors = Column(JSON, default=list)
    sector = Column(String(100), nullable=True)
    team_size = Column(String(50), nullable=True)
    notable_traction = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    source_url = Column(String(1000), nullable=True)
    business_model = Column(Text, nullable=True)
    target_customer = Column(Text, nullable=True)
    traction_signals = Column(Text, nullable=True)
    enriched_one_liner = Column(Text, nullable=True)
    sources_visited = Column(JSON, nullable=True)
    website_content = Column(Text, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    scraped_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    scores = relationship("FirmCompanyScore", back_populates="company")
