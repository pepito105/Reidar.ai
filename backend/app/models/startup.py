from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base

class Startup(Base):
    __tablename__ = "startups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, index=True)
    one_liner = Column(String(500))
    ai_summary = Column(Text)
    website = Column(String(500))
    founding_year = Column(Integer)
    funding_stage = Column(String(50))
    funding_amount_usd = Column(Float)
    top_investors = Column(JSON, default=list)
    ai_score = Column(Integer)
    fit_score = Column(Integer)
    fit_reasoning = Column(Text)
    thesis_tags = Column(JSON, default=list)
    sector = Column(String(100))
    mandate_category = Column(String(100), nullable=True)
    business_model = Column(String(100))
    target_customer = Column(String(200))
    team_size = Column(String(50))
    notable_traction = Column(Text)
    source = Column(String(100))
    source_url = Column(String(1000))
    pipeline_status = Column(String(50), default="new")
    notes = Column(Text)
    founder_contacts = Column(JSON, default=list)
    comparable_companies = Column(JSON, default=list)
    recommended_next_step = Column(Text)
    conviction_score = Column(Integer, nullable=True)  # analyst's own 1-5 rating
    next_action = Column(String(500), nullable=True)   # e.g. "Request intro via Bessemer"
    next_action_due = Column(DateTime, nullable=True)  # due date for next action
    key_risks = Column(Text, nullable=True)            # bear case
    bull_case = Column(Text, nullable=True)            # bull case
    meeting_notes = Column(JSON, default=list)         # list of {note, author, created_at}
    activity_log = Column(JSON, default=list)          # list of {action, detail, created_at}
    memo = Column(Text, nullable=True)                 # generated investment memo
    memo_files = Column(JSON, default=list)            # [{name, path, size, uploaded_at}]
    memo_generated_at = Column(DateTime, nullable=True)
    last_refreshed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    has_unseen_signals: Mapped[bool] = mapped_column(Boolean, default=False)
    is_portfolio = Column(Boolean, default=False, nullable=True)
    portfolio_status = Column(String(50), nullable=True)  # active, acquired, exited, dead
    investment_date = Column(DateTime, nullable=True)
    check_size_usd = Column(Float, nullable=True)
    co_investors = Column(JSON, default=list)
    user_id = Column(String(255), nullable=True, index=True)
    scraped_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    research_status = Column(Text, nullable=True)
    research_completed_at = Column(DateTime(timezone=True), nullable=True)
    website_content = Column(Text, nullable=True)
    business_model = Column(Text, nullable=True)
    target_customer = Column(Text, nullable=True)
    traction_signals = Column(Text, nullable=True)
    red_flags = Column(Text, nullable=True)
    enriched_one_liner = Column(Text, nullable=True)
