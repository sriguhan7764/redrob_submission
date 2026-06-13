import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Shortlist(Base):
    __tablename__ = "shortlists"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(String(20), ForeignKey("candidates.id"), nullable=False)
    added_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    stage = Column(
        SAEnum("screening", "shortlisted", "interview", "offer", "hired", "rejected", name="pipeline_stage"),
        default="screening",
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="shortlists")
    candidate = relationship("Candidate", back_populates="shortlists")
    added_by = relationship("User", foreign_keys=[added_by_id], back_populates="shortlists")
    notes = relationship("ShortlistNote", back_populates="shortlist", cascade="all, delete-orphan")


class ShortlistNote(Base):
    __tablename__ = "shortlist_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shortlist_id = Column(String(36), ForeignKey("shortlists.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    shortlist = relationship("Shortlist", back_populates="notes")
