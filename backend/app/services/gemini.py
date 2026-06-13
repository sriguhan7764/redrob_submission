"""
Gemini AI service — powers real LLM features:
  - AI interview kit generation
  - Natural language candidate search
  - JD analysis
  - Candidate ranking explanation
"""
import json
import os
import httpx
from typing import Optional

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def _call_gemini(prompt: str, temperature: float = 0.4) -> Optional[str]:
    """Call Gemini and return the text response, or None on error."""
    if not GEMINI_API_KEY:
        print("[Gemini] GEMINI_API_KEY not set — skipping AI call. Set it in .env to enable AI features.")
        return None
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 2048,
        },
    }
    try:
        r = httpx.post(
            GEMINI_URL,
            headers={"X-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=30.0,
        )
        r.raise_for_status()
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"[Gemini error] {e}")
        return None


def generate_interview_kit_ai(candidate: dict) -> Optional[dict]:
    """
    Generate a personalized interview kit using Gemini.
    candidate: dict with keys: name, current_title, current_company, years_of_experience,
               skills_json, career_summary_json, signals_json, reasoning, score
    """
    skills = [s.get("name", "") for s in (candidate.get("skills_json") or [])[:8] if isinstance(s, dict)]
    career = candidate.get("career_summary_json") or []
    signals = candidate.get("signals_json") or {}
    years = candidate.get("years_of_experience") or 0
    name = candidate.get("name", "the candidate")
    title = candidate.get("current_title", "unknown")
    company = candidate.get("current_company", "unknown")
    score = candidate.get("score", 0)
    reasoning = candidate.get("reasoning", "")

    recent_companies = [f"{j.get('title','?')} at {j.get('company','?')}" for j in career[:3] if isinstance(j, dict)]

    prompt = f"""You are an expert technical recruiter creating an AI-powered interview kit.

CANDIDATE PROFILE:
- Name: {name}
- Role: {title} at {company}
- Experience: {years:.1f} years
- Top Skills: {', '.join(skills)}
- Recent Career: {'; '.join(recent_companies) if recent_companies else 'N/A'}
- AI Match Score: {round(score * 100, 1)}/100
- AI Assessment: {reasoning}
- Signal Scores: Role Match={round(signals.get('title_role',0)*100)}%, Skills={round(signals.get('skills_match',0)*100)}%, Experience={round(signals.get('experience_fit',0)*100)}%, Trajectory={round(signals.get('career_trajectory',0)*100)}%, Behavioral={round(signals.get('behavioral_signals',0)*100)}%

Generate a structured interview kit in JSON format with these EXACT sections. Make questions specific to this candidate's actual profile — reference their real skills and experience.

Return ONLY valid JSON (no markdown code blocks, no extra text) with this structure:
{{
  "seniority": "Senior|Mid-level|Junior",
  "focus_areas": ["area1", "area2", "area3"],
  "sections": [
    {{
      "title": "Technical Deep-Dive",
      "icon": "code",
      "questions": ["q1", "q2", "q3", "q4"]
    }},
    {{
      "title": "System Design",
      "icon": "architecture",
      "questions": ["q1", "q2", "q3"]
    }},
    {{
      "title": "Past Impact & Behavioural",
      "icon": "psychology",
      "questions": ["q1", "q2", "q3"]
    }},
    {{
      "title": "Culture & Growth Mindset",
      "icon": "emoji_objects",
      "questions": ["q1", "q2"]
    }},
    {{
      "title": "Red Flag Probes",
      "icon": "track_changes",
      "questions": ["q1", "q2"]
    }},
    {{
      "title": "Offer & Logistics",
      "icon": "event",
      "questions": ["q1", "q2"]
    }}
  ]
}}

Make the questions highly specific to {name}'s {', '.join(skills[:3])} background. Red flag probes should address gaps in their signal scores."""

    response = _call_gemini(prompt, temperature=0.5)
    if not response:
        return None

    # Strip any markdown wrappers
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        kit = json.loads(text)
        kit["candidate_name"] = name
        kit["years_experience"] = years
        kit["top_skills"] = skills[:5]
        kit["ai_generated"] = True
        return kit
    except json.JSONDecodeError:
        return None


def analyze_jd_and_rank(job_description: str, candidates: list) -> Optional[list]:
    """
    Use Gemini to re-rank candidates based on a specific JD.
    Returns list of {candidate_id, ai_reasoning, ai_score_adjustment} sorted by fit.
    """
    if not candidates:
        return None

    cand_summaries = []
    for i, c in enumerate(candidates[:15]):  # limit to top 15 for context
        skills = [s.get("name", "") for s in (c.get("skills_json") or [])[:5] if isinstance(s, dict)]
        cand_summaries.append(
            f"{i+1}. ID={c['id']} | {c.get('name','?')} | {c.get('current_title','?')} | "
            f"{c.get('years_of_experience',0):.1f}y | Skills: {', '.join(skills)} | Score: {round(c.get('score',0)*100,1)}"
        )

    prompt = f"""You are an expert AI recruiter. Given this job description and these candidates,
provide a brief AI insight for each candidate's fit.

JOB DESCRIPTION:
{job_description[:800]}

CANDIDATES (already ranked by AI scoring):
{chr(10).join(cand_summaries)}

For EACH candidate, provide a ONE-LINE insight about their specific fit for this exact role.
Focus on skill gaps or strengths relative to the JD. Be specific and actionable.

Return ONLY valid JSON array:
[
  {{"id": "CAND_ID", "insight": "One-line fit assessment"}},
  ...
]"""

    response = _call_gemini(prompt, temperature=0.3)
    if not response:
        return None

    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        return json.loads(text)
    except Exception:
        return None


def ai_search_candidates(query: str, candidates: list) -> Optional[list]:
    """
    Use Gemini to understand natural language query and return ranked candidate IDs.
    """
    if not candidates or not query.strip():
        return None

    cand_summaries = []
    for c in candidates[:30]:
        skills = [s.get("name", "") for s in (c.get("skills_json") or [])[:5] if isinstance(s, dict)]
        cand_summaries.append(
            f"ID={c['id']} | {c.get('name','?')} | {c.get('current_title','?')} | "
            f"{c.get('years_of_experience',0):.0f}y exp | {c.get('preferred_work_mode','?')} | "
            f"Skills: {', '.join(skills[:4])}"
        )

    prompt = f"""Recruiter query: "{query}"

Match this query against these candidates and return the IDs of the best matching ones (up to 10).

CANDIDATES:
{chr(10).join(cand_summaries)}

Return ONLY a JSON array of matching candidate IDs in order of relevance:
["CAND_ID1", "CAND_ID2", ...]

Only include candidates that genuinely match the query. If none match well, return []."""

    response = _call_gemini(prompt, temperature=0.2)
    if not response:
        return None

    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        return json.loads(text)
    except Exception:
        return None
