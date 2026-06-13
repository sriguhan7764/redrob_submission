from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.shortlist import Shortlist
from app.models.job import Job
from app.models.user import User
from app.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(Candidate).count()
    scores = [r[0] for r in db.query(Candidate.score).all()]
    avg_score = sum(scores) / len(scores) if scores else 0
    open_count = db.query(Candidate).filter(Candidate.open_to_work == 1).count()
    shortlisted = db.query(Shortlist).count()
    active_jobs = db.query(Job).filter(Job.status == "active").count()
    hired = db.query(Shortlist).filter(Shortlist.stage == "hired").count()
    in_interview = db.query(Shortlist).filter(Shortlist.stage == "interview").count()

    # Arrays for charts
    score_distribution = [
        {"bucket": "90+", "count": sum(1 for s in scores if s >= 0.90)},
        {"bucket": "80-90", "count": sum(1 for s in scores if 0.80 <= s < 0.90)},
        {"bucket": "70-80", "count": sum(1 for s in scores if 0.70 <= s < 0.80)},
        {"bucket": "<70", "count": sum(1 for s in scores if s < 0.70)},
    ]

    # Top companies from entire pool
    all_companies = db.query(Candidate.current_company).all()
    company_counts: dict = {}
    for (co,) in all_companies:
        if co:
            company_counts[co] = company_counts.get(co, 0) + 1
    top_companies = [
        {"company": co, "count": cnt}
        for co, cnt in sorted(company_counts.items(), key=lambda x: -x[1])[:10]
    ]

    avg_years = db.query(func.avg(Candidate.years_of_experience)).scalar() or 0

    pipeline_stages = []
    for stage in ["screening", "shortlisted", "interview", "offer", "hired", "rejected"]:
        cnt = db.query(Shortlist).filter(Shortlist.stage == stage).count()
        pipeline_stages.append({"stage": stage, "count": cnt})

    return {
        "total_candidates": total,
        "avg_score": round(avg_score, 3),   # 0-1 scale for frontend display
        "open_to_work": open_count,
        "total_shortlisted": shortlisted,
        "active_jobs": active_jobs,
        "hired": hired,
        "in_interview": in_interview,
        "avg_years_experience": round(float(avg_years), 1),
        "score_distribution": score_distribution,
        "top_companies": top_companies,
        "pipeline_stages": pipeline_stages,
    }


@router.get("/skills-frequency")
def skills_frequency(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import json as _json
    rows = db.execute(__import__('sqlalchemy').text("SELECT skills_json FROM candidates")).fetchall()
    freq: dict = {}
    for (skills_blob,) in rows:
        if not skills_blob:
            continue
        if isinstance(skills_blob, str):
            try:
                skills_blob = _json.loads(skills_blob)
            except Exception:
                continue
        for skill in (skills_blob if isinstance(skills_blob, list) else []):
            if not isinstance(skill, dict):
                continue
            name = (skill.get("name") or "").strip()
            if name:
                freq[name] = freq.get(name, 0) + 1
    top = sorted(freq.items(), key=lambda x: -x[1])[:15]
    return [{"skill": k, "count": v} for k, v in top]


@router.get("/work-mode")
def work_mode_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Candidate.preferred_work_mode, func.count(Candidate.id)).group_by(Candidate.preferred_work_mode).all()
    return [{"mode": r[0] or "Not specified", "count": r[1]} for r in rows]


@router.get("/conversion")
def pipeline_conversion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stages = ["screening", "shortlisted", "interview", "offer", "hired"]
    counts = []
    for stage in stages:
        cnt = db.query(Shortlist).filter(Shortlist.stage == stage).count()
        counts.append({"stage": stage, "count": cnt})
    # Compute conversion rates
    for i in range(1, len(counts)):
        prev = counts[i - 1]["count"]
        curr = counts[i]["count"]
        counts[i]["rate"] = round(curr / prev * 100, 1) if prev else 0
    counts[0]["rate"] = 100.0
    return counts


@router.get("/score-trend")
def score_trend(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Group by buckets of 10 ranks for a trend view
    candidates = db.query(Candidate.rank, Candidate.score).order_by(Candidate.rank).all()
    # Bucket into groups of 10
    buckets: dict = {}
    for rank, score in candidates:
        bucket = f"{((rank - 1) // 10) * 10 + 1}-{((rank - 1) // 10 + 1) * 10}"
        if bucket not in buckets:
            buckets[bucket] = []
        buckets[bucket].append(score)
    return [
        {"date": label, "avg_score": round(sum(vals) / len(vals), 3)}
        for label, vals in buckets.items()
    ]
