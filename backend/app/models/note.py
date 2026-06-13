from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from app.core.database import Base


class CandidateNote(Base):
    __tablename__ = "candidate_notes"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="general")  # general | interview | feedback | offer
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id], lazy="joined")
