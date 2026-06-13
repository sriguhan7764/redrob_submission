import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.job import Job
from app.models.shortlist import Shortlist
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.deps import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    result = []
    for job in jobs:
        out = JobOut.model_validate(job)
        out.shortlist_count = db.query(Shortlist).filter(Shortlist.job_id == job.id).count()
        result.append(out)
    return result


@router.post("", response_model=JobOut)
def create_job(body: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req_id = f"REQ-{str(uuid.uuid4())[:8].upper()}"
    job = Job(**body.model_dump(), id=str(uuid.uuid4()), req_id=req_id, created_by_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    out = JobOut.model_validate(job)
    out.shortlist_count = db.query(Shortlist).filter(Shortlist.job_id == job.id).count()
    return out


@router.patch("/{job_id}", response_model=JobOut)
def update_job(job_id: str, body: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@router.get("/{job_id}/pipeline")
def get_pipeline(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stages = ["screening", "shortlisted", "interview", "offer", "hired", "rejected"]
    result = {s: [] for s in stages}

    shortlists = db.query(Shortlist).filter(Shortlist.job_id == job_id).all()
    for sl in shortlists:
        c = db.query(Candidate).filter(Candidate.id == sl.candidate_id).first()
        if c:
            result[sl.stage].append({
                "shortlist_id": sl.id,
                "candidate_id": c.id,
                "name": c.name,
                "current_title": c.current_title,
                "current_company": c.current_company,
                "score": c.score,
                "final_score": c.score,
                "rank": c.rank,
                "open_to_work": c.open_to_work,
                "notice_period_days": c.notice_period_days,
                "preferred_work_mode": c.preferred_work_mode,
                "stage": sl.stage,
                "reasoning": c.reasoning,
                "added_at": sl.created_at.isoformat(),
            })

    return {"job_id": job_id, "pipeline": result}


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role not in ("admin", "recruiter"):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(job)
    db.commit()
    return {"message": "Deleted"}


class AnalyzeJdBody(PydanticBaseModel):
    description: str
    title: str = ""


@router.post("/{job_id}/analyze-jd")
def analyze_jd(job_id: str, body: AnalyzeJdBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.gemini import _call_gemini

    prompt = f"""You are an expert technical recruiter and job description analyst.

Analyze this job description and extract structured requirements that can be used to rank candidates effectively.

Job Title: {body.title}
Job Description:
{body.description}

Return ONLY valid JSON (no markdown fences):
{{
  "required_skills": ["skill1", "skill2", "skill3"],
  "nice_to_have_skills": ["skill1", "skill2"],
  "min_experience_years": 3,
  "max_experience_years": 8,
  "seniority_level": "Senior|Mid|Junior|Lead",
  "key_responsibilities": ["responsibility1", "responsibility2"],
  "candidate_profile": "One paragraph describing the ideal candidate",
  "red_flags": ["red flag to watch for in candidates"],
  "interview_focus_areas": ["area1", "area2", "area3"],
  "market_notes": "Brief note on talent availability for this role"
}}"""

    response = _call_gemini(prompt, temperature=0.3)
    if not response:
        return {"error": "AI analysis unavailable", "ai_powered": False}

    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        result = json.loads(text)
        result["ai_powered"] = True
        result["job_id"] = job_id
        return result
    except Exception:
        return {"error": "Failed to parse AI response", "ai_powered": False, "raw": text[:500]}
