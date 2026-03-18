import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class SchedulerRun(Base):
    __tablename__ = "scheduler_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name = Column(String(100), nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="running", nullable=False)  # running | success | failure
    error_message = Column(Text, nullable=True)
    stats = Column(JSON, nullable=True)
    firm_count = Column(Integer, nullable=True)
