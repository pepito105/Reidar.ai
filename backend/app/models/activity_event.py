import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    startup_name = Column(String(255), nullable=True)
    event_type = Column(String(50), nullable=False, index=True)
    # Event types:
    # pipeline_moved      — company moved to a pipeline stage
    # added_to_pipeline   — first time company enters any pipeline stage
    # conviction_set      — analyst set or changed conviction score
    # notes_saved         — analyst saved notes on a company
    # meeting_note_added  — meeting note added
    # research_complete   — deep research finished
    # signal_detected     — new signal found via Brave/Firecrawl
    title = Column(String(500), nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
