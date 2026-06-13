import random
from app.models.candidate import Candidate

# ─── Interview Kit — Rule-based fallback (no router, functions only) ──────────

BEHAVIORAL_QUESTIONS = [
    "Tell me about a time you delivered a project under tight deadlines. How did you prioritise?",
    "Describe a situation where you had to work with a difficult team member. How did you handle it?",
    "Give an example of a time you took ownership of a problem outside your direct responsibility.",
    "Tell me about a time you received critical feedback. How did you respond?",
    "Describe a situation where you had to make a decision with incomplete information.",
    "Give me an example of when you went beyond your job scope to deliver impact.",
    "Tell me about a time you had to convince stakeholders to change direction.",
    "Describe a failure you experienced and what you learned from it.",
]

LEADERSHIP_QUESTIONS = [
    "How do you set technical direction for a team? Walk me through your approach.",
    "Describe how you've grown engineers on your team. What frameworks do you use for mentoring?",
    "How do you handle disagreements between senior engineers on architectural decisions?",
    "Tell me about a time you had to balance technical debt against delivery pressure.",
    "How have you scaled your team's hiring process? What signals do you look for?",
]

CULTURE_QUESTIONS = [
    "What kind of engineering culture do you thrive in?",
    "How do you stay current with rapidly evolving technology? Can you give a recent example?",
    "Where do you see the biggest opportunities in this domain in the next 2-3 years?",
    "What does a great onboarding experience look like to you?",
    "How do you think about the build vs buy vs open-source decision for tooling?",
]

SKILL_QUESTION_TEMPLATES = {
    "python": [
        "Walk me through how you'd design a high-throughput async pipeline in Python. What libraries would you choose and why?",
        "How do you approach testing in Python? What's your philosophy on unit vs integration vs end-to-end tests?",
        "What are the key performance pitfalls in Python you've encountered, and how did you address them?",
    ],
    "machine learning": [
        "Explain your process for taking an ML model from a Jupyter notebook to production. What changes?",
        "How do you handle class imbalance in a dataset? What tradeoffs do you consider?",
        "Walk me through how you'd monitor a deployed ML model for drift in production.",
    ],
    "deep learning": [
        "How do you decide between transfer learning and training a model from scratch?",
        "Describe your approach to debugging poor model performance. What do you look at first?",
        "What is your experience with model quantisation and deployment optimisation?",
    ],
    "nlp": [
        "Walk me through how you'd build a semantic search system at scale.",
        "How do you evaluate the quality of text generation systems beyond perplexity?",
        "What are the tradeoffs between sparse (BM25) and dense retrieval methods?",
    ],
    "react": [
        "How do you approach state management in large React applications?",
        "What's your philosophy on component design and when to reach for context vs external state?",
        "How do you optimise React rendering performance? Give a concrete example you've worked on.",
    ],
    "node": [
        "How do you handle backpressure in a Node.js streaming pipeline?",
        "What's your approach to error handling and observability in a Node.js service?",
        "Walk me through how you'd design a rate-limited API in Node.js.",
    ],
    "sql": [
        "How do you approach query optimisation when you have a slow JOIN across large tables?",
        "Walk me through your approach to database schema migrations in a high-availability system.",
        "What indexing strategies have you used to optimise read-heavy workloads?",
    ],
    "kubernetes": [
        "How do you approach right-sizing pods in a Kubernetes cluster?",
        "Walk me through how you'd design a canary deployment strategy using Kubernetes.",
        "How have you handled stateful workloads in Kubernetes? What challenges did you face?",
    ],
    "aws": [
        "Walk me through how you'd architect a cost-optimised, highly available data pipeline on AWS.",
        "How do you approach IAM permissions design in a multi-account AWS environment?",
        "What's your experience with AWS cost optimisation? What levers have you pulled?",
    ],
}


def generate_interview_kit(c: Candidate) -> dict:
    skills = c.skills_json or []
    skill_names = [s.get("name", "").lower() for s in skills[:8] if isinstance(s, dict)]
    signals = c.signals_json or {}
    years = c.years_of_experience or 0
    is_senior = years >= 5

    technical_qs: list = []
    matched_skills: list = []
    for skill_name in skill_names:
        for key, qs in SKILL_QUESTION_TEMPLATES.items():
            if key in skill_name and key not in matched_skills:
                technical_qs.append(random.choice(qs))
                matched_skills.append(key)
                if len(technical_qs) >= 4:
                    break
        if len(technical_qs) >= 4:
            break

    if len(technical_qs) < 3:
        generic = [
            f"You've listed {skill_names[0] if skill_names else 'your primary skill'} as a core skill. Walk me through the most complex problem you solved with it.",
            "How do you approach system design for a service that needs to handle 10x current traffic?",
            "What's your approach to code review? What do you look for beyond correctness?",
            "Describe your ideal development environment and tooling setup.",
        ]
        technical_qs += generic[:4 - len(technical_qs)]

    behavioral_qs = random.sample(BEHAVIORAL_QUESTIONS, min(3, len(BEHAVIORAL_QUESTIONS)))
    leadership_qs = random.sample(LEADERSHIP_QUESTIONS, 2) if is_senior else []
    culture_qs = random.sample(CULTURE_QUESTIONS, 2)

    targeted_qs = []
    trajectory_score = signals.get("career_trajectory", 0)
    skills_score = signals.get("skills_match", 0)
    behavioral_score = signals.get("behavioral_signals", 0)

    if trajectory_score < 0.7:
        targeted_qs.append("Your career history shows some variability. Walk me through your career decisions and what guided each transition.")
    if skills_score > 0.85:
        targeted_qs.append("Your skills profile is very strong. Tell me about a project where you got to apply multiple of your core competencies together at scale.")
    if behavioral_score > 0.8:
        targeted_qs.append("You seem highly engaged in the developer community. How does your external engagement translate into impact in your day-to-day work?")

    logistics_qs = [
        f"Your notice period is listed as {c.notice_period_days or 30} days. Is there any flexibility on your start date if we move quickly?",
        f"This role is {'remote-friendly' if c.preferred_work_mode == 'remote' else 'based on-site / hybrid'}. How does that align with your preferences?",
    ]
    if c.expected_salary_min and c.expected_salary_max:
        logistics_qs.append(f"Your expected compensation range is ₹{c.expected_salary_min}–{c.expected_salary_max} LPA. Can you walk me through how you arrived at that range and your current comp structure?")

    return {
        "candidate_name": c.name,
        "seniority": "Senior" if is_senior else "Mid-level",
        "years_experience": years,
        "top_skills": skill_names[:5],
        "sections": [
            {"title": "Technical Deep-Dive", "icon": "code", "questions": technical_qs},
            {"title": "Behavioural & Situational", "icon": "psychology", "questions": behavioral_qs},
            *(
                [{"title": "Leadership & Ownership", "icon": "groups", "questions": leadership_qs}]
                if leadership_qs else []
            ),
            {"title": "Culture & Growth", "icon": "emoji_objects", "questions": culture_qs},
            *(
                [{"title": "Signal-Targeted Probes", "icon": "track_changes", "questions": targeted_qs}]
                if targeted_qs else []
            ),
            {"title": "Logistics & Alignment", "icon": "event", "questions": logistics_qs},
        ],
    }
