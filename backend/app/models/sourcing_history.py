import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SourcingHistory(Base):
    __tablename__ = "sourcing_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    query = Column(Text, nullable=False)
    ran_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    results_count = Column(Integer, default=0)       # Brave results returned
    new_companies_added = Column(Integer, default=0)
    urls_found = Column(Integer, default=0)          # URLs passing is_company_url filter
    companies_extracted = Column(Integer, default=0) # Companies Claude marked relevant
    high_fit_count = Column(Integer, default=0)      # Saved companies with fit_score >= 4
    quality_score = Column(Float, default=0.0)       # high_fit_count / max(results_count, 1)
