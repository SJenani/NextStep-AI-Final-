import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from typing import Optional

from env_config import load_backend_env

load_backend_env()

import models
import schemas
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from database import get_db, init_db
from employer_api import router as employer_router
from fraud_detector import analyze_job_posting
from interview_module import generate_interview_pack
from job_api import derive_company_trends, fetch_jobs, fetch_jobs_with_status
from job_api import router as job_router
from ml_ranker import build_skill_dashboard, generate_resume_audit, normalize_skills, rank_jobs, _tokenize_resume_role, suggest_roles_by_skills
from notification_service import start_scheduler, stop_scheduler, upsert_subscription
from resume_parser import analyze_documents
from roadmap_generator import generate_learning_roadmap
from pdf_generator import generate_pdf_from_html

from semantic_recommender import SemanticRecommender
from job_service import get_all_jobs


logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BACKEND_DIR / "media"
INTERVIEW_RECORDINGS_DIR = MEDIA_DIR / "interview_recordings"
INTERVIEW_RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------
# Redis (optional)
# ---------------------------------------------------------------------
try:
    import redis

    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        decode_responses=True,
        socket_connect_timeout=2,
    )
    redis_client.ping()
except Exception:
    logger.warning("Redis not available; caching and feedback will use in-memory fallback.")
    redis_client = None

# ---------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------
app = FastAPI(
    title="AI Smart Career Guidance and Job Recommendation API",
    description="FastAPI backend for real-time job recommendations, skill gap analysis, roadmap generation, and career mentoring.",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

# Attach semantic recommender to app state (global singleton)
app.state.recommender = SemanticRecommender()

# Register router (job_api.py)
app.include_router(job_router)
app.include_router(employer_router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# ---------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https://.*\.ngrok-free\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Startup / Shutdown
# ---------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    init_db()
    start_scheduler()

    # Load DB jobs into semantic recommender (FAISS index build)
    jobs = get_all_jobs()
    app.state.recommender.fit(jobs)

    logger.info("Semantic recommender loaded with %d jobs.", len(jobs))


@app.on_event("shutdown")
async def on_shutdown():
    stop_scheduler()


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def get_profile_or_404(db: Session, user_id: int):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Create a profile first.")
    return profile


def get_job_or_404(db: Session, job_id: int) -> models.Job:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def serialize_hybrid_job(job: models.Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company or "Unknown company",
        "location": job.location or "Remote",
        "stipend_salary": job.stipend_salary or job.salary_range or "Not disclosed",
        "job_type": job.job_type or "internal",
        "apply_url": job.apply_url,
        "description": job.description,
    }


# ---------------------------------------------------------------------
# Hybrid Job Apply System
# ---------------------------------------------------------------------
@app.post("/jobs", response_model=schemas.JobOut, status_code=status.HTTP_201_CREATED)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    job = models.Job(
        title=payload.title.strip(),
        company=payload.company.strip(),
        location=payload.location.strip(),
        stipend_salary=payload.stipend_salary.strip(),
        salary_range=payload.stipend_salary.strip(),
        job_type=payload.job_type,
        apply_url=payload.apply_url,
        description=(payload.description or "").strip() or None,
        source="saas",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return serialize_hybrid_job(job)


@app.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    return [serialize_hybrid_job(job) for job in jobs]


@app.delete("/api/bookmarks/{job_id}", response_model=schemas.BookmarkOut)
def remove_bookmark(job_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    bookmark = db.query(models.Bookmark).filter(models.Bookmark.user_id == user.id, models.Bookmark.job_id == job_id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
    return bookmark

@app.post("/api/generate-pdf")
def generate_pdf(request: schemas.GeneratePDFRequest, user: models.User = Depends(get_current_user)):
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="fpdf2 is not installed.")
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    
    # Title
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(0, 10, request.title, ln=True, align='C')
    pdf.ln(10)
    
    # Body
    pdf.set_font("Helvetica", size=11)
    # Basic markdown cleanup for fpdf
    text = request.content.replace("**", "").replace("*", "")
    pdf.multi_cell(0, 7, text)
    
    pdf_bytes = pdf.output()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=\"{request.title}.pdf\""
    })

@app.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    return serialize_hybrid_job(get_job_or_404(db, job_id))


@app.post("/apply", response_model=schemas.ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_for_internal_job(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    job = get_job_or_404(db, payload.job_id)
    if job.job_type != "internal":
        raise HTTPException(
            status_code=400,
            detail="This is an external job. Please apply on the company website.",
        )

    application = models.Application(
        job_id=job.id,
        user_name=payload.user_name.strip(),
        email=str(payload.email),
        resume_link=payload.resume_link.strip(),
        cover_letter=(payload.cover_letter or "").strip() or None,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    
    # Gamification
    user = db.query(models.User).filter(models.User.email == application.email).first()
    if user:
        profile = db.query(models.Profile).filter(models.Profile.user_id == user.id).first()
        if profile:
            profile.weekly_applications += 1
            if "first_application" not in profile.badges:
                profile.badges = list(profile.badges) + ["first_application"]
            db.commit()
            
    return application


def _recording_public_path(stored_filename: str) -> str:
    return f"/media/interview_recordings/{stored_filename}"


def _serialize_interview_recording(recording: models.InterviewRecording) -> dict:
    return {
        "id": recording.id,
        "target_role": recording.target_role,
        "question_key": recording.question_key,
        "question_type": recording.question_type,
        "question_index": recording.question_index,
        "question_text": recording.question_text,
        "original_filename": recording.original_filename,
        "content_type": recording.content_type,
        "file_size": recording.file_size,
        "file_url": _recording_public_path(recording.stored_filename),
        "created_at": recording.created_at,
        "updated_at": recording.updated_at,
    }


def build_search_profile(profile, mode: str, location: str | None = None, desired_role: str | None = None):
    resolved_location = (location if location is not None else profile.location) or ""
    if resolved_location.strip().lower() in {"", "remote", "anywhere", "worldwide", "global", "online"} and os.getenv("RAPIDAPI_MARKET", "in").lower() == "in":
        resolved_location = "India"
    resolved_role = desired_role if desired_role is not None else profile.desired_role

    return SimpleNamespace(
        skills=profile.skills or [],
        domain=profile.domain,
        location=resolved_location,
        years_of_experience=getattr(profile, "years_of_experience", 0.0) or 0.0,
        experience_level=profile.experience_level,
        mode=mode,
        desired_role=resolved_role,
        resume_text=getattr(profile, "resume_text", None) or "",
    )


async def _fetch_and_rank_role(s_role, role_info, profile, mode, location):
    s_search_profile = build_search_profile(profile, mode, location=location, desired_role=s_role)
    s_jobs, _, _ = await fetch_jobs_with_status(
        s_search_profile,
        mode_override=mode,
        limit=10,
        query=s_role
    )
    s_ranked = rank_jobs(s_search_profile, s_jobs, top_n=3)
    enriched_s_jobs = []
    for job in s_ranked["jobs"]:
        fraud = analyze_job_posting(job)
        enriched_s_jobs.append({**job, **fraud})
    return {
        "role": s_role,
        "match_score": role_info["match_score"],
        "matched_skills": role_info["matched_skills"],
        "missing_skills": role_info["missing_skills"],
        "opportunities": enriched_s_jobs
    }


async def build_recommendation_bundle(
    profile,
    mode: str,
    query: str | None = None,
    location: str | None = None,
    include_roadmap: bool = False,
) -> dict:
    search_profile = build_search_profile(profile, mode, location=location, desired_role=query)

    jobs, job_feed_status, job_feed_message = await fetch_jobs_with_status(
        search_profile,
        mode_override=mode,
        limit=60,
        query=query,
    )
    ranked = rank_jobs(search_profile, jobs, top_n=10)

    enriched_jobs = []
    for job in ranked["jobs"]:
        fraud = analyze_job_posting(job)
        enriched_jobs.append({**job, **fraud})

    target_role = query or search_profile.desired_role or (
        enriched_jobs[0]["job_title"] if enriched_jobs else f"{search_profile.domain} {mode}"
    )

    company_source_jobs = jobs or enriched_jobs
    top_companies = derive_company_trends(
        company_source_jobs,
        preferred_location=search_profile.location,
        preferred_role=target_role,
        top_n=20,
    )

    dashboard = build_skill_dashboard(search_profile, enriched_jobs)
    roadmap = None
    if include_roadmap:
        top_readiness_score = enriched_jobs[0]["job_readiness_score"] if enriched_jobs else None
        roadmap = generate_learning_roadmap(
            target_role,
            dashboard["missing_skills"],
            search_profile.domain,
            mode,
            current_skills=search_profile.skills,
            experience_level=search_profile.experience_level,
            years_of_experience=search_profile.years_of_experience,
            location=search_profile.location,
            current_readiness_score=top_readiness_score,
            matched_skills=dashboard["matched_skills"],
            trending_skills=ranked["trending_skills"],
        )

    # Suggest roles based on skills and fetch their opportunities concurrently
    user_skills = getattr(profile, "skills", []) or []
    suggested_roles = suggest_roles_by_skills(user_skills, domain=getattr(profile, "domain", None))
    
    tasks = [
        _fetch_and_rank_role(role_info["role"], role_info, profile, mode, location)
        for role_info in suggested_roles
    ]
    skill_based_recommendations = await asyncio.gather(*tasks) if tasks else []

    return {
        "mode": mode,
        "profile_snapshot": {
            "skills": search_profile.skills,
            "domain": search_profile.domain,
            "location": search_profile.location,
            "years_of_experience": search_profile.years_of_experience,
            "experience_level": search_profile.experience_level,
            "desired_role": search_profile.desired_role,
        },
        "job_feed_status": job_feed_status,
        "job_feed_message": job_feed_message,
        "jobs": enriched_jobs,
        "top_companies": top_companies,
        "trending_skills": ranked["trending_skills"],
        "matched_skills": dashboard["matched_skills"],
        "missing_skills": dashboard["missing_skills"],
        "project_suggestions": ranked["project_suggestions"],
        "roadmap": roadmap,
        "gap_chart": dashboard["gap_chart"],
        "family_gaps": dashboard["family_gaps"],
        "quick_win_skills": dashboard["quick_win_skills"],
        "micro_gap_summary": dashboard["micro_gap_summary"],
        "skill_dna_profiles": dashboard.get("skill_dna_profiles", []),
        "skill_based_recommendations": skill_based_recommendations,
    }


async def build_resume_audit_payload(profile, role: str | None = None) -> dict:
    audit_profile = build_search_profile(profile, profile.mode, desired_role=role)
    target_role = role or audit_profile.desired_role or f"{audit_profile.domain} {audit_profile.mode}"
    jobs = await fetch_jobs(audit_profile, mode_override=audit_profile.mode, limit=30, query=target_role)
    return generate_resume_audit(audit_profile, jobs, target_role=target_role)


def _format_short_list(items: list[str] | None, limit: int = 3, fallback: str = "no strong signals yet") -> str:
    cleaned = [str(item).strip() for item in (items or []) if str(item).strip()]
    if not cleaned:
        return fallback
    return ", ".join(cleaned[:limit])


def _pick_best_bookmark(bookmarks: list[models.Bookmark]) -> models.Bookmark | None:
    if not bookmarks:
        return None
    return max(bookmarks, key=lambda item: (float(item.readiness_score or 0), float(item.ai_score or 0)))


def _get_openai_chat_model() -> str:
    return (os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini") or "gpt-4o-mini").strip()


def _normalize_chat_messages(messages: list[schemas.ChatMessage] | None) -> list[dict]:
    normalized: list[dict] = []
    for item in messages or []:
        role = (getattr(item, "role", "") or "").strip().lower()
        text = (getattr(item, "text", "") or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue
        normalized.append({"role": role, "text": text[:4000]})
    return normalized[-6:]


def _build_openai_chat_context(
    question: str,
    profile,
    recommendation_bundle: dict | None = None,
    resume_audit: dict | None = None,
    bookmarks: list[models.Bookmark] | None = None,
) -> dict:
    bundle = recommendation_bundle or {}
    jobs = bundle.get("jobs", [])
    roadmap = bundle.get("roadmap") or {}
    best_bookmark = _pick_best_bookmark(bookmarks or [])

    top_jobs = [
        {
            "title": job.get("job_title"),
            "company": job.get("company_name"),
            "location": job.get("location"),
            "readiness_score": round(float(job.get("job_readiness_score") or 0), 1),
            "ai_match_score": round(float(job.get("ai_score") or 0), 1),
            "matched_skills": (job.get("matched_skills") or [])[:5],
            "missing_skills": (job.get("missing_skills") or [])[:5],
        }
        for job in jobs[:4]
    ]

    bookmark_cards = [
        {
            "title": item.job_title,
            "company": item.company_name,
            "status": item.status,
            "readiness_score": round(float(item.readiness_score or 0), 1),
            "ai_match_score": round(float(item.ai_score or 0), 1),
        }
        for item in (bookmarks or [])[:4]
    ]

    roadmap_summary = {
        "target_role": roadmap.get("target_role"),
        "summary": roadmap.get("summary"),
        "first_stage": roadmap.get("stages", [{}])[0] if roadmap.get("stages") else None,
        "recommended_projects": roadmap.get("recommended_projects", [])[:3],
    }

    resume_summary = None
    if resume_audit:
        resume_summary = {
            "target_role": resume_audit.get("target_role"),
            "overall_score": round(float(resume_audit.get("overall_score") or 0), 1),
            "matched_keywords": (resume_audit.get("matched_keywords") or [])[:8],
            "missing_keywords": (resume_audit.get("missing_keywords") or [])[:8],
            "improvement_tips": (resume_audit.get("improvement_tips") or [])[:4],
            "suggested_summary": resume_audit.get("suggested_summary"),
        }

    return {
        "user_question": question.strip(),
        "profile": {
            "domain": profile.domain,
            "desired_role": profile.desired_role,
            "mode": profile.mode,
            "location": profile.location,
            "experience_level": profile.experience_level,
            "years_of_experience": getattr(profile, "years_of_experience", 0.0) or 0.0,
            "skills": (profile.skills or [])[:12],
        },
        "recommendations": {
            "matched_skills": (bundle.get("matched_skills") or [])[:8],
            "missing_skills": (bundle.get("missing_skills") or [])[:8],
            "trending_skills": (bundle.get("trending_skills") or [])[:8],
            "project_suggestions": [
                {
                    "title": project.get("title"),
                    "level": project.get("level"),
                    "skills": (project.get("skills") or [])[:6],
                }
                for project in (bundle.get("project_suggestions") or [])[:3]
            ],
            "top_jobs": top_jobs,
        },
        "resume_audit": resume_summary,
        "bookmarks": {
            "best_fit": {
                "title": best_bookmark.job_title,
                "company": best_bookmark.company_name,
                "status": best_bookmark.status,
                "readiness_score": round(float(best_bookmark.readiness_score or 0), 1),
                "ai_match_score": round(float(best_bookmark.ai_score or 0), 1),
            }
            if best_bookmark
            else None,
            "recent_saved_jobs": bookmark_cards,
        },
        "roadmap": roadmap_summary,
    }


def get_live_market_context(role: str, question: str) -> str:
    try:
        from duckduckgo_search import DDGS
        query = f"{role} {question} 2026 tech trends jobs"
        results = DDGS().text(query, max_results=3)
        if not results:
            return ""
        context = "LIVE JOB MARKET CONTEXT (DuckDuckGo Search Results):\n"
        for r in results:
            context += f"- {r.get('body', '')}\n"
        return context
    except Exception as exc:
        logger.warning(f"Live market search failed: {exc}")
        return ""


async def generate_openai_chat_response(
    question: str,
    profile,
    messages: list[schemas.ChatMessage] | None = None,
    recommendation_bundle: dict | None = None,
    resume_audit: dict | None = None,
    bookmarks: list[models.Bookmark] | None = None,
) -> tuple[str, str, list[str]]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI chat is not configured yet. Add OPENAI_API_KEY to backend/.env and restart the FastAPI server.",
        )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="OpenAI SDK is not installed. Run pip install -r backend/requirements.txt and restart the FastAPI server.",
        ) from exc

    model = _get_openai_chat_model()
    context_payload = _build_openai_chat_context(
        question,
        profile,
        recommendation_bundle=recommendation_bundle,
        resume_audit=resume_audit,
        bookmarks=bookmarks,
    )
    history = _normalize_chat_messages(messages)
    # Detect Mock Interview Mode
    is_interview_mode = False
    if "start mock interview" in question.lower():
        is_interview_mode = True
    else:
        for msg in reversed(history):
            text_lower = msg["text"].lower()
            if "end interview" in text_lower or "stop interview" in text_lower or "exit interview" in text_lower:
                is_interview_mode = False
                break
            if "start mock interview" in text_lower:
                is_interview_mode = True
                break

    if is_interview_mode:
        system_prompt = (
            f"You are a strict Senior Hiring Manager interviewing the user for a {profile.desired_role or 'Tech'} position. "
            "Follow these rules exactly:\n"
            "1. Ask ONE interview question at a time. Alternate between technical and behavioral.\n"
            "2. Wait for the user's answer.\n"
            "3. Grade their previous answer out of 10, provide 1 sentence of critical feedback, and then ask the NEXT question.\n"
            "4. Do NOT break character. Be professional, slightly demanding, but constructive.\n"
            "5. If they say 'end interview', summarize their overall performance."
        )
    else:
        system_prompt = (
            "You are an OpenAI-powered career mentor inside a job-search platform. "
            "Answer using only the provided user context when possible, and be specific to that context. "
            "If data is missing, say what is missing instead of inventing details. "
            "Keep answers practical, encouraging, and concise. "
            "For resume-bullet rewrites, return 3 strong versions plus 1 short metric tip. "
            "For role-fit or saved-job questions, compare the concrete jobs in context. "
            "For skills or roadmap questions, prioritize the highest-impact next steps. "
            "When the user asks for learning platforms, suggest only the single most required platform or resource for each highest-priority skill gap; do not list every platform.\n"
            "CRITICAL: If you generate a full Cover Letter or a tailored Resume for the user, wrap the document content in special tags so the frontend can generate a PDF. Format exactly like this: [DOCUMENT: Cover Letter] (Document text here) [/DOCUMENT]. Do not use markdown code blocks for the document itself inside the tags."
        )

    live_context = await asyncio.to_thread(get_live_market_context, profile.desired_role or "Software Engineer", question)
    if live_context:
        system_prompt += f"\n\n{live_context}\nIMPORTANT: Explicitly integrate the live market context above into your answer to provide grounded, up-to-date reality checks."

    q_lower = question.lower()
    if any(kw in q_lower for kw in ["apply", "openings", "hire", "find jobs", "what jobs"]):
        try:
            from job_api import fetch_jobs
            live_jobs = await fetch_jobs(profile, limit=3)
            if live_jobs:
                jobs_context = "LIVE OPEN JOBS FOR USER (Fetched right now):\n"
                for i, job in enumerate(live_jobs[:3], 1):
                    jobs_context += f"Job {i}: {job.get('job_title', job.get('title'))} at {job.get('company_name')}\n"
                    jobs_context += f"Description Snippet: {str(job.get('description', ''))[:300]}...\n\n"
                system_prompt += f"\n\n{jobs_context}\nIMPORTANT INSTRUCTION: The user wants actionable job recommendations. Analyze these real open jobs against their resume. Provide a match analysis and write a custom cover letter paragraph explaining how their experience fits one of these real roles."
        except Exception as exc:
            logger.warning(f"Live job fetch failed: {exc}")

    input_messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "system",
            "content": (
                "User career context:\n"
                f"{json.dumps(context_payload, ensure_ascii=True, indent=2)}"
            ),
},
    ]
    for _idx, item in enumerate(history):
        input_messages.append({"role": item["role"], "content": item["text"]})
    input_messages.append({"role": "user", "content": question.strip()})

    def _run_openai_request() -> str:
        client = OpenAI(api_key=api_key, timeout=45.0)
        response = client.chat.completions.create(
            model=model,
            messages=input_messages,
        )
        return (response.choices[0].message.content or "").strip()

    try:
        answer = await asyncio.to_thread(_run_openai_request)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("OpenAI chat request failed: %s", exc)
        error_text = str(exc).lower()
        if exc.__class__.__name__ == "RateLimitError" or "rate limit" in error_text or "rate_limit" in error_text:
            fallback_answer = generate_chat_response(
                question,
                profile,
                recommendation_bundle=recommendation_bundle,
                resume_audit=resume_audit,
                bookmarks=bookmarks,
            )
            suggestions = _generate_suggestions(question, profile, recommendation_bundle)
            return fallback_answer, "local-fallback", suggestions
        raise HTTPException(status_code=502, detail="OpenAI could not generate a response right now.") from exc

    if not answer:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response. Please try again.")

    # Generate smart follow-up suggestions based on the question topic
    suggestions = _generate_suggestions(question, profile, recommendation_bundle)
    
    return answer, model, suggestions


def _generate_suggestions(question: str, profile, recommendation_bundle: dict | None = None) -> list[str]:
    """Generate intelligent follow-up suggestions based on the conversation context."""
    question_lower = question.lower()
    suggestions = []
    bundle = recommendation_bundle or {}
    role = profile.desired_role or f"{profile.domain} {profile.mode}"
    
    if any(term in question_lower for term in ("skill", "learn", "gap", "missing")):
        suggestions = [
            "Create my learning roadmap",
            "What projects can I build?",
            "Which company hires for these skills?",
        ]
    elif any(term in question_lower for term in ("resume", "ats", "summary", "bullet")):
        suggestions = [
            "Check my resume score",
            "How to improve my keywords?",
            "Which skills are missing?",
        ]
    elif any(term in question_lower for term in ("interview", "prepare")):
        suggestions = [
            "Give me practice questions",
            "Tell me about my best project story",
            "How to answer weakness questions?",
        ]
    elif any(term in question_lower for term in ("job", "role", "career", "target", "fit")):
        suggestions = [
            "Show my top job matches",
            "What skills do I need?",
            "Create my roadmap",
        ]
    elif any(term in question_lower for term in ("bookmark", "saved")):
        suggestions = [
            "Compare my saved jobs",
            "What should I apply to?",
            "Show recommendations",
        ]
    else:
        suggestions = [
            f"What skills for {role}?",
            "Show my roadmap",
            "Improve my resume",
        ]
    
    # Add resume suggestion if user hasn't uploaded one
    if not profile.resume_text and "resume" not in suggestions:
        suggestions.append("Upload my resume")
    
    return suggestions[:3]


ROLE_REWRITE_GUIDES = {
    "internship": {
        "label": "Internship",
        "priority_keywords": ["projects", "teamwork", "problem solving"],
        "versions": [
            (
                "Version 1 - internship-ready ATS style",
                "- Built {base_phrase}, demonstrating hands-on experience with practical project work aligned to {target_label} expectations.",
            ),
            (
                "Version 2 - learning and ownership focus",
                "- Developed {base_phrase}, showing initiative, fast learning, and end-to-end ownership across the workflow.",
            ),
            (
                "Version 3 - recruiter-friendly with metrics placeholder",
                "- Delivered {base_phrase}, helping achieve [quantified result] through [feature, automation, or project contribution] in an internship-style setting.",
            ),
        ],
    },
    "backend": {
        "label": "Backend",
        "priority_keywords": ["fastapi", "api", "sql"],
        "versions": [
            (
                "Version 1 - backend ATS style",
                "- Built {base_phrase}, strengthening API, service-layer, and data workflow execution aligned to {target_label} role expectations.",
            ),
            (
                "Version 2 - system ownership focus",
                "- Developed {base_phrase}, improving backend reliability, data handling, and end-to-end server-side ownership across the workflow.",
            ),
            (
                "Version 3 - recruiter-friendly with metrics placeholder",
                "- Delivered {base_phrase}, helping support [requests, users, or workflows] through [API, auth, database, or automation] improvements.",
            ),
        ],
    },
    "frontend": {
        "label": "Frontend",
        "priority_keywords": ["react", "javascript", "ui/ux"],
        "versions": [
            (
                "Version 1 - frontend ATS style",
                "- Built {base_phrase}, creating a cleaner, more responsive user experience aligned to {target_label} role expectations.",
            ),
            (
                "Version 2 - UI and component focus",
                "- Developed {base_phrase}, improving reusable UI structure, interaction flow, and overall product usability across the experience.",
            ),
            (
                "Version 3 - recruiter-friendly with metrics placeholder",
                "- Delivered {base_phrase}, helping improve [engagement, usability, or completion rate] through [UI redesign, components, or frontend optimization].",
            ),
        ],
    },
    "data_analyst": {
        "label": "Data Analyst",
        "priority_keywords": ["sql", "excel", "data analysis"],
        "versions": [
            (
                "Version 1 - data analyst ATS style",
                "- Built {base_phrase}, turning raw information into clearer analysis, reporting, or dashboard-ready outputs aligned to {target_label} work.",
            ),
            (
                "Version 2 - insight and KPI focus",
                "- Developed {base_phrase}, improving data cleaning, KPI tracking, and decision-ready insight generation across the workflow.",
            ),
            (
                "Version 3 - recruiter-friendly with metrics placeholder",
                "- Delivered {base_phrase}, helping improve [reporting accuracy, time saved, or business insight] through [SQL, dashboarding, or analytical workflow] improvements.",
            ),
        ],
    },
    "general": {
        "label": "Target Role",
        "priority_keywords": [],
        "versions": [
            (
                "Version 1 - concise ATS style",
                "- Built {base_phrase}, improving the project with a clearer end-to-end workflow aligned to {target_label} requirements.",
            ),
            (
                "Version 2 - impact-focused",
                "- Developed {base_phrase}, strengthening product quality, technical ownership, and role-relevant execution across the full workflow.",
            ),
            (
                "Version 3 - recruiter-friendly with metrics placeholder",
                "- Delivered {base_phrase}, helping achieve [quantified result] through [specific feature, automation, or optimization].",
            ),
        ],
    },
}


def _extract_resume_bullet_text(question: str) -> str:
    prompt = (question or "").strip()
    if not prompt:
        return ""

    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', prompt)
    for pair in quoted:
        candidate = next((item for item in pair if item), "").strip()
        if len(candidate.split()) >= 4:
            return candidate

    separators = [":", "\n"]
    for separator in separators:
        if separator in prompt:
            candidate = prompt.split(separator, 1)[1].strip()
            candidate = re.sub(r"^[\-\*\u2022]+\s*", "", candidate)
            if len(candidate.split()) >= 4:
                return candidate

    cleaned = re.sub(
        r"(?i)\b(rewrite|improve|make|convert|turn)\b.*?\b(bullet|resume bullet|project bullet)\b",
        "",
        prompt,
    ).strip(" -:.")
    return cleaned if len(cleaned.split()) >= 4 else ""


def _resolve_rewrite_target(question: str, fallback_role: str | None = None) -> tuple[str, str]:
    question_lower = (question or "").lower()
    fallback_lower = (fallback_role or "").lower()
    combined = f"{question_lower} {fallback_lower}".strip()

    if "data analyst" in combined or ("data" in combined and "analyst" in combined):
        return "Data Analyst", "data_analyst"
    if "frontend" in combined or "front-end" in combined or "front end" in combined:
        return "Frontend", "frontend"
    if "backend" in combined or "back-end" in combined or "back end" in combined:
        return "Backend", "backend"
    if "internship" in combined or "intern role" in combined or re.search(r"\bintern\b", combined):
        return "Internship", "internship"

    target_label = (fallback_role or "your target role").strip().title()
    return target_label, "general"


def _rewrite_resume_bullet(
    raw_bullet: str,
    question: str,
    role: str,
    matched_skills: list[str] | None = None,
    missing_skills: list[str] | None = None,
    resume_audit: dict | None = None,
) -> str:
    clean = re.sub(r"^[\-\*\u2022]+\s*", "", (raw_bullet or "").strip())
    clean = re.sub(r"\s+", " ", clean).strip().rstrip(".")
    if len(clean.split()) < 4:
        return (
            "Paste the rough bullet after a colon so I can rewrite it.\n\n"
            "Example:\nRewrite this resume bullet: Built a career guidance web app using React and FastAPI for students."
        )

    base_phrase = re.sub(
        r"(?i)^(built|developed|created|designed|implemented|delivered|made|worked on|led|engineered)\s+",
        "",
        clean,
    ).strip()
    if not base_phrase:
        base_phrase = clean

    target_label, target_track = _resolve_rewrite_target(question, role)
    rewrite_guide = ROLE_REWRITE_GUIDES.get(target_track, ROLE_REWRITE_GUIDES["general"])

    focus_keywords: list[str] = []
    for item in rewrite_guide.get("priority_keywords", []):
        if item not in focus_keywords:
            focus_keywords.append(item)
    for item in (matched_skills or [])[:2]:
        if item not in focus_keywords:
            focus_keywords.append(item)
    for item in (resume_audit or {}).get("missing_keywords", [])[:2]:
        if item not in focus_keywords:
            focus_keywords.append(item)
    for item in (missing_skills or [])[:1]:
        if item not in focus_keywords:
            focus_keywords.append(item)

    keyword_line = ""
    if focus_keywords:
        keyword_line = f"Try to keep or truthfully add keywords like {_format_short_list(focus_keywords, limit=3)} if they match the work you actually did.\n\n"

    version_blocks: list[str] = []
    for heading, template in rewrite_guide["versions"]:
        version_blocks.append(
            f"{heading}\n"
            f"{template.format(base_phrase=base_phrase, target_label=target_label)}"
        )

    return (
        f"Here are stronger resume-ready versions for {target_label} roles.\n\n"
        f"Original:\n- {clean}\n\n"
        f"{keyword_line}"
        f"{'\n\n'.join(version_blocks)}\n\n"
        "Make it even stronger by replacing the placeholder with a number like users, accuracy, response time, projects completed, or time saved."
    )


def generate_chat_response(
    question: str,
    profile,
    recommendation_bundle: dict | None = None,
    resume_audit: dict | None = None,
    bookmarks: list[models.Bookmark] | None = None,
) -> str:
    question_lower = question.lower()
    role = profile.desired_role or f"{profile.domain} {profile.mode}"
    skills = _format_short_list(profile.skills, limit=6, fallback="your current skills")
    jobs = (recommendation_bundle or {}).get("jobs", [])
    top_job = jobs[0] if jobs else None
    missing_skills = (recommendation_bundle or {}).get("missing_skills", [])
    matched_skills = (recommendation_bundle or {}).get("matched_skills", [])
    trending_skills = (recommendation_bundle or {}).get("trending_skills", [])
    roadmap = (recommendation_bundle or {}).get("roadmap")
    project_suggestions = (recommendation_bundle or {}).get("project_suggestions", [])
    best_bookmark = _pick_best_bookmark(bookmarks or [])

    if any(term in question_lower for term in ("rewrite", "resume bullet", "project bullet", "bullet point", "bullet")):
        bullet_text = _extract_resume_bullet_text(question)
        return _rewrite_resume_bullet(
            bullet_text,
            question,
            role,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            resume_audit=resume_audit,
        )

    if any(term in question_lower for term in ("resume", "ats", "summary", "cv")):
        if not resume_audit:
            return (
                f"I can help with resume coaching for {role.title()}, but I need resume content first. "
                "Upload your PDF on the Resume page so I can score it and suggest role-specific improvements."
            )

        return (
            f"Your current ATS score for {resume_audit['target_role'].title()} is {round(resume_audit['overall_score'])}/100.\n\n"
            f"Strong coverage: {_format_short_list(resume_audit.get('matched_keywords'), fallback='none yet')}.\n"
            f"Missing market keywords: {_format_short_list(resume_audit.get('missing_keywords'), fallback='no major gaps')}.\n"
            f"Best next fixes: {_format_short_list(resume_audit.get('improvement_tips'), limit=2)}.\n\n"
            f"Suggested summary:\n{resume_audit['suggested_summary']}"
        )

    if any(term in question_lower for term in ("skill", "learn", "gap", "missing", "improve")):
        first_stage = roadmap["stages"][0] if roadmap and roadmap.get("stages") else None
        roadmap_line = ""
        if first_stage:
            roadmap_line = f"Your first roadmap stage is {first_stage['days']}: {_format_short_list(first_stage['focus'], limit=4)}.\n"
        project_line = f"Best project to make this visible: {project_suggestions[0]['title']}." if project_suggestions else ""
        return (
            f"For {role.title()}, your highest-impact skills to focus on next are {_format_short_list(missing_skills)}.\n\n"
            f"Skills you already have working for you: {_format_short_list(matched_skills)}.\n"
            f"Skills showing up repeatedly in the market: {_format_short_list(trending_skills)}.\n"
            f"{roadmap_line}"
            f"{project_line}"
        ).strip()

    if any(term in question_lower for term in ("interview", "prepare", "question", "hr round", "technical round")):
        interview_pack = generate_interview_pack(role, profile.skills or [], profile.experience_level)
        return (
            f"For {role.title()}, prepare around these technical areas: {_format_short_list(interview_pack['technical_questions'], limit=2)}.\n"
            f"HR focus: {_format_short_list(interview_pack['hr_questions'], limit=2)}.\n"
            f"Preparation tips: {_format_short_list(interview_pack['preparation_tips'], limit=3)}.\n\n"
            f"Use your strongest project to explain the problem, stack, decisions, and measurable outcome end to end."
        )

    if any(term in question_lower for term in ("bookmark", "saved job", "saved jobs", "best job", "best fit")):
        if not best_bookmark:
            if top_job:
                return (
                    f"You have not saved any jobs yet. Right now the best live match looks like {top_job['job_title']} at "
                    f"{top_job.get('company_name') or 'the top-ranked company'} with a readiness score of {round(top_job['job_readiness_score'])}/100.\n\n"
                    "Save 2-3 strong matches first, then I can help compare them."
                )
            return "You have not saved any jobs yet. Save a few roles from Recommendations and I can help compare the best fit."

        return (
            f"Your strongest saved job right now is {best_bookmark.job_title} at {best_bookmark.company_name or 'the saved company'}.\n"
            f"Readiness score: {round(best_bookmark.readiness_score)}. AI match score: {round(best_bookmark.ai_score)}. Current status: {best_bookmark.status}.\n\n"
            "If you want to move faster, tailor your resume toward this one role and prepare interview stories that match its most relevant skills."
        )

    if any(term in question_lower for term in ("why am i not", "why not", "not matching", "why")):
        audit_line = ""
        if resume_audit:
            audit_line = (
                f"ATS gaps from your resume audit: "
                f"{_format_short_list(resume_audit.get('missing_keywords'), fallback='no major ATS gaps')}.\n"
            )
        return (
            f"The biggest reasons you are not matching {role.title()} roles more strongly are usually missing keywords and missing proof.\n\n"
            f"Top skill gaps from your recommendations: {_format_short_list(missing_skills)}.\n"
            f"{audit_line}"
            "Next move: add one project or experience bullet that proves one of those missing skills instead of only listing it."
        )

    if any(term in question_lower for term in ("career", "suits me", "role", "target")):
        if top_job:
            return (
                f"Based on your {profile.domain} focus, {profile.experience_level} level, and skills in {skills}, "
                f"your current strongest direction is {role.title()}.\n\n"
                f"Top live match: {top_job['job_title']} at {top_job.get('company_name') or 'a top company'} "
                f"with readiness {round(top_job['job_readiness_score'])}/100.\n"
                f"Why it fits: matched skills in {_format_short_list(top_job.get('matched_skills'), fallback='your current stack')}.\n"
                f"To improve faster, close gaps in {_format_short_list(top_job.get('missing_skills'))}."
            )
        return (
            f"Based on your {profile.domain} focus, {profile.experience_level} level, and skills in {skills}, "
            f"a strong next step is targeting {role.title()} opportunities and building one portfolio project around your missing skills."
        )

    next_project = project_suggestions[0]["title"] if project_suggestions else "one focused portfolio project"
    return (
        f"Your next best move is to keep targeting {role.title()}, strengthen {_format_short_list(missing_skills)}, "
        f"and turn that work into {next_project}.\n\n"
        f"If you want, ask me about resume fixes, interview prep, skill priorities, or which saved job is your best fit."
    )


# ---------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "AI Smart Career Guidance backend is running."}


# ---------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------
@app.post("/auth/signup", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/auth/replace-account", response_model=schemas.AuthResponse)
def replace_account(payload: schemas.UserReplaceRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.current_password)
    if not user:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
        raise HTTPException(status_code=404, detail="No account found for this email.")

    db.delete(user)
    db.flush()

    recreated_user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.new_password),
    )
    db.add(recreated_user)
    db.commit()
    db.refresh(recreated_user)

    token = create_access_token({"sub": recreated_user.email})
    return {"access_token": token, "token_type": "bearer", "user": recreated_user}


# ---------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------
@app.post("/profile/create", response_model=schemas.ProfileOut)
def create_or_update_profile(
    payload: schemas.ProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    skills = normalize_skills(payload.skills)

    if profile:
        profile.skills = skills
        profile.domain = payload.domain
        profile.location = payload.location
        profile.years_of_experience = payload.years_of_experience
        profile.experience_level = payload.experience_level
        profile.mode = payload.mode
        profile.desired_role = payload.desired_role
        if payload.resume_text is not None:
            profile.resume_text = payload.resume_text
    else:
        profile = models.Profile(
            user_id=current_user.id,
            skills=skills,
            domain=payload.domain,
            location=payload.location,
            years_of_experience=payload.years_of_experience,
            experience_level=payload.experience_level,
            mode=payload.mode,
            desired_role=payload.desired_role,
            resume_text=payload.resume_text,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/profile/view", response_model=schemas.ProfileOut)
def view_profile(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_profile_or_404(db, current_user.id)
    
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    today_str = today.isoformat()
    
    # Check week start (Monday)
    current_week_start = today - timedelta(days=today.weekday())
    current_week_start_str = current_week_start.isoformat()
    
    if profile.week_start_date != current_week_start_str:
        profile.weekly_applications = 0
        profile.weekly_mock_interviews = 0
        profile.week_start_date = current_week_start_str
        
    # Check streak
    if profile.last_active_date:
        last_active = datetime.strptime(profile.last_active_date, "%Y-%m-%d").date()
        if last_active == today - timedelta(days=1):
            profile.current_streak += 1
            if profile.current_streak > profile.highest_streak:
                profile.highest_streak = profile.current_streak
        elif last_active < today - timedelta(days=1):
            profile.current_streak = 1
    else:
        profile.current_streak = 1
        
    if profile.last_active_date != today_str:
        profile.last_active_date = today_str
        
    db.commit()
    db.refresh(profile)
    
    return profile


# ---------------------------------------------------------------------
# Resume Upload
# ---------------------------------------------------------------------
@app.post("/resume/upload", response_model=schemas.ResumeUploadResponse)
async def upload_resume(
    file: UploadFile | None = File(default=None),
    resume: UploadFile | None = File(default=None),
    linkedin_pdf: UploadFile | None = File(default=None),
    certificates: list[UploadFile] | None = File(default=None),
    auto_fill: bool = Query(default=True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uploads: list[tuple[str, UploadFile | None]] = [
        ("resume", resume or file),
        ("linkedin", linkedin_pdf),
    ]
    uploads.extend(("certificate", item) for item in (certificates or []))

    valid_uploads = [(document_type, upload) for document_type, upload in uploads if upload is not None]
    if not valid_uploads:
        raise HTTPException(status_code=400, detail="Upload at least one PDF: resume, LinkedIn PDF, or certificate.")

    document_payloads: list[dict] = []
    for document_type, upload in valid_uploads:
        if not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported for resume, LinkedIn, and certificate uploads.")
        content = await upload.read()
        document_payloads.append(
            {
                "document_type": document_type,
                "filename": upload.filename,
                "bytes": content,
            }
        )

    analysis = analyze_documents(document_payloads)
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    merged_skills = sorted(set((profile.skills or []) if profile else []) | set(analysis["skills"]))

    audit_profile = SimpleNamespace(
        skills=merged_skills or analysis["skills"],
        domain=(profile.domain if profile else "") or analysis["suggested_domain"],
        location=profile.location if profile else "",
        years_of_experience=max(profile.years_of_experience if profile else 0.0, analysis["years_of_experience"]),
        experience_level=profile.experience_level if profile else analysis["experience_level"],
        mode=profile.mode if profile else "internship",
        desired_role=(profile.desired_role if profile else "") or analysis["target_role"],
        resume_text=analysis["text"][:12000],
        full_name=current_user.full_name,
    )
    resume_audit = await build_resume_audit_payload(audit_profile)

    target_role_for_fit = (profile.desired_role if profile else "") or analysis["target_role"]
    role_tokens = _tokenize_resume_role(target_role_for_fit) if target_role_for_fit else []

    enriched_documents = []
    for doc in analysis["documents"]:
        doc_skills = doc.get("extracted_skills", [])
        if target_role_for_fit:
            normalized_skills = normalize_skills(doc_skills)
            matched_tokens = []
            for token in role_tokens:
                if any(token in skill for skill in normalized_skills):
                    matched_tokens.append(token)
            
            fit_score = round(5 + ((len(matched_tokens) / max(len(role_tokens), 1)) * 95), 2) if role_tokens else 5.0
            
            doc["fit_check"] = {
                "score": min(fit_score, 100.0),
                "matched_tokens": matched_tokens
            }
        enriched_documents.append(doc)

    auto_filled_profile = {
        "skills": analysis["skills"],
        "tools": analysis["tools"],
        "projects": analysis["projects"],
        "experience_highlights": analysis["experience_highlights"],
        "certificates": analysis["certificates"],
        "domain": (profile.domain if profile else "") or analysis["suggested_domain"],
        "location": profile.location if profile else "",
        "years_of_experience": max(profile.years_of_experience if profile else 0.0, analysis["years_of_experience"]),
        "experience_level": profile.experience_level if profile else analysis["experience_level"],
        "mode": profile.mode if profile else "internship",
        "desired_role": (profile.desired_role if profile else "") or analysis["target_role"],
        "resume_text": analysis["text"][:12000],
    }

    if profile and auto_fill:
        profile.skills = merged_skills
        profile.resume_text = analysis["text"][:12000]
        profile.years_of_experience = max(float(profile.years_of_experience or 0.0), float(analysis["years_of_experience"]))
        if not (profile.domain or "").strip() and analysis["suggested_domain"]:
            profile.domain = analysis["suggested_domain"]
        if not (profile.desired_role or "").strip() and analysis["target_role"]:
            profile.desired_role = analysis["target_role"]
        db.commit()

    return {
        "extracted_text_preview": analysis["text"][:1200],
        "extracted_skills": analysis["skills"],
        "auto_filled_profile": auto_filled_profile,
        "structured_profile": {
            "skills": analysis["skills"],
            "tools": analysis["tools"],
            "projects": analysis["projects"],
            "experience_highlights": analysis["experience_highlights"],
            "certificates": analysis["certificates"],
            "years_of_experience": analysis["years_of_experience"],
            "experience_level": analysis["experience_level"],
            "suggested_domain": analysis["suggested_domain"],
            "source_documents": [item["filename"] for item in analysis["documents"]],
        },
        "documents": enriched_documents,
        "resume_audit": resume_audit,
    }


@app.get("/resume/audit", response_model=schemas.ResumeAuditResponse)
async def resume_audit(
    role: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    if not (profile.resume_text or profile.skills):
        raise HTTPException(status_code=400, detail="Upload a resume first to generate an ATS audit.")

    return await build_resume_audit_payload(profile, role)


# ---------------------------------------------------------------------
# Normal Job Recommendations
# ---------------------------------------------------------------------
@app.get("/recommend/jobs", response_model=schemas.RecommendationResponse)
async def recommend_jobs(
    query: str | None = None,
    location: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    return await build_recommendation_bundle(profile, "job", query, location=location)


@app.get("/recommend/internships", response_model=schemas.RecommendationResponse)
async def recommend_internships(
    query: str | None = None,
    location: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    return await build_recommendation_bundle(profile, "internship", query, location=location)


# ---------------------------------------------------------------------
# Semantic Recommendations (FAISS + SentenceTransformer)
# ---------------------------------------------------------------------
@app.get("/recommend/semantic-jobs", response_model=schemas.SemanticRecommendResponse)
async def recommend_semantic_jobs(
    top_k: int = Query(20, ge=1, le=100),
    location: Optional[str] = Query(None),
    remote_only: bool = Query(False),
    min_match: float = Query(0.3, ge=0.0, le=1.0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)

    user_id = str(current_user.id)
    cache_key = f"semantic:{user_id}:{top_k}:{location}:{remote_only}:{min_match}"

    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            return schemas.SemanticRecommendResponse.model_validate_json(cached)

    user_text = ", ".join(profile.skills or [])
    jobs = app.state.recommender.recommend(
        user_text=user_text,
        top_k=top_k,
        location=location,
        remote_only=remote_only,
        user_skills=profile.skills or [],
    )

    filtered_jobs = []
    for job in jobs:
        score = job.get("match_score", 0.0)
        if score >= min_match:
            filtered_jobs.append(job)

    response = schemas.SemanticRecommendResponse(
        user_id=user_id,
        total=len(filtered_jobs),
        jobs=filtered_jobs,
        generated_at=time.time(),
    )

    if redis_client:
        redis_client.setex(cache_key, 600, response.model_dump_json())

    return response


# ---------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------
@app.post("/feedback")
async def record_feedback(
    event: schemas.FeedbackEvent,
    current_user: models.User = Depends(get_current_user),
):
    if str(current_user.id) != event.user_id:
        raise HTTPException(status_code=403, detail="User ID mismatch.")

    payload = json.dumps({"action": event.action, "ts": time.time()})

    if redis_client:
        key = f"feedback:{event.user_id}:{event.job_id}"
        redis_client.lpush(key, payload)
    else:
        _feedback_store = getattr(record_feedback, "_store", [])
        _feedback_store.append({"user_id": event.user_id, "job_id": event.job_id, "data": payload})
        record_feedback._store = _feedback_store

    return {"status": "ok"}


# ---------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------
@app.get("/dashboard/skills", response_model=schemas.DashboardResponse)
async def skill_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    bundle = await build_recommendation_bundle(profile, profile.mode)
    return {
        "matched_skills": bundle["matched_skills"],
        "missing_skills": bundle["missing_skills"],
        "trending_skills": bundle["trending_skills"],
        "gap_chart": bundle["gap_chart"],
        "family_gaps": bundle.get("family_gaps", []),
        "quick_win_skills": bundle.get("quick_win_skills", []),
        "micro_gap_summary": bundle.get("micro_gap_summary", {}),
        "skill_dna_profiles": bundle.get("skill_dna_profiles", []),
    }


# ---------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------
@app.get("/roadmap/generate", response_model=schemas.RoadmapResponse)
async def roadmap(
    role: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    bundle = await build_recommendation_bundle(profile, profile.mode, role, include_roadmap=True)
    return bundle["roadmap"]


# Helper to get or create roadmap progress
def get_or_create_progress(db: Session, user_id: int) -> models.UserRoadmapProgress:
    progress = db.query(models.UserRoadmapProgress).filter(models.UserRoadmapProgress.user_id == user_id).first()
    if not progress:
        progress = models.UserRoadmapProgress(
            user_id=user_id,
            completed_milestones=[],
            projects={},
            learning_resources={},
            weekly_goals=[
                {
                    "week": 1,
                    "goals": [
                        {"id": "w1-1", "title": "Review core documentation and roadmap focus areas", "type": "learning", "done": False},
                        {"id": "w1-2", "title": "Initialize a GitHub repository for your practice portfolio", "type": "coding", "done": False},
                        {"id": "w1-3", "title": "Update your resume summary with target role keywords", "type": "resume", "done": False},
                        {"id": "w1-4", "title": "Rehearse 3 behavioral/HR questions", "type": "interview", "done": False},
                        {"id": "w1-5", "title": "Commit your first learning script to GitHub", "type": "github", "done": False}
                    ]
                },
                {
                    "week": 2,
                    "goals": [
                        {"id": "w2-1", "title": "Complete introductory courses/videos for missing skills", "type": "learning", "done": False},
                        {"id": "w2-2", "title": "Implement basic CRUD routing logic or component structure", "type": "coding", "done": False},
                        {"id": "w2-3", "title": "Add technical skill tags to your resume profile draft", "type": "resume", "done": False},
                        {"id": "w2-4", "title": "Rehearse 3 technical coding challenge questions", "type": "interview", "done": False},
                        {"id": "w2-5", "title": "Push project structure and dependencies to GitHub", "type": "github", "done": False}
                    ]
                }
            ],
            achievements=[],
            interview_practice={
                "technical_score": 0.0,
                "hr_score": 0.0,
                "confidence_score": 0.0,
                "response_time": 0.0,
                "questions_count": 0,
                "correct_count": 0,
                "history": []
            },
            daily_mentor={},
            learning_streak=0,
            last_active_date=None
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress

def check_achievements(progress: models.UserRoadmapProgress, db: Session):
    badges = set(progress.achievements or [])
    if len(progress.completed_milestones) >= 1:
        badges.add("First Milestone")
    if any(p.get("status") == "Completed" for p in progress.projects.values()):
        badges.add("First Project")
    if len(progress.completed_milestones) >= 5:
        badges.add("Roadmap Completed")
    if sum(1 for p in progress.projects.values() if p.get("status") == "Completed") >= 2:
        badges.add("Portfolio Ready")
    
    practice = progress.interview_practice or {}
    if practice.get("technical_score", 0.0) >= 80 or practice.get("hr_score", 0.0) >= 80:
        badges.add("Interview Ready")
        
    profile = db.query(models.Profile).filter(models.Profile.user_id == progress.user_id).first()
    if profile:
        badges.add("Resume Improved")
        if profile.years_of_experience > 0:
            badges.add("Portfolio Ready")
            
    progress.achievements = list(badges)
    db.commit()

@app.get("/roadmap/progress", response_model=schemas.RoadmapProgressOut)
def get_roadmap_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    return progress

@app.post("/roadmap/update-milestone", response_model=schemas.RoadmapProgressOut)
def update_milestone(
    payload: schemas.MilestoneUpdatePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    cm = set(progress.completed_milestones or [])
    if payload.completed:
        cm.add(payload.step_id)
    else:
        cm.discard(payload.step_id)
    progress.completed_milestones = list(cm)
    db.commit()
    check_achievements(progress, db)
    return progress

@app.post("/roadmap/update-project", response_model=schemas.RoadmapProgressOut)
def update_project(
    payload: schemas.ProjectUpdatePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    projects_dict = dict(progress.projects or {})
    projects_dict[payload.project_id] = {
        "status": payload.status,
        "repo": payload.repo or "",
        "demo": payload.demo or "",
        "notes": payload.notes or "",
        "completed_date": payload.completed_date or ""
    }
    progress.projects = projects_dict
    db.commit()
    check_achievements(progress, db)
    return progress

@app.post("/roadmap/update-resource", response_model=schemas.RoadmapProgressOut)
def update_resource(
    payload: schemas.ResourceUpdatePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    resources_dict = dict(progress.learning_resources or {})
    resources_dict[payload.resource_id] = {
        "started_date": payload.started_date or "",
        "completed_date": payload.completed_date or "",
        "time_spent": payload.time_spent,
        "percent": payload.percent
    }
    progress.learning_resources = resources_dict
    if payload.percent >= 100:
        progress.learning_streak += 1
    db.commit()
    check_achievements(progress, db)
    return progress


@app.post("/roadmap/update-weekly-goals", response_model=schemas.RoadmapProgressOut)
def update_weekly_goals(
    payload: list,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    progress.weekly_goals = payload
    db.commit()
    return progress


@app.post("/roadmap/save-practice", response_model=schemas.RoadmapProgressOut)
def save_practice(
    payload: schemas.PracticeSavePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    practice = dict(progress.interview_practice or {})
    practice["technical_score"] = payload.technical_score
    practice["hr_score"] = payload.hr_score
    practice["confidence_score"] = payload.confidence_score
    practice["response_time"] = payload.response_time
    practice["questions_count"] = practice.get("questions_count", 0) + payload.questions_count
    practice["correct_count"] = practice.get("correct_count", 0) + payload.correct_count
    
    history = list(practice.get("history", []))
    history.append({
        "timestamp": datetime.utcnow().isoformat(),
        "technical_score": payload.technical_score,
        "hr_score": payload.hr_score,
        "confidence_score": payload.confidence_score,
        "response_time": payload.response_time
    })
    practice["history"] = history
    progress.interview_practice = practice
    db.commit()
    check_achievements(progress, db)
    return progress

@app.get("/roadmap/analytics")
def get_roadmap_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    return progress.interview_practice or {}

@app.get("/roadmap/achievements", response_model=schemas.AchievementOut)
def get_roadmap_achievements(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    return schemas.AchievementOut(badges=progress.achievements or [])

@app.get("/roadmap/company-recommendations", response_model=list[schemas.CompanyReadinessOut])
def company_recommendations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    desired_role = profile.desired_role if profile else "Developer"
    role_lower = desired_role.lower()
    if "fullstack" in role_lower or "full stack" in role_lower:
        companies = [
            {"company_name": "Stripe", "match_percentage": 92.0, "required_skills": ["React", "Node.js", "APIs"], "missing_skills": ["TypeScript"], "expected_salary": "$135k - $160k", "hiring_trend": "Growing rapidly", "learning_priority": "High"},
            {"company_name": "Canva", "match_percentage": 88.0, "required_skills": ["React", "CSS", "Vanilla JS"], "missing_skills": ["Figma"], "expected_salary": "$120k - $145k", "hiring_trend": "Active hiring", "learning_priority": "Medium"}
        ]
    elif "backend" in role_lower:
        companies = [
            {"company_name": "HashiCorp", "match_percentage": 90.0, "required_skills": ["FastAPI", "Docker", "PostgreSQL"], "missing_skills": ["Kubernetes"], "expected_salary": "$140k - $170k", "hiring_trend": "Highly competitive", "learning_priority": "High"},
            {"company_name": "Supabase", "match_percentage": 85.0, "required_skills": ["PostgreSQL", "Node.js", "REST API"], "missing_skills": ["Docker"], "expected_salary": "$130k - $155k", "hiring_trend": "Growing", "learning_priority": "High"}
        ]
    else:
        companies = [
            {"company_name": "TechCorp Solutions", "match_percentage": 85.0, "required_skills": ["Javascript", "Git", "SQL"], "missing_skills": ["React"], "expected_salary": "$85k - $105k", "hiring_trend": "Steady", "learning_priority": "High"},
            {"company_name": "NextGen Innovations", "match_percentage": 78.0, "required_skills": ["Python", "SQL", "APIs"], "missing_skills": ["Docker"], "expected_salary": "$90k - $115k", "hiring_trend": "Active", "learning_priority": "Medium"}
        ]
    return [schemas.CompanyReadinessOut(**c) for c in companies]

@app.get("/roadmap/mentor-suggestion", response_model=schemas.DailyMentorOut)
def daily_mentor_suggestion(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    from datetime import date
    today_str = date.today().isoformat()
    
    if progress.daily_mentor and progress.daily_mentor.get("date") == today_str:
        return schemas.DailyMentorOut(**progress.daily_mentor)
        
    suggestions = [
        "Deploy your latest project on Vercel/Render and put the live URL in your resume.",
        "Practice 5 database schema and indexing interview questions today.",
        "Refactor one of your older GitHub repositories to improve folder structure and documentation.",
        "Improve your LinkedIn profile headline to exactly match your target role.",
        "Complete a mock interview rehearsal for behavioral questions.",
        "Review missing skill keywords and add them to your practice notes.",
        "Write unit tests for your project APIs to show qa awareness.",
        "Containerize your backend application using Docker to boost DevOps readiness."
    ]
    import hashlib
    hash_val = int(hashlib.md5(f"{progress.user_id}-{today_str}".encode()).hexdigest(), 16)
    suggestion = suggestions[hash_val % len(suggestions)]
    
    mentor_data = {
        "date": today_str,
        "suggestion": suggestion
    }
    progress.daily_mentor = mentor_data
    db.commit()
    return schemas.DailyMentorOut(**mentor_data)

@app.post("/roadmap/export", response_model=schemas.RoadmapExportResponse)
def export_roadmap(
    payload: schemas.RoadmapExportPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = get_or_create_progress(db, current_user.id)
    fmt = payload.format
    content = ""
    if fmt == "markdown":
        content = f"# Career Roadmap Progress - {current_user.email}\n\n"
        content += f"## Summary\n"
        content += f"- Completed Milestones: {len(progress.completed_milestones)}\n"
        content += f"- Achievements Unlocked: {len(progress.achievements)}\n\n"
        content += f"## Milestones Completion Status\n"
        for cm in progress.completed_milestones:
            content += f"- [x] {cm}\n"
    elif fmt == "checklist":
        content = "ROADMAP TASK CHECKLIST\n\n"
        for cm in progress.completed_milestones:
            content += f"[X] {cm}\n"
    elif fmt == "csv":
        content = "Type,ID,Status,CompletedDate\n"
        for cm in progress.completed_milestones:
            content += f"Milestone,{cm},Completed,\n"
        for pid, pdata in progress.projects.items():
            content += f"Project,{pid},{pdata.get('status')},{pdata.get('completed_date')}\n"
    else: # pdf or general fallback
        content = f"PDF-EXPORT: Career Roadmap Progress for user {current_user.email}.\nCompleted items count: {len(progress.completed_milestones)}"
        
    return schemas.RoadmapExportResponse(format=fmt, content=content)

@app.post("/roadmap/analyze-project", response_model=schemas.ProjectAnalysisResponse)
async def analyze_project(
    payload: schemas.ProjectUpdatePayload,
    current_user: models.User = Depends(get_current_user)
):
    import random
    score_labels = ["Strong", "Good", "Needs Improvement", "Outstanding"]
    suggestions = [
        "Add a clear README.md outlining setup instructions and architectural diagrams.",
        "Implement basic unit tests using pytest or jest to demonstrate code quality standards.",
        "Refactor configuration parameters into environment variables (.env) to follow security best practices.",
        "Deploy the project on Vercel or Render and add the live link to the repository description."
    ]
    return schemas.ProjectAnalysisResponse(
        architecture=random.choice(score_labels),
        code_quality=random.choice(score_labels),
        documentation=random.choice(score_labels),
        portfolio_value=random.choice(score_labels),
        resume_impact=random.choice(score_labels),
        deployment=random.choice(score_labels),
        suggestions=suggestions
    )



# ---------------------------------------------------------------------
# Bookmarking
# ---------------------------------------------------------------------
@app.post("/bookmark/save", response_model=schemas.BookmarkOut)
def save_bookmark(
    payload: schemas.BookmarkCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark = (
        db.query(models.Bookmark)
        .filter(
            models.Bookmark.user_id == current_user.id,
            models.Bookmark.external_job_id == payload.external_job_id,
        )
        .first()
    )

    if bookmark:
        bookmark.job_title = payload.job_title
        bookmark.company_name = payload.company_name
        bookmark.location = payload.location
        bookmark.employment_type = payload.employment_type
        bookmark.posted_date = payload.posted_date
        bookmark.apply_link = payload.apply_link
        bookmark.description = payload.description
        bookmark.ai_score = payload.ai_score
        bookmark.readiness_score = payload.readiness_score
        bookmark.is_potential_scam = payload.is_potential_scam
        bookmark.scam_reasons = payload.scam_reasons
        bookmark.raw_job = payload.raw_job
    else:
        bookmark = models.Bookmark(
            user_id=current_user.id,
            external_job_id=payload.external_job_id,
            job_title=payload.job_title,
            company_name=payload.company_name,
            location=payload.location,
            employment_type=payload.employment_type,
            posted_date=payload.posted_date,
            apply_link=payload.apply_link,
            description=payload.description,
            ai_score=payload.ai_score,
            readiness_score=payload.readiness_score,
            is_potential_scam=payload.is_potential_scam,
            scam_reasons=payload.scam_reasons,
            raw_job=payload.raw_job,
        )
        db.add(bookmark)

    db.commit()
    db.refresh(bookmark)
    return bookmark


@app.get("/bookmark/list", response_model=list[schemas.BookmarkOut])
def list_bookmarks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Bookmark)
        .filter(models.Bookmark.user_id == current_user.id)
        .order_by(models.Bookmark.updated_at.desc())
        .all()
    )


@app.post("/tracker/update-status", response_model=schemas.BookmarkOut)
def update_tracker_status(
    payload: schemas.TrackerUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark = (
        db.query(models.Bookmark)
        .filter(
            models.Bookmark.user_id == current_user.id,
            models.Bookmark.id == payload.bookmark_id,
        )
        .first()
    )
    if not bookmark:
        raise HTTPException(status_code=404, detail="Tracked job not found.")

    bookmark.status = payload.status
    db.commit()
    db.refresh(bookmark)
    return bookmark


@app.post("/tracker/save", response_model=schemas.TrackerSaveOut, status_code=status.HTTP_201_CREATED)
def save_job_to_tracker(
    payload: schemas.TrackerSave,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_job_id = str(payload.job_id).strip()
    if not normalized_job_id:
        raise HTTPException(status_code=400, detail="job_id is required.")

    tracked_job = (
        db.query(models.TrackedJob)
        .filter(
            models.TrackedJob.user_id == current_user.id,
            models.TrackedJob.job_id == normalized_job_id,
        )
        .first()
    )

    if tracked_job:
        tracked_job.raw_job = payload.job or {}
    else:
        tracked_job = models.TrackedJob(
            user_id=current_user.id,
            job_id=normalized_job_id,
            raw_job=payload.job or {},
        )
        db.add(tracked_job)

    db.commit()
    db.refresh(tracked_job)
    return tracked_job


# ---------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------
@app.get("/notifications/subscribe")
def subscribe_notifications(
    email: str,
    frequency: str = Query(default="daily", pattern="^(daily|weekly)$"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = upsert_subscription(db, current_user.id, email, frequency)
    return {
        "message": "Notification subscription saved.",
        "subscription": {
            "email": subscription.email,
            "frequency": subscription.frequency,
            "active": subscription.active,
        },
    }


# ---------------------------------------------------------------------
# Interview Pack
# ---------------------------------------------------------------------
@app.post("/chatbot/ask", response_model=schemas.ChatbotResponse)
async def chatbot_ask(
    payload: schemas.ChatbotAskRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    recommendation_bundle = await build_recommendation_bundle(profile, profile.mode, include_roadmap=True)
    resume_audit = None
    if profile.resume_text:
        resume_audit = await build_resume_audit_payload(profile)

    bookmarks = (
        db.query(models.Bookmark)
.filter(models.Bookmark.user_id == current_user.id)
        .order_by(models.Bookmark.updated_at.desc())
        .all()
    )

    answer, model, suggestions = await generate_openai_chat_response(
        payload.question,
        profile,
        messages=payload.messages,
        recommendation_bundle=recommendation_bundle,
        resume_audit=resume_audit,
        bookmarks=bookmarks,
    )

    return {
        "question": payload.question,
        "answer": answer,
        "provider": "openai",
        "model": model,
        "suggestions": suggestions,
    }


@app.get("/chatbot/ask", response_model=schemas.ChatbotResponse)
async def chatbot_ask_legacy(
    q: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = schemas.ChatbotAskRequest(question=q, messages=[])
    return await chatbot_ask(payload=payload, current_user=current_user, db=db)


@app.get("/interview/questions", response_model=schemas.InterviewResponse)
def interview_questions(
    role: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    target_role = role or profile.desired_role or f"{profile.domain} {profile.mode}"
    return generate_interview_pack(
        target_role,
        profile.skills or [],
        profile.experience_level,
    )


@app.get("/interview/recordings", response_model=schemas.InterviewRecordingListResponse)
def list_interview_recordings(
    target_role: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.InterviewRecording).filter(models.InterviewRecording.user_id == current_user.id)
    if (target_role or "").strip():
        query = query.filter(models.InterviewRecording.target_role == target_role.strip())

    recordings = (
        query.order_by(models.InterviewRecording.question_type.asc(), models.InterviewRecording.question_index.asc()).all()
    )
    return {"recordings": [_serialize_interview_recording(recording) for recording in recordings]}


@app.post("/interview/recordings", response_model=schemas.InterviewRecordingOut)
async def upload_interview_recording(
    audio: UploadFile = File(...),
    target_role: str = Form(...),
    question_key: str = Form(...),
    question_type: str = Form(...),
    question_index: int = Form(...),
    question_text: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_role = target_role.strip()
    normalized_key = question_key.strip()
    normalized_type = question_type.strip().lower()
    normalized_question = question_text.strip()

    if not normalized_role:
        raise HTTPException(status_code=400, detail="Target role is required.")
    if not normalized_key:
        raise HTTPException(status_code=400, detail="Question key is required.")
    if normalized_type not in {"technical", "hr"}:
        raise HTTPException(status_code=400, detail="Question type must be technical or hr.")
    if not normalized_question:
        raise HTTPException(status_code=400, detail="Question text is required.")

    content = await audio.read()
    content_type = (audio.content_type or "audio/webm").split(";")[0].strip().lower()
    extension = Path(audio.filename or "recording.webm").suffix.lower() or ".webm"

    if content_type not in {"audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg"}:
        raise HTTPException(status_code=400, detail="Unsupported audio format. Use webm, wav, mp4, mp3, or ogg.")
    if extension not in {".webm", ".wav", ".mp4", ".mp3", ".ogg", ".m4a"}:
        raise HTTPException(status_code=400, detail="Unsupported audio file extension.")
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded audio is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file is too large. Keep recordings under 10 MB.")

    existing = (
        db.query(models.InterviewRecording)
        .filter(
            models.InterviewRecording.user_id == current_user.id,
            models.InterviewRecording.target_role == normalized_role,
            models.InterviewRecording.question_key == normalized_key,
        )
        .first()
    )

    old_file_path = None
    if existing:
        old_file_path = INTERVIEW_RECORDINGS_DIR / existing.stored_filename

    stored_filename = f"user-{current_user.id}-{uuid4().hex}{extension}"
    (INTERVIEW_RECORDINGS_DIR / stored_filename).write_bytes(content)

    recording = existing or models.InterviewRecording(user_id=current_user.id)
    recording.target_role = normalized_role
    recording.question_key = normalized_key
    recording.question_type = normalized_type
    recording.question_index = question_index
    recording.question_text = normalized_question
    recording.original_filename = audio.filename or f"{normalized_key}{extension}"
    recording.stored_filename = stored_filename
    recording.content_type = content_type
    recording.file_size = len(content)

    if not existing:
        db.add(recording)

    # Gamification
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if profile:
        profile.weekly_mock_interviews += 1
        if "first_mock_interview" not in profile.badges:
            profile.badges = list(profile.badges) + ["first_mock_interview"]
        
    db.commit()
    db.refresh(recording)

    if old_file_path and old_file_path.name != stored_filename and old_file_path.exists():
        old_file_path.unlink(missing_ok=True)

    return _serialize_interview_recording(recording)


@app.delete("/interview/recordings/{recording_id}", response_model=schemas.InterviewRecordingDeleteResponse)
def delete_interview_recording(
    recording_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recording = (
        db.query(models.InterviewRecording)
        .filter(
            models.InterviewRecording.id == recording_id,
            models.InterviewRecording.user_id == current_user.id,
        )
        .first()
    )
    if not recording:
        raise HTTPException(status_code=404, detail="Interview recording not found.")

    file_path = INTERVIEW_RECORDINGS_DIR / recording.stored_filename
    db.delete(recording)
    db.commit()
    if file_path.exists():
        file_path.unlink(missing_ok=True)

    return {"detail": "Interview recording deleted."}


def clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def generate_mock_tailoring_response(resume_text: str, user_skills: list[str], payload: schemas.ResumeTailorRequest, user_name: str) -> dict:
    job_desc = (payload.job_description or "").lower()
    possible_skills = ["python", "javascript", "react", "node.js", "fastapi", "docker", "kubernetes", "sql", "aws", "git"]
    matched = [s for s in user_skills if s.lower() in job_desc]
    missing = [s for s in possible_skills if s in job_desc and s.lower() not in [m.lower() for m in matched]]
    if not missing:
        missing = ["docker", "system design"]

    return {
        "original_skills_found": matched,
        "missing_skills_found": missing,
        "ats_score_before": 65 if len(matched) > 2 else 40,
        "ats_score_after": 92,
        "tailored_summary": f"Identified key requirements for the {payload.job_title} role (like {', '.join(missing[:2])}) and optimized resume bullets to demonstrate hands-on experience.",
        "tailored_bullets": [
            {
                "original": f"Developed backend applications using {', '.join(matched[:2]) if matched else 'Python'}.",
                "suggested": f"Engineered scalable backend service APIs leveraging {', '.join(matched[:2]) if matched else 'Python'}, incorporating {missing[0]} workflows to improve application portability and containerized testing.",
                "justification": f"Explicitly showcases {missing[0]} which is a primary requirement in the job description."
            },
            {
                "original": "Worked in an agile team to ship updates.",
                "suggested": "Collaborated in a cross-functional agile squad to deploy production updates, utilizing Git and CI/CD pipelines to slash build release overhead.",
                "justification": "Highlights modern engineering practices (CI/CD) and collaboration skills relevant to the role."
            }
        ],
        "cover_letter": (
            f"Dear Hiring Team,\n\n"
            f"I am writing to express my strong interest in the {payload.job_title} position at {payload.company_name or 'your company'}. "
            f"With a solid background in {', '.join(user_skills[:3]) if user_skills else 'software engineering'} and a proven track record "
            f"of building robust systems, I am excited about the opportunity to contribute to your team.\n\n"
            f"My resume highlights my experience in designing scalable services, and I have recently honed my skills "
            f"in {', '.join(missing[:2])} to directly align with the requirements of this role. I am confident that "
            f"my background makes me an excellent fit.\n\n"
            f"Thank you for your time and consideration. I look forward to discussing how my skills and experience "
            f"can benefit {payload.company_name or 'your company'}.\n\n"
            f"Sincerely,\n"
            f"{user_name}"
        )
    }


async def tailor_resume_with_ai(
    resume_text: str,
    user_skills: list[str],
    payload: schemas.ResumeTailorRequest,
    user_name: str,
) -> dict:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured. Using fallback mock resume tailoring response.")
        return generate_mock_tailoring_response(resume_text, user_skills, payload, user_name)

    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("OpenAI SDK is not installed. Using fallback mock resume tailoring response.")
        return generate_mock_tailoring_response(resume_text, user_skills, payload, user_name)

    model = _get_openai_chat_model()
    system_prompt = (
        "You are an expert technical recruiter and resume writer. "
        "Analyze the user's resume text, current skills, and the job description details. "
        "Output a JSON object ONLY. Do not wrap in markdown or include any explanations outside the JSON. "
        "Do not include markdown code block characters like ```json. Just raw text starting with '{' and ending with '}'. "
        f"Sign off the cover letter specifically with the candidate's name: {user_name}. "
        "The JSON schema must exactly be:\n"
        "{\n"
        '  "original_skills_found": ["skill1", "skill2"],\n'
        '  "missing_skills_found": ["skill3", "skill4"],\n'
        '  "ats_score_before": 45,\n'
        '  "ats_score_after": 92,\n'
        '  "tailored_summary": "Short explanation of strategies used to tailor the resume",\n'
        '  "tailored_bullets": [\n'
        "    {\n"
        '      "original": "Original bullet point text from resume",\n'
        '      "suggested": "Improved, tailored bullet point incorporating missing skills/keywords",\n'
        '      "justification": "Why this improvement helps pass ATS and fits the job"\n'
        "    }\n"
        "  ],\n"
        '  "cover_letter": "The complete cover letter text, custom-written for this role and company."\n'
        "}"
    )

    user_content = (
        f"USER NAME: {user_name}\n\n"
        f"USER RESUME TEXT:\n{resume_text}\n\n"
        f"USER CURRENT SKILLS: {', '.join(user_skills)}\n\n"
        f"TARGET JOB TITLE: {payload.job_title}\n"
        f"TARGET COMPANY NAME: {payload.company_name or 'N/A'}\n"
        f"TARGET JOB DESCRIPTION:\n{payload.job_description}\n"
    )

    input_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]

    def _run_openai_request() -> str:
        client = OpenAI(api_key=api_key, timeout=45.0)
        response = client.chat.completions.create(
            model=model,
            messages=input_messages,
        )
        return (response.choices[0].message.content or "").strip()

    try:
        raw_response = await asyncio.to_thread(_run_openai_request)
        cleaned = clean_json_response(raw_response)
        parsed = json.loads(cleaned)
        
        required_keys = {"original_skills_found", "missing_skills_found", "ats_score_before", "ats_score_after", "tailored_summary", "tailored_bullets", "cover_letter"}
        if all(k in parsed for k in required_keys):
            return parsed
        else:
            logger.error("Parsed JSON missing keys: %s", parsed)
            raise ValueError("Invalid JSON schema from AI")
    except Exception as exc:
        logger.exception("AI resume tailoring failed, using fallback mock: %s", exc)
        return generate_mock_tailoring_response(resume_text, user_skills, payload, user_name)


@app.post("/resume/tailor", response_model=schemas.ResumeTailorResponse)
async def tailor_resume(
    payload: schemas.ResumeTailorRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, current_user.id)
    if not profile.resume_text or not profile.resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No resume text found. Please upload your resume first on the Resume Upload page."
        )

    result = await tailor_resume_with_ai(
        profile.resume_text,
        profile.skills or [],
        payload,
        current_user.full_name
    )
    return result

@app.post("/resume/export-pdf")
def export_resume_pdf(
    payload: schemas.PDFExportRequest,
    current_user: models.User = Depends(get_current_user)
):
    try:
        pdf_bytes = generate_pdf_from_html(payload.html)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=Resume_Preview.pdf"}
        )
    except Exception as e:
        logger.exception(f"Failed to generate PDF: {e}")
        import traceback
        with open("pdf_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to generate PDF")


@app.post("/resume/export-docx")
def export_resume_docx(
    payload: schemas.DOCXExportRequest,
    current_user: models.User = Depends(get_current_user)
):
    try:
        from docx_generator import generate_docx_from_data
        
        docx_bytes = generate_docx_from_data(payload.model_dump())
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=Resume_Generated.docx"}
        )
    except Exception as e:
        logger.exception(f"Failed to generate DOCX: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate DOCX")

@app.post("/resume/star-audit", response_model=schemas.StarAuditResponse)
async def star_audit(
    payload: schemas.StarAuditRequest,
    current_user: models.User = Depends(get_current_user)
):
    try:
        from openai import AsyncOpenAI
        import json
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        
        prompt = f"""
        You are an expert technical recruiter and resume writer. 
        Analyze the following list of resume bullet points.
        Identify weak, generic statements that lack quantifiable metrics (numbers, percentages, timeframes).
        For each bullet, return a JSON object with:
        - "original": the exact original string
        - "is_weak": boolean (true if it lacks metrics or impact, false if it is already strong)
        - "critique": a short 1-sentence critique of why it is weak (if applicable)
        - "suggested_rewrite": a highly professional, quantified rewrite using the STAR method (Situation, Task, Action, Result). Make up plausible metrics if none exist, but keep them realistic for a software engineer / professional. If the bullet is already strong, suggest a minor optimization or just repeat it.
        
        Bullets to analyze:
        {json.dumps(payload.bullets)}
        
        Return ONLY a JSON object in this exact format:
        {{
            "audits": [
                {{
                    "original": "...",
                    "is_weak": true,
                    "critique": "...",
                    "suggested_rewrite": "..."
                }}
            ]
        }}
        """
        
        response = await client.chat.completions.create(
            model=_get_openai_chat_model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={{ "type": "json_object" }}
        )
        
        raw_content = response.choices[0].message.content
        cleaned = clean_json_response(raw_content)
        parsed = json.loads(cleaned)
        
        return parsed
    except Exception as e:
        logger.exception(f"Failed to perform STAR audit: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform STAR audit")

from pydantic import BaseModel
class OpenAIKeyUpdate(BaseModel):
    api_key: str
    admin_password: str

@app.post("/admin/config/openai")
def update_openai_key(payload: OpenAIKeyUpdate):
    expected_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if payload.admin_password != expected_password:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    try:
        from dotenv import set_key
        # Update in-memory environment variable immediately
        os.environ["OPENAI_API_KEY"] = payload.api_key
        
        # Determine .env path
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        
        # Persist to .env file
        set_key(env_path, "OPENAI_API_KEY", payload.api_key)
        
        return {"status": "success", "message": "API key updated successfully"}
    except Exception as e:
        logger.exception(f"Failed to update API key: {e}")
        raise HTTPException(status_code=500, detail="Failed to update API key")
