from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any


class CandidateProfile(BaseModel):
    name: str
    email: EmailStr
    education: str = ""
    skills: List[str] = []
    experience: str = ""
    target_role: str = ""
    resume_text: str = ""


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InterviewSetup(BaseModel):
    job_role: str
    experience_level: str
    interview_type: str
    difficulty: str
    question_count: int = Field(ge=1, le=20)
    duration_minutes: int = Field(ge=5, le=120)
    skills: List[str] = []
    resume_text: str = ""


class StartInterviewRequest(BaseModel):
    candidate_email: EmailStr
    setup: InterviewSetup


class InterviewQuestion(BaseModel):
    id: str
    text: str
    focus_area: str


class AnswerSubmission(BaseModel):
    interview_id: str
    question_id: str
    question: str
    transcript: str
    duration_seconds: int = Field(ge=1)


class MetricBlock(BaseModel):
    metrics: Dict[str, Any]
    score: int
    feedback: List[str]


class AnswerAnalysis(BaseModel):
    question_id: str
    transcript: str
    text: MetricBlock
    audio: MetricBlock
    video: MetricBlock
    fusion_weights: Dict[str, float]
    scores: Dict[str, int]
    feedback: Dict[str, List[str]]
    next_question: Optional[InterviewQuestion] = None


class FinalReport(BaseModel):
    interview_id: str
    overall_score: int
    completion: str
    category_scores: Dict[str, int]
    strengths: List[str]
    weaknesses: List[str]
    ai_summary: str
    answers: List[AnswerAnalysis]
