from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("NotificationSubscription", back_populates="user", cascade="all, delete-orphan")
    interview_recordings = relationship("InterviewRecording", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    skills = Column(JSON, default=list, nullable=False)
    domain = Column(String(120), nullable=False)
    region = Column(String(120), nullable=True)
    location = Column(String(120), nullable=False)
    years_of_experience = Column(Float, nullable=True, default=0.0)
    experience_level = Column(String(50), nullable=False)
    mode = Column(String(30), nullable=False, default="job")
    desired_role = Column(String(120), nullable=True)
    resume_text = Column(Text, nullable=True)
    
    # Gamification Fields
    current_streak = Column(Integer, default=0, nullable=False)
    highest_streak = Column(Integer, default=0, nullable=False)
    last_active_date = Column(String(50), nullable=True)
    badges = Column(JSON, default=list, nullable=False)
    weekly_applications = Column(Integer, default=0, nullable=False)
    weekly_mock_interviews = Column(Integer, default=0, nullable=False)
    week_start_date = Column(String(50), nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="profile")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    external_job_id = Column(String(120), nullable=False, index=True)
    job_title = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=True)
    location = Column(String(120), nullable=True)
    employment_type = Column(String(80), nullable=True)
    posted_date = Column(String(80), nullable=True)
    apply_link = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    ai_score = Column(Float, default=0.0, nullable=False)
    readiness_score = Column(Float, default=0.0, nullable=False)
    status = Column(String(40), default="saved", nullable=False)
    is_potential_scam = Column(Boolean, default=False, nullable=False)
    scam_reasons = Column(JSON, default=list, nullable=False)
    raw_job = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="bookmarks")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(200), nullable=True)
    location = Column(String(120), nullable=True)
    stipend_salary = Column(String(120), nullable=True)
    job_type = Column(String(20), default="internal", nullable=False)
    description = Column(Text, nullable=True)
    skills = Column(JSON, default=list, nullable=False)
    salary_range = Column(String(80), nullable=True)
    apply_url = Column(Text, nullable=True)
    posted_at = Column(Float, default=datetime.utcnow().timestamp, nullable=False)
    source = Column(String(50), default="unknown", nullable=False)
    is_remote = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False, index=True)
    resume_link = Column(Text, nullable=False)
    cover_letter = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("Job")


class TrackedJob(Base):
    __tablename__ = "tracked_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(160), nullable=False, index=True)
    raw_job = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")


class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(120), nullable=False)
    frequency = Column(String(20), default="daily", nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    last_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="subscriptions")


class InterviewRecording(Base):
    __tablename__ = "interview_recordings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(160), nullable=False, index=True)
    question_key = Column(String(80), nullable=False, index=True)
    question_type = Column(String(20), nullable=False)
    question_index = Column(Integer, nullable=False, default=0)
    question_text = Column(Text, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    content_type = Column(String(80), nullable=False, default="audio/webm")
    file_size = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="interview_recordings")


class Employer(Base):
    __tablename__ = "employers"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False)
    company_website = Column(String(255), nullable=True)
    company_description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)  # e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
    location = Column(String(120), nullable=True)
    contact_email = Column(String(120), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    logo_url = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    ats_system = Column(String(100), nullable=True)  # e.g., "Greenhouse", "Workday", "Lever", etc.
    careers_page_url = Column(Text, nullable=True)
    integration_methods = Column(JSON, default=list, nullable=False)
    webhook_url = Column(Text, nullable=True)  # For ATS webhook integration
    webhook_secret = Column(String(255), nullable=True)  # For webhook verification
    webhook_enabled = Column(Boolean, default=False, nullable=False)
    last_webhook_at = Column(DateTime, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    sync_status = Column(String(30), default="ready", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    job_postings = relationship("JobPosting", back_populates="employer", cascade="all, delete-orphan")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("employers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Standard Job Schema fields
    job_id = Column(String(100), nullable=False, unique=True, index=True)  # External job ID from ATS
    title = Column(String(200), nullable=False)
    department = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=False)  # "full-time", "part-time", "contract", "internship", "freelance"
    experience_level = Column(String(50), nullable=True)  # "entry", "mid", "senior", "lead", "executive"
    work_location_type = Column(String(50), nullable=False, default="on-site")  # "on-site", "remote", "hybrid"

    # Location details
    location_city = Column(String(100), nullable=True)
    location_state = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)
    location_postal_code = Column(String(20), nullable=True)
    is_remote = Column(Boolean, default=False, nullable=False)

    # Compensation
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(3), default="USD", nullable=False)
    salary_period = Column(String(20), default="yearly", nullable=False)  # "hourly", "monthly", "yearly"
    show_salary = Column(Boolean, default=True, nullable=False)

    # Job details
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    benefits = Column(JSON, default=list, nullable=False)  # List of benefit strings
    skills_required = Column(JSON, default=list, nullable=False)  # List of required skills
    skills_preferred = Column(JSON, default=list, nullable=False)  # List of preferred skills

    # Application details
    application_deadline = Column(DateTime, nullable=True)
    application_url = Column(Text, nullable=True)
    application_email = Column(String(120), nullable=True)

    # Status and metadata
    status = Column(String(50), default="active", nullable=False)  # "active", "paused", "closed", "filled"
    posted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ATS integration
    ats_job_id = Column(String(100), nullable=True)  # Job ID in the ATS system
    ats_last_sync = Column(DateTime, nullable=True)  # Last sync with ATS
    schema_version = Column(String(20), default="1.0", nullable=False)
    source_method = Column(String(30), default="manual", nullable=False)
    source_reference = Column(String(120), nullable=True)
    sync_status = Column(String(30), default="synced", nullable=False)
    published_to_candidates = Column(Boolean, default=True, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    raw_payload = Column(JSON, default=dict, nullable=False)

    employer = relationship("Employer", back_populates="job_postings")


class UserRoadmapProgress(Base):
    __tablename__ = "user_roadmap_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Milestones & stages: lists of completed step/stage IDs, e.g. ["step-0", "stage-1"]
    completed_milestones = Column(JSON, default=list, nullable=False)
    
    # Projects: dict mapping project index/id to project metadata:
    # { "0": { "status": "In Progress", "repo": "...", "demo": "...", "notes": "...", "completed_date": "..." } }
    projects = Column(JSON, default=dict, nullable=False)
    
    # Learning resources: dict mapping resource id to tracking metadata:
    # { "res-0": { "started_date": "...", "completed_date": "...", "time_spent": 12, "percent": 50, "streak": 2 } }
    learning_resources = Column(JSON, default=dict, nullable=False)
    
    # Weekly goals: list of objects:
    # [ { "week": 1, "goals": [ { "id": "g-0", "title": "...", "type": "learning", "done": false } ] } ]
    weekly_goals = Column(JSON, default=list, nullable=False)
    
    # Achievements: list of badge names unlocked, e.g. ["First Milestone", "First Project"]
    achievements = Column(JSON, default=list, nullable=False)
    
    # Interview Practice: dict mapping metric keys or logs
    # { "technical_score": 85, "hr_score": 90, "avg_response_time": 15, "history": [...] }
    interview_practice = Column(JSON, default=dict, nullable=False)

    # Daily Mentor suggestion: dict mapping { "date": "YYYY-MM-DD", "suggestion": "..." }
    daily_mentor = Column(JSON, default=dict, nullable=False)
    
    # Metadata
    learning_streak = Column(Integer, default=0, nullable=False)
    last_active_date = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
