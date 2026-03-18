import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False)  # new_top_match | new_strong_fit | research_complete | company_signal | stale_deal
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    startup_id = Column(Integer, nullable=True, index=True)
    startup_name = Column(String, nullable=True)
    fit_score = Column(Integer, nullable=True)
    is_seen = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)
