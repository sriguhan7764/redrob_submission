"""
Seed the database with:
  - 3 demo users
  - 3 demo jobs
  - All ranked candidates from ranked_results.json
  - Realistic pipeline distribution across all stages
"""
from __future__ import annotations
import json
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.shortlist import Shortlist

DEMO_USERS = [
    {
        "email": "admin@redrob.ai",
        "password": "Admin@123",
        "full_name": "Arjun Mehta",
        "role": "admin",
        "department": "Engineering",
        "avatar_initials": "AM",
    },
    {
        "email": "recruiter@redrob.ai",
        "password": "Recruiter@123",
        "full_name": "Priya Sharma",
        "role": "recruiter",
        "department": "Talent Acquisition",
        "avatar_initials": "PS",
    },
    {
        "email": "manager@redrob.ai",
        "password": "Manager@123",
        "full_name": "Rohan Kapoor",
        "role": "hiring_manager",
        "department": "AI Engineering",
        "avatar_initials": "RK",
    },
]

DEMO_JOBS = [
    {
        "id": "job-redrob-001",
        "req_id": "REQ-REDROB-2024",
        "title": "Senior AI Engineer — Founding Team",
        "description": (
            "Own the intelligence layer of Redrob's product — ranking, retrieval, and matching systems. "
            "5–9 years experience in applied ML, embeddings-based retrieval, vector databases, and ranking evaluation frameworks."
        ),
        "department": "AI Engineering",
        "location": "Pune / Noida (Hybrid)",
        "work_mode": "hybrid",
        "experience_min": 5,
        "experience_max": 9,
        "status": "active",
    },
    {
        "id": "job-redrob-002",
        "req_id": "REQ-MLPLAT-2024",
        "title": "ML Platform Engineer",
        "description": (
            "Build and scale the ML platform that powers Redrob's AI pipelines. "
            "Deep expertise in distributed training, feature stores, model serving (Triton, vLLM), MLflow, and Kubernetes-based ML infrastructure."
        ),
        "department": "Platform Engineering",
        "location": "Bangalore (Hybrid)",
        "work_mode": "hybrid",
        "experience_min": 4,
        "experience_max": 8,
        "status": "active",
    },
    {
        "id": "job-redrob-003",
        "req_id": "REQ-NLPENG-2024",
        "title": "NLP / LLM Engineer",
        "description": (
            "Research and deploy NLP systems for candidate understanding and job matching. "
            "Experience with transformer fine-tuning, RLHF, RAG pipelines, and LLM evaluation. Python, HuggingFace, LangChain."
        ),
        "department": "AI Research",
        "location": "Remote",
        "work_mode": "remote",
        "experience_min": 3,
        "experience_max": 7,
        "status": "active",
    },
]

# Distribution of pipeline stages for job-redrob-001 (by rank)
# rank 1-3 → hired, 4-6 → offer, 7-14 → interview, 15-26 → shortlisted, 27-46 → screening, 47-52 → rejected
PIPELINE_DISTRIBUTION_001 = [
    (range(1, 4), "hired"),
    (range(4, 7), "offer"),
    (range(7, 15), "interview"),
    (range(15, 27), "shortlisted"),
    (range(27, 47), "screening"),
    (range(47, 53), "rejected"),
]

# job-redrob-002: different slice
PIPELINE_DISTRIBUTION_002 = [
    (range(1, 2), "hired"),
    (range(2, 4), "offer"),
    (range(4, 9), "interview"),
    (range(9, 17), "shortlisted"),
    (range(17, 32), "screening"),
    (range(32, 36), "rejected"),
]

# job-redrob-003: mostly early stage
PIPELINE_DISTRIBUTION_003 = [
    (range(1, 3), "interview"),
    (range(3, 11), "shortlisted"),
    (range(11, 26), "screening"),
]


def _find_results_json() -> Path | None:
    candidates = [
        Path(os.environ.get("RANKED_RESULTS_PATH", "")),
        Path(__file__).parent.parent.parent.parent.parent / "redrob_ranker" / "outputs" / "ranked_results.json",
        Path("/app/ranked_results.json"),
        Path("ranked_results.json"),
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _seed_pipeline(db: Session, job_id: str, candidates_by_rank: dict, distribution: list, recruiter_id: str):
    """Add candidates to pipeline stages. Skip if already seeded for this job."""
    if db.query(Shortlist).filter(Shortlist.job_id == job_id).count() > 0:
        return
    for rank_range, stage in distribution:
        for rank in rank_range:
            cand = candidates_by_rank.get(rank)
            if cand:
                sl = Shortlist(
                    job_id=job_id,
                    candidate_id=cand.id,
                    added_by_id=recruiter_id,
                    stage=stage,
                )
                db.add(sl)


def run_seed(db: Session) -> None:
    # Users
    for u in DEMO_USERS:
        if not db.query(User).filter(User.email == u["email"]).first():
            user = User(
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                department=u["department"],
                avatar_initials=u["avatar_initials"],
            )
            db.add(user)
    db.flush()

    # Jobs
    admin = db.query(User).filter(User.role == "admin").first()
    for jd in DEMO_JOBS:
        if not db.query(Job).filter(Job.id == jd["id"]).first():
            job = Job(**jd, created_by_id=admin.id if admin else None)
            db.add(job)
    db.flush()

    # Candidates from ranked results
    results_path = _find_results_json()
    if results_path and db.query(Candidate).count() == 0:
        with open(results_path, encoding="utf-8") as f:
            records = json.load(f)

        for r in records:
            profile = r.get("profile", {})
            sig = r.get("redrob_signals", {})
            sal = (sig.get("expected_salary_range_inr_lpa") or {})

            c = Candidate(
                id=r["candidate_id"],
                rank=r["rank"],
                score=r["score"],
                reasoning=r.get("reasoning", ""),
                name=profile.get("anonymized_name"),
                current_title=profile.get("current_title"),
                current_company=profile.get("current_company"),
                years_of_experience=profile.get("years_of_experience"),
                location=profile.get("location"),
                country=profile.get("country"),
                current_industry=profile.get("current_industry"),
                headline=profile.get("headline"),
                summary=profile.get("summary"),
                open_to_work=1 if sig.get("open_to_work_flag") else 0,
                last_active_date=sig.get("last_active_date"),
                notice_period_days=sig.get("notice_period_days"),
                recruiter_response_rate=sig.get("recruiter_response_rate"),
                github_activity_score=sig.get("github_activity_score"),
                preferred_work_mode=sig.get("preferred_work_mode"),
                willing_to_relocate=1 if sig.get("willing_to_relocate") else 0,
                expected_salary_min=sal.get("min"),
                expected_salary_max=sal.get("max"),
                behavioral_multiplier=r.get("behavioral_multiplier"),
                honeypot_penalty=r.get("honeypot_penalty"),
                profile_json=profile,
                skills_json=r.get("skills", []),
                education_json=r.get("education", []),
                career_summary_json=r.get("career_summary", []),
                signals_json=r.get("signals", {}),
                redrob_signals_json=sig,
            )
            db.add(c)

        db.flush()

    # Build rank→candidate map for pipeline seeding
    all_cands = db.query(Candidate).all()
    by_rank = {c.rank: c for c in all_cands}

    recruiter = db.query(User).filter(User.role == "recruiter").first()
    if recruiter:
        _seed_pipeline(db, "job-redrob-001", by_rank, PIPELINE_DISTRIBUTION_001, recruiter.id)
        _seed_pipeline(db, "job-redrob-002", by_rank, PIPELINE_DISTRIBUTION_002, recruiter.id)
        _seed_pipeline(db, "job-redrob-003", by_rank, PIPELINE_DISTRIBUTION_003, recruiter.id)

    db.commit()
    print("✅ Database seeded successfully")
