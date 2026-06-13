import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    req_id = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    department = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    work_mode = Column(String(50), default="hybrid")
    experience_min = Column(Integer, default=0)
    experience_max = Column(Integer, default=10)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    status = Column(SAEnum("active", "closed", "draft", name="job_status"), default="active")
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("User", back_populates="jobs_created")
    shortlists = relationship("Shortlist", back_populates="job", cascade="all, delete-orphan")
