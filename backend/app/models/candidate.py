from sqlalchemy import Column, String, Float, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(20), primary_key=True)          # CAND_XXXXXXX
    rank = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    reasoning = Column(String(500), nullable=True)

    # Profile fields (denormalized for fast queries)
    name = Column(String(255), nullable=True)
    current_title = Column(String(255), nullable=True)
    current_company = Column(String(255), nullable=True)
    years_of_experience = Column(Float, nullable=True)
    location = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    current_industry = Column(String(255), nullable=True)
    headline = Column(String(500), nullable=True)
    summary = Column(String(2000), nullable=True)

    # Behavioral signals (denormalized for filtering)
    open_to_work = Column(Integer, default=0)          # 0/1 as integer
    last_active_date = Column(String(20), nullable=True)
    notice_period_days = Column(Integer, nullable=True)
    recruiter_response_rate = Column(Float, nullable=True)
    github_activity_score = Column(Float, nullable=True)
    preferred_work_mode = Column(String(50), nullable=True)
    willing_to_relocate = Column(Integer, default=0)
    expected_salary_min = Column(Float, nullable=True)
    expected_salary_max = Column(Float, nullable=True)

    # Scoring details
    behavioral_multiplier = Column(Float, nullable=True)
    honeypot_penalty = Column(Float, nullable=True)
    is_favorite = Column(Integer, default=0)

    # JSON blobs for detail view
    profile_json = Column(JSON, nullable=True)
    skills_json = Column(JSON, nullable=True)
    education_json = Column(JSON, nullable=True)
    career_summary_json = Column(JSON, nullable=True)
    signals_json = Column(JSON, nullable=True)
    redrob_signals_json = Column(JSON, nullable=True)

    shortlists = relationship("Shortlist", back_populates="candidate")
