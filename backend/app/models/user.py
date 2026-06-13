import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SAEnum("admin", "recruiter", "hiring_manager", name="user_role"), nullable=False, default="recruiter")
    department = Column(String(100), nullable=True)
    avatar_initials = Column(String(4), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    shortlists = relationship("Shortlist", foreign_keys="Shortlist.added_by_id", back_populates="added_by")
    jobs_created = relationship("Job", back_populates="created_by")
    activities = relationship("ActivityLog", back_populates="user")
