import csv
import io
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.models.candidate import Candidate
from app.models.shortlist import Shortlist
from app.models.note import CandidateNote
from app.models.user import User
from app.schemas.candidate import CandidateListItem, CandidateDetail, CandidateListResponse
from app.schemas.user import ShortlistCreate, ShortlistUpdate, ShortlistOut
from app.deps import get_current_user

router = APIRouter(prefix="/candidates", tags=["candidates"])


# ─── Fixed-path routes MUST come before /{candidate_id} ──────────────────────

class AISearchBody(BaseModel):
    query: str


@router.post("/ai-search")
def ai_search(body: AISearchBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.gemini import ai_search_candidates
    top_cands = db.query(Candidate).order_by(Candidate.rank).limit(60).all()
    cand_dicts = [
        {
            "id": c.id,
            "name": c.name,
            "current_title": c.current_title,
            "years_of_experience": c.years_of_experience or 0,
            "preferred_work_mode": c.preferred_work_mode,
            "skills_json": c.skills_json,
            "location": c.location,
            "open_to_work": c.open_to_work,
        }
        for c in top_cands
    ]
    matched_ids = ai_search_candidates(body.query, cand_dicts)
    if not matched_ids:
        return {"ai_powered": False, "results": [], "message": "AI search unavailable"}
    id_to_cand = {c.id: c for c in db.query(Candidate).filter(Candidate.id.in_(matched_ids)).all()}
    results = [CandidateListItem.model_validate(id_to_cand[cid]) for cid in matched_ids if cid in id_to_cand]
    return {"ai_powered": True, "query": body.query, "results": [r.model_dump() for r in results]}


@router.get("/export")
def export_candidates(
    q: Optional[str] = None,
    open_to_work: Optional[bool] = None,
    min_score: float = Query(0.0, ge=0, le=1),
    work_mode: Optional[str] = None,
    ids: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Candidate)
    if ids:
        id_list = [i.strip() for i in ids.split(",") if i.strip()]
        query = query.filter(Candidate.id.in_(id_list))
    else:
        if q:
            ql = f"%{q.lower()}%"
            query = query.filter(or_(Candidate.name.ilike(ql), Candidate.current_title.ilike(ql), Candidate.current_company.ilike(ql)))
        if open_to_work is not None:
            query = query.filter(Candidate.open_to_work == (1 if open_to_work else 0))
        if min_score > 0:
            query = query.filter(Candidate.score >= min_score)
        if work_mode:
            query = query.filter(Candidate.preferred_work_mode == work_mode)
    candidates = query.order_by(Candidate.rank).limit(500).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Name", "AI Score (%)", "Title", "Company", "Years Exp",
        "Location", "Open to Work", "Work Mode", "Notice Period (days)",
        "Expected Salary Min (LPA)", "Expected Salary Max (LPA)",
        "GitHub Score", "Response Rate (%)", "AI Reasoning",
    ])
    for c in candidates:
        writer.writerow([
            c.rank, c.name or "", round(c.score * 100, 1),
            c.current_title or "", c.current_company or "",
            round(c.years_of_experience or 0, 1),
            c.location or "", "Yes" if c.open_to_work else "No",
            c.preferred_work_mode or "", c.notice_period_days or "",
            c.expected_salary_min or "", c.expected_salary_max or "",
            c.github_activity_score or "", round((c.recruiter_response_rate or 0) * 100, 1),
            (c.reasoning or "")[:200],
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates_export.csv"},
    )


class BulkShortlistBody(BaseModel):
    job_id: str
    candidate_ids: List[str]


@router.post("/bulk-shortlist")
def bulk_shortlist(body: BulkShortlistBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    created = skipped = 0
    for cid in body.candidate_ids:
        if db.query(Shortlist).filter(Shortlist.job_id == body.job_id, Shortlist.candidate_id == cid).first():
            skipped += 1
            continue
        db.add(Shortlist(job_id=body.job_id, candidate_id=cid, added_by_id=current_user.id))
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


@router.post("/shortlist", response_model=ShortlistOut)
def add_to_shortlist(body: ShortlistCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Shortlist).filter(Shortlist.job_id == body.job_id, Shortlist.candidate_id == body.candidate_id).first()
    if existing:
        return ShortlistOut.model_validate(existing)
    c = db.query(Candidate).filter(Candidate.id == body.candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    sl = Shortlist(job_id=body.job_id, candidate_id=body.candidate_id, added_by_id=current_user.id)
    db.add(sl)
    db.commit()
    db.refresh(sl)
    return ShortlistOut.model_validate(sl)


@router.patch("/shortlist/{shortlist_id}", response_model=ShortlistOut)
def update_stage(shortlist_id: str, body: ShortlistUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sl = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not sl:
        raise HTTPException(status_code=404, detail="Not found")
    sl.stage = body.stage
    db.commit()
    db.refresh(sl)
    return ShortlistOut.model_validate(sl)


@router.delete("/shortlist/{shortlist_id}")
def remove_from_shortlist(shortlist_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sl = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not sl:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(sl)
    db.commit()
    return {"message": "Removed from shortlist"}


# ─── List ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=CandidateListResponse)
def list_candidates(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    q: Optional[str] = None,
    open_to_work: Optional[bool] = None,
    min_score: float = Query(0.0, ge=0, le=1),
    max_notice: Optional[int] = None,
    work_mode: Optional[str] = None,
    job_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Candidate)
    if q:
        ql = f"%{q.lower()}%"
        query = query.filter(or_(
            Candidate.current_title.ilike(ql), Candidate.current_company.ilike(ql),
            Candidate.name.ilike(ql), Candidate.headline.ilike(ql), Candidate.location.ilike(ql),
        ))
    if open_to_work is not None:
        query = query.filter(Candidate.open_to_work == (1 if open_to_work else 0))
    if min_score > 0:
        query = query.filter(Candidate.score >= min_score)
    if max_notice is not None:
        query = query.filter(Candidate.notice_period_days <= max_notice)
    if work_mode:
        query = query.filter(Candidate.preferred_work_mode == work_mode)

    total = query.count()
    candidates = query.order_by(Candidate.rank).offset((page - 1) * per_page).limit(per_page).all()

    shortlisted_ids: set = set()
    if job_id:
        sl = db.query(Shortlist.candidate_id).filter(Shortlist.job_id == job_id).all()
        shortlisted_ids = {s.candidate_id for s in sl}

    results = []
    for c in candidates:
        item = CandidateListItem.model_validate(c)
        item.is_shortlisted = c.id in shortlisted_ids
        results.append(item)
    return CandidateListResponse(total=total, page=page, per_page=per_page, results=results)


# ─── Dynamic /{candidate_id} routes — MUST be LAST ───────────────────────────

@router.get("/{candidate_id}", response_model=CandidateDetail)
def get_candidate(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return CandidateDetail.model_validate(c)


@router.post("/{candidate_id}/favorite")
def toggle_favorite(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    c.is_favorite = 0 if c.is_favorite else 1
    db.commit()
    return {"is_favorite": c.is_favorite}


# ─── Notes ────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    content: str
    note_type: Optional[str] = "general"


@router.get("/{candidate_id}/notes")
def get_notes(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(CandidateNote).filter(CandidateNote.candidate_id == candidate_id).order_by(CandidateNote.created_at.desc()).all()
    return [
        {
            "id": n.id, "content": n.content, "note_type": n.note_type,
            "author_name": n.user.full_name if n.user else "Unknown",
            "author_role": n.user.role if n.user else "",
            "created_at": n.created_at.isoformat(),
        }
        for n in notes
    ]


@router.post("/{candidate_id}/notes")
def add_note(candidate_id: str, body: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = CandidateNote(candidate_id=candidate_id, user_id=current_user.id, content=body.content, note_type=body.note_type)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {
        "id": note.id, "content": note.content, "note_type": note.note_type,
        "author_name": current_user.full_name, "author_role": current_user.role,
        "created_at": note.created_at.isoformat(),
    }


@router.delete("/{candidate_id}/notes/{note_id}")
def delete_note(candidate_id: str, note_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(CandidateNote).filter(CandidateNote.id == note_id, CandidateNote.candidate_id == candidate_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot delete another user's note")
    db.delete(note)
    db.commit()
    return {"message": "Deleted"}


# ─── Interview Kit (Gemini-powered) ──────────────────────────────────────────

@router.get("/{candidate_id}/interview-kit")
def get_interview_kit(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    from app.services.gemini import generate_interview_kit_ai
    from app.api.notes import generate_interview_kit
    kit = generate_interview_kit_ai({
        "name": c.name, "current_title": c.current_title, "current_company": c.current_company,
        "years_of_experience": c.years_of_experience, "skills_json": c.skills_json,
        "career_summary_json": c.career_summary_json, "signals_json": c.signals_json,
        "reasoning": c.reasoning, "score": c.score,
    })
    return kit if kit else generate_interview_kit(c)


# ─── Gemini Fit Analysis ──────────────────────────────────────────────────────

class FitAnalysisBody(BaseModel):
    job_id: str


@router.post("/{candidate_id}/fit-analysis")
def fit_analysis(candidate_id: str, body: FitAnalysisBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.job import Job
    from app.services.gemini import _call_gemini
    import json

    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    skills = [s.get("name", "") for s in (c.skills_json or [])[:8] if isinstance(s, dict)]
    signals = c.signals_json or {}
    career = c.career_summary_json or []
    recent = [f"{j.get('title','?')} at {j.get('company','?')}" for j in career[:3] if isinstance(j, dict)]

    prompt = f"""You are an expert AI recruiter. Analyze this candidate's fit for this job and return structured JSON.

JOB:
Title: {job.title}
Description: {job.description or ""}
Experience required: {job.experience_min}-{job.experience_max} years
Location: {job.location} ({job.work_mode})

CANDIDATE:
Name: {c.name}
Current: {c.current_title} at {c.current_company}
Experience: {c.years_of_experience or 0:.1f} years
Skills: {', '.join(skills)}
Recent: {'; '.join(recent) if recent else 'N/A'}
AI Score: {round(c.score * 100, 1)}/100
Signal scores: Role={round(signals.get('title_role',0)*100)}% Skills={round(signals.get('skills_match',0)*100)}% Exp={round(signals.get('experience_fit',0)*100)}% Trajectory={round(signals.get('career_trajectory',0)*100)}%
Work mode: {c.preferred_work_mode} | Notice: {c.notice_period_days or '?'} days | Open to work: {'Yes' if c.open_to_work else 'No'}

Return ONLY valid JSON (no markdown):
{{
  "fit_score": 85,
  "verdict": "Strong Match|Good Match|Partial Match|Weak Match",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "One actionable sentence on what to do next",
  "interview_priority": "High|Medium|Low"
}}"""

    response = _call_gemini(prompt, temperature=0.3)
    if not response:
        return {"fit_score": round(c.score * 100), "verdict": "Good Match", "strengths": ["Strong AI score"], "gaps": [], "recommendation": "Review candidate profile and proceed with interview.", "interview_priority": "High" if c.score > 0.9 else "Medium", "ai_powered": False}

    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        result = json.loads(text)
        result["ai_powered"] = True
        result["candidate_name"] = c.name
        result["job_title"] = job.title
        return result
    except Exception:
        return {"fit_score": round(c.score * 100), "verdict": "Good Match", "strengths": [c.reasoning or "High AI score"], "gaps": [], "recommendation": "Proceed with interview.", "interview_priority": "High" if c.score > 0.9 else "Medium", "ai_powered": False}


# ─── Gemini Email Drafter ─────────────────────────────────────────────────────

class DraftEmailBody(BaseModel):
    job_id: Optional[str] = None
    email_type: str = "outreach"  # outreach | rejection | interview_invite | offer


@router.post("/{candidate_id}/draft-email")
def draft_email(candidate_id: str, body: DraftEmailBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.job import Job
    from app.services.gemini import _call_gemini

    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = db.query(Job).filter(Job.id == body.job_id).first() if body.job_id else None

    skills = [s.get("name", "") for s in (c.skills_json or [])[:5] if isinstance(s, dict)]

    type_prompts = {
        "outreach": f"Write a warm, personalized recruiter outreach email to {c.name} ({c.current_title} at {c.current_company}) for the role of {job.title if job else 'a senior AI engineering position'}. Be specific about their skills ({', '.join(skills[:3])}). Keep it under 150 words. Professional but human. Subject line first, then email body.",
        "rejection": f"Write a respectful, kind rejection email to {c.name} for the {job.title if job else 'position'} they applied for. Thank them for their time, be positive, and leave door open for future. Under 100 words. Subject line first, then body.",
        "interview_invite": f"Write a professional interview invitation email to {c.name} for {job.title if job else 'a role'} at Redrob. Include placeholder for date/time/link. Friendly and clear. Under 120 words. Subject line first, then body.",
        "offer": f"Write an offer email to {c.name} for {job.title if job else 'a position'}. Congratulatory and enthusiastic. Mention competitive compensation (leave placeholder). Under 130 words. Subject line first, then body.",
    }

    prompt = type_prompts.get(body.email_type, type_prompts["outreach"])
    response = _call_gemini(prompt, temperature=0.7)

    if not response:
        return {"subject": f"Opportunity at Redrob — {job.title if job else 'Senior Role'}", "body": f"Hi {c.name},\n\nI came across your profile and was impressed by your experience in {', '.join(skills[:2])}.\n\nWould you be open to a conversation about an exciting opportunity?\n\nBest regards,\n{current_user.full_name}", "ai_powered": False}

    lines = response.strip().split("\n")
    subject = lines[0].replace("Subject:", "").replace("**", "").strip()
    body_text = "\n".join(lines[1:]).strip()
    return {"subject": subject, "body": body_text, "ai_powered": True, "email_type": body.email_type}


# ─── Gemini Notes Summarizer ──────────────────────────────────────────────────

@router.get("/{candidate_id}/summarize-notes")
def summarize_notes(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.gemini import _call_gemini

    notes = db.query(CandidateNote).filter(CandidateNote.candidate_id == candidate_id).order_by(CandidateNote.created_at).all()
    if not notes:
        return {"summary": "No notes yet.", "sentiment": "neutral", "ai_powered": False}

    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    notes_text = "\n".join([f"[{n.note_type.upper()} by {n.user.full_name if n.user else 'Recruiter'}]: {n.content}" for n in notes])

    prompt = f"""You are a recruiting intelligence assistant. Summarize these recruiter notes about {c.name if c else 'this candidate'} into a concise, actionable brief.

NOTES:
{notes_text}

Return ONLY valid JSON:
{{
  "summary": "2-3 sentence summary of key themes across all notes",
  "sentiment": "positive|neutral|negative|mixed",
  "key_points": ["point1", "point2", "point3"],
  "recommended_action": "One specific next action based on the notes",
  "hire_signal": "Strong|Moderate|Weak|Unclear"
}}"""

    response = _call_gemini(prompt, temperature=0.3)
    if not response:
        return {"summary": f"{len(notes)} notes recorded.", "sentiment": "neutral", "key_points": [], "recommended_action": "Review notes manually.", "hire_signal": "Unclear", "ai_powered": False}

    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        import json
        result = json.loads(text)
        result["ai_powered"] = True
        result["note_count"] = len(notes)
        return result
    except Exception:
        return {"summary": f"{len(notes)} notes recorded.", "sentiment": "neutral", "key_points": [], "recommended_action": "Review notes.", "hire_signal": "Unclear", "ai_powered": False}
