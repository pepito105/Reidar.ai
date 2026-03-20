import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, index=True)
    firm_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
