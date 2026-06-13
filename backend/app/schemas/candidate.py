from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class CandidateListItem(BaseModel):
    id: str
    rank: int
    score: float
    reasoning: Optional[str]
    name: Optional[str]
    current_title: Optional[str]
    current_company: Optional[str]
    years_of_experience: Optional[float]
    location: Optional[str]
    current_industry: Optional[str]
    open_to_work: int
    notice_period_days: Optional[int]
    recruiter_response_rate: Optional[float]
    github_activity_score: Optional[float]
    preferred_work_mode: Optional[str]
    willing_to_relocate: int
    expected_salary_min: Optional[float]
    expected_salary_max: Optional[float]
    behavioral_multiplier: Optional[float]
    honeypot_penalty: Optional[float]
    signals_json: Optional[Dict[str, Any]]
    skills_json: Optional[List[Dict[str, Any]]]
    is_shortlisted: Optional[bool] = False

    class Config:
        from_attributes = True


class CandidateDetail(CandidateListItem):
    headline: Optional[str]
    summary: Optional[str]
    profile_json: Optional[Dict[str, Any]]
    education_json: Optional[List[Dict[str, Any]]]
    career_summary_json: Optional[List[Dict[str, Any]]]
    redrob_signals_json: Optional[Dict[str, Any]]


class CandidateListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    results: List[CandidateListItem]
