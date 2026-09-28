from __future__ import annotations

import hashlib
import math
from typing import Dict, List, Tuple

from app.schemas import AnswerAnalysis, InterviewQuestion, MetricBlock


FILLERS = {"um", "uh", "like", "actually", "basically", "you know", "so"}


def generate_question(role: str, interview_type: str, difficulty: str, index: int, skills: List[str], previous_answer: str = "") -> InterviewQuestion:
    skill = skills[index % len(skills)] if skills else role
    if previous_answer:
        text = f"Based on your previous answer, can you give a practical example where {skill} matters for a {role}?"
        focus = "follow-up"
    elif "hr" in interview_type.lower():
        text = f"Tell me about a time you handled a challenge while preparing for a {role} position."
        focus = "behavioral"
    else:
        level_hint = "with trade-offs" if difficulty.lower() == "hard" else "clearly"
        text = f"Explain {skill} for a {role} interview {level_hint}, and include one real project example."
        focus = skill
    return InterviewQuestion(id=f"q-{index + 1}", text=text, focus_area=focus)


def analyze_answer(question_id: str, question: str, transcript: str, duration_seconds: int) -> AnswerAnalysis:
    words = [w.strip(".,!?;:()[]{}\"'").lower() for w in transcript.split() if w.strip()]
    word_count = len(words)
    minutes = max(duration_seconds / 60, 0.1)
    wpm = round(word_count / minutes)
    filler_count = sum(1 for w in words if w in FILLERS)
    unique_ratio = len(set(words)) / max(word_count, 1)
    expected_terms = _keywords(question)
    covered_terms = sorted(set(words).intersection(expected_terms))
    coverage = len(covered_terms) / max(len(expected_terms), 1)

    relevance = _bounded(55 + coverage * 35 + min(word_count, 80) * 0.15)
    structure = _bounded(50 + _has_structure(transcript) * 20 + min(word_count, 120) * 0.1)
    technical = _bounded(50 + coverage * 45 + unique_ratio * 10)
    fluency = _bounded(96 - filler_count * 4 - abs(wpm - 135) * 0.18)
    pause_count = max(0, transcript.count("...") + transcript.count("[pause]"))
    speech_confidence = _bounded(80 - filler_count * 3 - pause_count * 5 - max(0, 85 - wpm) * 0.2)
    eye_contact = _stable_mock(question_id, 68, 91)
    posture = _stable_mock(question_id + "posture", 70, 94)
    facial_engagement = _stable_mock(question_id + "face", 66, 92)

    text_score = round((relevance + structure + technical) / 3)
    audio_score = round((fluency + speech_confidence + _bounded(100 - abs(wpm - 135) * 0.3)) / 3)
    video_score = round((eye_contact + posture + facial_engagement) / 3)
    fusion_weights = _attention_weights(text_score, audio_score, video_score)

    communication = round(text_score * 0.62 + audio_score * 0.38)
    confidence = round(audio_score * 0.58 + video_score * 0.42)
    domain = round(technical * 0.72 + relevance * 0.28)
    non_verbal = video_score

    feedback = {
        "positive": _positives(communication, confidence, domain, non_verbal),
        "improvement": _improvements(filler_count, coverage, wpm, eye_contact, structure),
        "suggested_answer": [
            "Use a crisp definition, add one implementation detail, then close with a project example or trade-off."
        ],
    }

    follow_up = generate_question("target role", "technical", "medium", int(question_id.split("-")[-1]), list(covered_terms)[:3] or ["core concept"], transcript)

    return AnswerAnalysis(
        question_id=question_id,
        transcript=transcript,
        text=MetricBlock(
            score=text_score,
            metrics={
                "relevance": relevance,
                "technical_accuracy": technical,
                "completeness": _bounded(45 + coverage * 45 + min(word_count, 100) * 0.1),
                "semantic_similarity": _bounded(48 + coverage * 44),
                "covered_terms": covered_terms,
            },
            feedback=["Good core coverage." if coverage > 0.45 else "Add more role-specific concepts and examples."],
        ),
        audio=MetricBlock(
            score=audio_score,
            metrics={
                "speaking_speed_wpm": wpm,
                "filler_words": filler_count,
                "pauses": pause_count,
                "fluency": fluency,
                "speech_confidence": speech_confidence,
                "answer_duration_seconds": duration_seconds,
            },
            feedback=["Pace is interview-friendly." if 110 <= wpm <= 160 else "Adjust speaking speed toward 120-150 WPM."],
        ),
        video=MetricBlock(
            score=video_score,
            metrics={
                "eye_contact": eye_contact,
                "posture": "Good" if posture >= 78 else "Needs attention",
                "facial_engagement": facial_engagement,
                "excessive_movement": "Low" if video_score >= 78 else "Medium",
            },
            feedback=["Non-verbal signals look steady." if video_score >= 78 else "Improve eye contact and reduce body movement."],
        ),
        fusion_weights=fusion_weights,
        scores={
            "communication": communication,
            "confidence": confidence,
            "domain_knowledge": domain,
            "non_verbal": non_verbal,
            "overall": round(
                communication * fusion_weights["text"]
                + confidence * fusion_weights["audio"]
                + ((domain + non_verbal) / 2) * fusion_weights["video"]
            ),
        },
        feedback=feedback,
        next_question=follow_up,
    )


def build_final_report(interview_id: str, answers: List[AnswerAnalysis]) -> Dict:
    if not answers:
        category_scores = {"communication": 0, "confidence": 0, "domain_knowledge": 0, "non_verbal": 0}
    else:
        category_scores = {
            key: round(sum(a.scores[key] for a in answers) / len(answers))
            for key in ["communication", "confidence", "domain_knowledge", "non_verbal"]
        }
    overall = round(sum(category_scores.values()) / max(len(category_scores), 1))
    strengths = [k.replace("_", " ").title() for k, v in category_scores.items() if v >= 80] or ["Consistent interview completion"]
    weaknesses = [k.replace("_", " ").title() for k, v in category_scores.items() if v < 75] or ["Add more examples for stronger differentiation"]
    return {
        "interview_id": interview_id,
        "overall_score": overall,
        "completion": f"{len(answers)} answers analyzed",
        "category_scores": category_scores,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "ai_summary": "You show a solid base. Improve answer structure, reduce fillers, and connect concepts to concrete projects for stronger interview performance.",
        "answers": answers,
    }


def fairness_audit() -> Dict:
    groups = [
        {"group": "Opt-in Group A", "average_score": 81, "sample_size": 42},
        {"group": "Opt-in Group B", "average_score": 78, "sample_size": 39},
        {"group": "Opt-in Group C", "average_score": 80, "sample_size": 31},
    ]
    return {
        "groups": groups,
        "prediction_disparity": 3,
        "demographic_parity_gap": 0.04,
        "equalized_odds_gap": 0.06,
        "feature_leakage_risk": "Low",
        "policy": "Protected attributes are used only for aggregate audit reporting, never candidate scoring.",
    }


def _keywords(text: str) -> set:
    stop = {"the", "a", "an", "and", "or", "to", "for", "in", "of", "with", "your", "can", "you", "explain", "tell", "about"}
    return {w.strip(".,!?;:()[]{}\"'").lower() for w in text.split() if len(w) > 3 and w.lower() not in stop}


def _has_structure(text: str) -> int:
    markers = ["first", "second", "because", "example", "project", "therefore", "trade-off"]
    return min(2, sum(1 for marker in markers if marker in text.lower()))


def _attention_weights(text_score: int, audio_score: int, video_score: int) -> Dict[str, float]:
    values = [text_score / 20, audio_score / 20, video_score / 20]
    exps = [math.exp(v) for v in values]
    total = sum(exps)
    names = ["text", "audio", "video"]
    return {name: round(value / total, 2) for name, value in zip(names, exps)}


def _stable_mock(seed: str, low: int, high: int) -> int:
    digest = hashlib.sha256(seed.encode()).hexdigest()
    return low + int(digest[:4], 16) % (high - low + 1)


def _bounded(value: float) -> int:
    return round(max(0, min(100, value)))


def _positives(communication: int, confidence: int, domain: int, non_verbal: int) -> List[str]:
    items = []
    if communication >= 78:
        items.append("Clear and relevant communication")
    if confidence >= 78:
        items.append("Steady speech confidence")
    if domain >= 78:
        items.append("Strong domain knowledge signals")
    if non_verbal >= 78:
        items.append("Good eye contact and posture indicators")
    return items or ["You completed the answer and gave analyzable content."]


def _improvements(filler_count: int, coverage: float, wpm: int, eye_contact: int, structure: int) -> List[str]:
    items = []
    if filler_count > 3:
        items.append("Reduce filler words by pausing silently before key points.")
    if coverage < 0.45:
        items.append("Cover more expected technical keywords and explain their relationships.")
    if wpm < 110 or wpm > 160:
        items.append("Keep your pace near 120-150 words per minute.")
    if eye_contact < 75:
        items.append("Maintain steadier gaze toward the camera.")
    if structure < 75:
        items.append("Use a definition, example, trade-off structure.")
    return items or ["Add one sharper real-world example to make the answer memorable."]
