from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

from app.schemas import (
    AnswerAnalysis,
    AnswerSubmission,
    CandidateProfile,
    FinalReport,
    LoginRequest,
    SignupRequest,
    StartInterviewRequest,
)
from app.services.analyzer import analyze_answer, build_final_report, fairness_audit, generate_question


app = FastAPI(title="AI-Based Interview Performance Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
users: Dict[str, Dict] = {}
interviews: Dict[str, Dict] = {}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/signup")
def signup(payload: SignupRequest) -> Dict:
    if payload.email in users:
        raise HTTPException(status_code=409, detail="Email already registered")
    users[payload.email] = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": pwd_context.hash(payload.password),
        "profile": CandidateProfile(name=payload.name, email=payload.email).model_dump(),
    }
    return {"token": f"demo-{uuid.uuid4()}", "user": users[payload.email]["profile"]}


@app.post("/auth/login")
def login(payload: LoginRequest) -> Dict:
    user = users.get(payload.email)
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": f"demo-{uuid.uuid4()}", "user": user["profile"]}


@app.post("/profile")
def save_profile(profile: CandidateProfile) -> CandidateProfile:
    users.setdefault(profile.email, {"profile": profile.model_dump(), "password_hash": "", "email": profile.email, "name": profile.name})
    users[profile.email]["profile"] = profile.model_dump()
    return profile


@app.post("/interviews/start")
def start_interview(payload: StartInterviewRequest) -> Dict:
    interview_id = str(uuid.uuid4())
    first_question = generate_question(
        payload.setup.job_role,
        payload.setup.interview_type,
        payload.setup.difficulty,
        0,
        payload.setup.skills,
    )
    interviews[interview_id] = {
        "id": interview_id,
        "candidate_email": payload.candidate_email,
        "setup": payload.setup.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "questions": [first_question],
        "answers": [],
    }
    return {"interview_id": interview_id, "question": first_question}


@app.post("/interviews/answer", response_model=AnswerAnalysis)
def submit_answer(payload: AnswerSubmission) -> AnswerAnalysis:
    interview = interviews.get(payload.interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    analysis = analyze_answer(payload.question_id, payload.question, payload.transcript, payload.duration_seconds)
    interview["answers"].append(analysis)
    if analysis.next_question:
        interview["questions"].append(analysis.next_question)
    return analysis


@app.get("/interviews/{interview_id}/report", response_model=FinalReport)
def get_report(interview_id: str) -> Dict:
    interview = interviews.get(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return build_final_report(interview_id, interview["answers"])


@app.get("/interviews")
def list_history() -> List[Dict]:
    rows = []
    for interview in interviews.values():
        report = build_final_report(interview["id"], interview["answers"])
        setup = interview["setup"]
        rows.append(
            {
                "id": interview["id"],
                "date": interview["created_at"][:10],
                "job_role": setup["job_role"],
                "interview_type": setup["interview_type"],
                "overall_score": report["overall_score"],
                **report["category_scores"],
            }
        )
    return rows


@app.get("/dashboard")
def dashboard() -> Dict:
    history = list_history()
    scores = [row["overall_score"] for row in history] or [82, 76, 84, 88]
    return {
        "total_interviews": len(history) or 4,
        "average_score": round(sum(scores) / len(scores)),
        "best_score": max(scores),
        "trends": [
            {"label": "Session 1", "communication": 72, "confidence": 68, "domain": 76, "non_verbal": 70},
            {"label": "Session 2", "communication": 78, "confidence": 74, "domain": 80, "non_verbal": 75},
            {"label": "Session 3", "communication": 82, "confidence": 79, "domain": 86, "non_verbal": 81},
            {"label": "Session 4", "communication": 86, "confidence": 83, "domain": 88, "non_verbal": 84},
        ],
    }


@app.get("/admin/fairness")
def admin_fairness() -> Dict:
    return fairness_audit()
