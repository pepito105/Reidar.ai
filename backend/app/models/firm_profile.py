from sqlalchemy import Column, String, Integer, Text, JSON, Boolean
from app.core.database import Base

class FirmProfile(Base):
    __tablename__ = "firm_profiles"

    id = Column(Integer, primary_key=True, index=True)
    firm_name = Column(String(255), nullable=False)
    investment_stages = Column(JSON, default=list)
    geography_focus = Column(JSON, default=list)
    check_size_min = Column(Integer)
    check_size_max = Column(Integer)
    investment_thesis = Column(Text)
    excluded_sectors = Column(JSON, default=list)
    fit_threshold = Column(Integer, default=3)
    user_id = Column(String(255), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    notify_top_match = Column(Boolean, default=True)
    notify_diligence_signal = Column(Boolean, default=True)
    notify_weekly_summary = Column(Boolean, default=True)
    notify_min_fit_score = Column(Integer, default=4)
    notification_emails = Column(Text, default="remi@balassanian.com")
    mandate_buckets = Column(JSON, default=list)
