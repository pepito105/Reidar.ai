import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SourcingHistory(Base):
    __tablename__ = "sourcing_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    query = Column(Text, nullable=False)
    ran_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    results_count = Column(Integer, default=0)
    new_companies_added = Column(Integer, default=0)
