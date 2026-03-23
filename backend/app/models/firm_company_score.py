from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime, JSON, Boolean,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import Base


class FirmCompanyScore(Base):
    """Per-tenant mandate scoring and relationship tracking for a company."""
    __tablename__ = "firm_company_scores"

    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_firm_company_score"),
        Index("ix_fcs_user_id", "user_id"),
        Index("ix_fcs_company_id", "company_id"),
        Index("ix_fcs_pipeline_status", "pipeline_status"),
        Index("ix_fcs_fit_score", "fit_score"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(255), nullable=False)

    # Mandate scoring
    fit_score = Column(Integer, nullable=True)
    fit_reasoning = Column(Text, nullable=True)
    thesis_tags = Column(JSON, default=list)
    mandate_category = Column(String(100), nullable=True)

    # Pipeline
    pipeline_status = Column(String(50), default="new", nullable=False)
    notes = Column(Text, nullable=True)
    founder_contacts = Column(JSON, default=list)

    # Analysis
    comparable_companies = Column(JSON, default=list)
    recommended_next_step = Column(Text, nullable=True)
    red_flags = Column(Text, nullable=True)
    conviction_score = Column(Integer, nullable=True)
    next_action = Column(String(500), nullable=True)
    next_action_due = Column(DateTime, nullable=True)
    key_risks = Column(Text, nullable=True)
    bull_case = Column(Text, nullable=True)

    # Diligence
    meeting_notes = Column(JSON, default=list)
    activity_log = Column(JSON, default=list)
    memo = Column(Text, nullable=True)
    memo_files = Column(JSON, default=list)
    memo_generated_at = Column(DateTime, nullable=True)

    # Signal tracking
    last_refreshed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    has_unseen_signals: Mapped[bool] = mapped_column(Boolean, default=False)

    # Sourcing provenance (per-tenant — how this firm found the company)
    source = Column(String(200), nullable=True)
    source_url = Column(String(500), nullable=True)

    # Email inbound — raw provenance fields
    email_subject = Column(String(500), nullable=True)
    email_body_raw = Column(Text, nullable=True)          # truncated to 3000 chars
    introducer_name = Column(String(255), nullable=True)  # warm intro: the connector
    introducer_email = Column(String(255), nullable=True)

    # Portfolio tracking
    is_portfolio = Column(Boolean, default=False, nullable=True)
    portfolio_status = Column(String(50), nullable=True)  # active, acquired, exited, dead
    investment_date = Column(DateTime, nullable=True)
    check_size_usd = Column(Float, nullable=True)
    co_investors = Column(JSON, default=list)

    # Research
    research_status = Column(Text, nullable=True)
    research_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="scores")
