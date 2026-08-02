from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


BLOCKED_EMAIL_DOMAINS = {
    "10minutemail.com",
    "10minutemail.net",
    "20minutemail.com",
    "dispostable.com",
    "emailondeck.com",
    "fakeinbox.com",
    "guerrillamail.com",
    "guerrillamail.net",
    "guerrillamail.org",
    "maildrop.cc",
    "mailinator.com",
    "mailnesia.com",
    "moakt.com",
    "tempmail.com",
    "temp-mail.org",
    "tempail.com",
    "throwawaymail.com",
    "trashmail.com",
    "yopmail.com",
    "example.edu",
    "example.com",
    "example.net",
    "example.org",
    "localhost",
    "localdomain",
    "test.com",
    "fake.com",
    "invalid.com",
}

BLOCKED_LOCAL_PARTS = {
    "a",
    "aa",
    "abc",
    "admin",
    "demo",
    "email",
    "fake",
    "foo",
    "hello",
    "mail",
    "me",
    "no-reply",
    "noreply",
    "none",
    "sample",
    "test",
    "testing",
    "user",
}

SUSPICIOUS_EMAIL_TERMS = (
    "asdf",
    "dummy",
    "fake",
    "invalid",
    "qwerty",
    "sample",
    "test",
    "trash",
)


def _has_valid_domain_labels(domain: str) -> bool:
    labels = domain.split(".")
    return all(
        2 <= len(label) <= 63
        and label[0].isalnum()
        and label[-1].isalnum()
        and all(character.isalnum() or character == "-" for character in label)
        for label in labels
    )


def validate_real_email(value: str) -> str:
    normalized = str(value).strip().lower()
    if "@" not in normalized:
        raise ValueError("Enter a valid email address.")

    local_part, domain = normalized.rsplit("@", 1)
    if not local_part or not domain or "." not in domain:
        raise ValueError("Enter a valid email address.")

    domain_parts = domain.split(".")
    top_level_domain = domain_parts[-1] if domain_parts else ""

    if (
        len(local_part) < 2
        or len(local_part) > 64
        or ".." in normalized
        or local_part.startswith(".")
        or local_part.endswith(".")
        or not _has_valid_domain_labels(domain)
        or len(top_level_domain) < 2
        or len(top_level_domain) > 24
    ):
        raise ValueError("Enter a valid email address.")

    if (
        domain in BLOCKED_EMAIL_DOMAINS
        or domain.endswith(".invalid")
        or domain.endswith(".test")
        or domain.endswith(".example")
        or domain.endswith(".localhost")
    ):
        raise ValueError("Use a real personal, school, or work email address.")

    compact_local = local_part.replace(".", "").replace("_", "").replace("-", "")
    if (
        local_part in BLOCKED_LOCAL_PARTS
        or any(term in local_part or term in domain for term in SUSPICIOUS_EMAIL_TERMS)
        or local_part.isdigit()
        or (len(compact_local) >= 5 and len(set(compact_local)) == 1)
    ):
        raise ValueError("This looks like a fake email address. Use a real email to continue.")

    return normalized


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=120)

    @field_validator("email")
    @classmethod
    def reject_fake_email(cls, value: EmailStr) -> str:
        return validate_real_email(str(value))


class UserReplaceRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    current_password: str = Field(..., min_length=6, max_length=120)
    new_password: str = Field(..., min_length=6, max_length=120)

    @field_validator("email")
    @classmethod
    def reject_fake_email(cls, value: EmailStr) -> str:
        return validate_real_email(str(value))


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(Token):
    user: UserOut


class ProfileCreate(BaseModel):
    skills: list[str] | str
    domain: str
    location: str
    years_of_experience: float = Field(default=0.0, ge=0.0, le=50.0)
    experience_level: Literal["fresher", "entry", "mid", "senior", "lead", "student"]
    mode: Literal["job", "internship"]
    desired_role: str | None = None
    resume_text: str | None = None

    @model_validator(mode="after")
    def validate_role_matches_mode(self):
        desired_role = (self.desired_role or "").strip().lower()
        if not desired_role:
            return self

        if self.mode == "job" and any(term in desired_role for term in ("intern", "internship", "trainee")):
            raise ValueError("Switch to internship mode for intern or trainee roles.")

        if self.mode == "internship" and any(term in desired_role for term in ("full time", "full-time", "permanent")):
            raise ValueError("Switch to job mode for full-time or permanent roles.")

        return self


class ProfileOut(BaseModel):
    id: int
    user_id: int
    skills: list[str]
    domain: str
    location: str
    years_of_experience: float = 0.0
    experience_level: str
    mode: str
    desired_role: str | None = None
    resume_text: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ParsedDocumentSummary(BaseModel):
    document_type: Literal["resume", "linkedin", "certificate"]
    filename: str
    extracted_text_preview: str
    extracted_skills: list[str] = Field(default_factory=list)
    detected_projects: list[str] = Field(default_factory=list)
    detected_certificates: list[str] = Field(default_factory=list)


class StructuredProfileDraft(BaseModel):
    skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    experience_highlights: list[str] = Field(default_factory=list)
    certificates: list[str] = Field(default_factory=list)
    years_of_experience: float = 0.0
    experience_level: str = "student"
    suggested_domain: str = ""
    source_documents: list[str] = Field(default_factory=list)


class ResumeUploadResponse(BaseModel):
    extracted_text_preview: str
    extracted_skills: list[str]
    auto_filled_profile: dict[str, Any]
    structured_profile: StructuredProfileDraft
    documents: list[ParsedDocumentSummary] = Field(default_factory=list)
    resume_audit: "ResumeAuditResponse | None" = None


class DOCXExportRequest(BaseModel):
    name: str = ""
    role: str = ""
    email: str = ""
    github: str = ""
    linkedin: str = ""
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class ResumeAuditSection(BaseModel):
    title: str
    present: bool
    detail: str


class ResumeAuditResponse(BaseModel):
    target_role: str
    overall_score: float
    keyword_match_score: float
    role_alignment_score: float
    resume_strength_score: float
    market_readiness_score: float
    matched_keywords: list[str]
    missing_keywords: list[str]
    suggested_summary: str
    improvement_tips: list[str]
    section_checks: list[ResumeAuditSection]
    recommended_projects: list["ProjectSuggestion"] = Field(default_factory=list)


class ProjectSuggestion(BaseModel):
    title: str
    level: Literal["Basic", "Intermediate", "Advanced", "Pro"]
    summary: str
    skills: list[str] = Field(default_factory=list)
    deployment: str | None = None


class CourseReference(BaseModel):
    course_id: str
    title: str | None = None


class RoadmapStage(BaseModel):
    stage: str
    days: str
    focus: list[str]
    courses: list[str | CourseReference]
    milestone: str


class RoadmapCurrentProfile(BaseModel):
    label: str
    snapshot: str
    experience_level: str
    years_of_experience: float = 0.0
    strengths: list[str] = Field(default_factory=list)
    priority_gaps: list[str] = Field(default_factory=list)


class CareerPathRouteOption(BaseModel):
    title: str
    duration: str
    description: str
    recommended: bool = False


class LearningResourceItem(BaseModel):
    title: str
    url: str | None = None
    type: Literal["resource", "course", "video", "playlist", "article", "guide"] = "resource"
    provider: str | None = None
    note: str | None = None


class CareerPathStep(BaseModel):
    step_number: int
    role_title: str
    step_type: Literal["transition", "target"]
    time_estimate: str
    cumulative_timeline: str
    objective: str
    technical_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    learning_resources: list[str | LearningResourceItem | CourseReference] = Field(default_factory=list)
    certifications: list[str | CourseReference] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    salary_range: str = ""


class RoadmapOutcome(BaseModel):
    total_time_estimate: str
    current_readiness_score: float
    projected_readiness_score: float
    readiness_label: str
    readiness_summary: str
    expected_salary_range: str
    salary_region: str
    final_skills: list[str] = Field(default_factory=list)


class RoadmapResponse(BaseModel):
    target_role: str
    summary: str
    current_profile: RoadmapCurrentProfile
    route_options: list[CareerPathRouteOption] = Field(default_factory=list)
    steps: list[CareerPathStep] = Field(default_factory=list)
    outcome: RoadmapOutcome
    stages: list[RoadmapStage]
    recommended_projects: list[str]
    deployment_checklist: list[str] = Field(default_factory=list)


class JobRecommendation(BaseModel):
    external_job_id: str
    job_title: str
    company_name: str | None = None
    location: str | None = None
    employment_type: str | None = None
    posted_date: str | None = None
    apply_link: str | None = None
    apply_provider: str | None = None
    is_direct_apply: bool = False
    apply_link_verified: bool = False
    apply_link_note: str | None = None
    job_description: str | None = None
    job_summary: str | None = None
    ai_score: float
    skill_match_percentage: float
    exact_skill_match_percentage: float | None = None
    matched_skills: list[str]
    missing_skills: list[str]
    job_readiness_score: float
    is_potential_scam: bool = False
    scam_reasons: list[str] = Field(default_factory=list)
    source: str = "RapidAPI JSearch"


class SkillBasedRecommendation(BaseModel):
    role: str
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    opportunities: list[JobRecommendation] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    mode: str
    profile_snapshot: dict[str, Any]
    job_feed_status: str | None = None
    job_feed_message: str | None = None
    jobs: list[JobRecommendation]
    top_companies: list[dict[str, Any]]
    trending_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    project_suggestions: list[ProjectSuggestion]
    roadmap: RoadmapResponse | None = None
    gap_chart: list[dict[str, Any]] = Field(default_factory=list)
    skill_based_recommendations: list[SkillBasedRecommendation] = Field(default_factory=list)



class SkillFamilyGap(BaseModel):
    family: str
    current_level: float
    target_level: float
    gap_level: float
    demand_count: int = 0
    job_count: int = 0
    strength_count: int = 0
    gap_count: int = 0
    matched_micro_skills: list[str] = Field(default_factory=list)
    missing_micro_skills: list[str] = Field(default_factory=list)
    adjacent_next_skills: list[str] = Field(default_factory=list)
    summary: str = ""


class SkillQuickWin(BaseModel):
    skill: str
    family: str
    unlocked_by: list[str] = Field(default_factory=list)
    demand_count: int = 0
    note: str = ""


class SkillDnaGene(BaseModel):
    skill: str
    status: Literal["matched", "partial", "missing", "used", "not_required"]
    label: str = ""


class SkillDnaProfile(BaseModel):
    id: str
    role_title: str
    company_name: str = ""
    match_score: float = 0.0
    matched_count: int = 0
    missing_count: int = 0
    user_genes: list[SkillDnaGene] = Field(default_factory=list)
    job_genes: list[SkillDnaGene] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    matched_skills: list[str]
    missing_skills: list[str]
    trending_skills: list[str]
    gap_chart: list[dict[str, Any]]
    family_gaps: list[SkillFamilyGap] = Field(default_factory=list)
    quick_win_skills: list[SkillQuickWin] = Field(default_factory=list)
    micro_gap_summary: dict[str, int] = Field(default_factory=dict)
    skill_dna_profiles: list[SkillDnaProfile] = Field(default_factory=list)


class BookmarkCreate(BaseModel):
    external_job_id: str
    job_title: str
    company_name: str | None = None
    location: str | None = None
    employment_type: str | None = None
    posted_date: str | None = None
    apply_link: str | None = None
    description: str | None = None
    ai_score: float = 0
    readiness_score: float = 0
    is_potential_scam: bool = False
    scam_reasons: list[str] = Field(default_factory=list)
    raw_job: dict[str, Any] = Field(default_factory=dict)


class BookmarkOut(BaseModel):
    id: int
    external_job_id: str
    job_title: str
    company_name: str | None = None
    location: str | None = None
    employment_type: str | None = None
    posted_date: str | None = None
    apply_link: str | None = None
    description: str | None = None
    ai_score: float
    readiness_score: float
    status: str
    is_potential_scam: bool
    scam_reasons: list[str]
    raw_job: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class TrackerUpdate(BaseModel):
    bookmark_id: int
    status: Literal["saved", "applied", "interview scheduled", "rejected", "selected"]


class InterviewResponse(BaseModel):
    job_role: str
    technical_questions: list[str]
    hr_questions: list[str]
    coding_practice_links: list[str]
    preparation_tips: list[str]


class InterviewRecordingOut(BaseModel):
    id: int
    target_role: str
    question_key: str
    question_type: str
    question_index: int
    question_text: str
    original_filename: str
    content_type: str
    file_size: int
    file_url: str
    created_at: datetime
    updated_at: datetime


class InterviewRecordingListResponse(BaseModel):
    recordings: list[InterviewRecordingOut] = Field(default_factory=list)


class InterviewRecordingDeleteResponse(BaseModel):
    detail: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(..., min_length=1, max_length=4000)


class ChatbotAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatbotResponse(BaseModel):
    question: str
    answer: str
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    suggestions: list[str] = Field(default_factory=list)  # Smart follow-up suggestions


class SemanticJobResult(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    salary_range: str | None = None
    apply_url: str
    match_score: float = Field(..., ge=0.0, le=1.0)
    missing_skills: list[str] = Field(default_factory=list)
    freshness_score: float = Field(..., ge=0.0, le=1.0)
    source: str = "unknown"


class SemanticRecommendResponse(BaseModel):
    user_id: str
    total: int
    jobs: list[SemanticJobResult]
    generated_at: float


class FeedbackEvent(BaseModel):
    user_id: str
    job_id: str
    action: Literal["view", "click", "apply", "dismiss"]


class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    company: str = Field(..., min_length=2, max_length=200)
    location: str = Field(..., min_length=2, max_length=120)
    stipend_salary: str = Field(..., min_length=1, max_length=120)
    job_type: Literal["internal", "external"] = "internal"
    apply_url: str | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_apply_target(self):
        apply_url = (self.apply_url or "").strip()
        if self.job_type == "external" and not apply_url:
            raise ValueError("apply_url is required for external jobs.")
        if self.job_type == "internal":
            self.apply_url = None
        elif apply_url:
            self.apply_url = apply_url
        return self


class JobOut(BaseModel):
    id: int
    title: str
    company: str
    location: str
    stipend_salary: str
    job_type: Literal["internal", "external"]
    apply_url: str | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    job_id: int
    user_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    resume_link: str = Field(..., min_length=5)
    cover_letter: str | None = Field(default=None, max_length=4000)


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    user_name: str
    email: EmailStr
    resume_link: str
    cover_letter: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MissingSkillCourse(BaseModel):
    name: str
    platform: str = "freeCodeCamp"


class JobCardSchema(BaseModel):
    id: str | int
    title: str
    company: str
    location: str
    job_type: str
    posted_date: str | None = None
    ai_score: float = Field(..., ge=0, le=100)
    readiness_score: float = Field(..., ge=0, le=100)
    skills: list[str] = Field(default_factory=list)
    missing_skills: list[MissingSkillCourse] = Field(default_factory=list)
    description: str
    apply_url: str | None = None


class TrackerSave(BaseModel):
    job_id: str | int
    job: dict[str, Any] = Field(default_factory=dict)


class TrackerSaveOut(BaseModel):
    id: int
    user_id: int
    job_id: str
    raw_job: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Employer Portal Schemas

class EmployerCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=200)
    company_website: str | None = None
    company_description: str | None = None
    industry: str | None = None
    company_size: str | None = None
    location: str | None = None
    contact_email: EmailStr
    password: str = Field(..., min_length=6, max_length=120)
    contact_phone: str | None = None
    logo_url: str | None = None
    ats_system: str | None = None
    careers_page_url: str | None = None
    integration_methods: list[Literal["manual", "csv", "ats_webhook"]] = Field(default_factory=lambda: ["manual"])


class EmployerProfileUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=2, max_length=200)
    company_website: str | None = None
    company_description: str | None = None
    industry: str | None = None
    company_size: str | None = None
    location: str | None = None
    contact_email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=120)
    contact_phone: str | None = None
    logo_url: str | None = None
    ats_system: str | None = None
    careers_page_url: str | None = None


class EmployerOut(BaseModel):
    id: int
    company_name: str
    company_website: str | None = None
    company_description: str | None = None
    industry: str | None = None
    company_size: str | None = None
    location: str | None = None
    contact_email: EmailStr
    contact_phone: str | None = None
    logo_url: str | None = None
    is_verified: bool
    ats_system: str | None = None
    careers_page_url: str | None = None
    integration_methods: list[str] = Field(default_factory=list)
    webhook_url: str | None = None
    webhook_enabled: bool = False
    last_webhook_at: datetime | None = None
    last_sync_at: datetime | None = None
    sync_status: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployerLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class EmployerAuthResponse(Token):
    employer: EmployerOut


# Standard Job Posting Schema
class StandardJobSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    department: str | None = None
    employment_type: Literal["full-time", "part-time", "contract", "internship", "freelance"]
    experience_level: Literal["entry", "mid", "senior", "lead", "executive"] | None = None
    work_location_type: Literal["on-site", "remote", "hybrid"] = "on-site"

    location_city: str | None = None
    location_state: str | None = None
    location_country: str | None = None
    location_postal_code: str | None = None
    is_remote: bool = False

    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "USD"
    salary_period: Literal["hourly", "monthly", "yearly"] = "yearly"
    show_salary: bool = True

    description: str = Field(..., min_length=10)
    requirements: str | None = None
    responsibilities: str | None = None
    benefits: list[str] = Field(default_factory=list)
    skills_required: list[str] = Field(default_factory=list)
    skills_preferred: list[str] = Field(default_factory=list)

    application_deadline: datetime | None = None
    application_url: str | None = None
    application_email: EmailStr | None = None
    published_to_candidates: bool = True


class JobPostingCreate(StandardJobSchema):
    job_id: str = Field(..., min_length=1, max_length=100)  # External job ID

    # ATS integration
    ats_job_id: str | None = None


class JobPostingUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    employment_type: Literal["full-time", "part-time", "contract", "internship", "freelance"] | None = None
    experience_level: Literal["entry", "mid", "senior", "lead", "executive"] | None = None
    work_location_type: Literal["on-site", "remote", "hybrid"] | None = None

    # Location
    location_city: str | None = None
    location_state: str | None = None
    location_country: str | None = None
    location_postal_code: str | None = None
    is_remote: bool | None = None

    # Compensation
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: Literal["hourly", "monthly", "yearly"] | None = None
    show_salary: bool | None = None

    # Job details
    description: str | None = None
    requirements: str | None = None
    responsibilities: str | None = None
    benefits: list[str] | None = None
    skills_required: list[str] | None = None
    skills_preferred: list[str] | None = None

    # Application
    application_deadline: datetime | None = None
    application_url: str | None = None
    application_email: EmailStr | None = None
    published_to_candidates: bool | None = None

    # Status
    status: Literal["active", "paused", "closed", "filled"] | None = None

    # ATS integration
    ats_job_id: str | None = None
    source_reference: str | None = None


class JobPostingOut(BaseModel):
    id: int
    employer_id: int
    job_id: str
    title: str
    department: str | None = None
    employment_type: str
    experience_level: str | None = None
    work_location_type: str

    # Location
    location_city: str | None = None
    location_state: str | None = None
    location_country: str | None = None
    location_postal_code: str | None = None
    is_remote: bool

    # Compensation
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str
    salary_period: str
    show_salary: bool

    # Job details
    description: str
    requirements: str | None = None
    responsibilities: str | None = None
    benefits: list[str]
    skills_required: list[str]
    skills_preferred: list[str]

    # Application
    application_deadline: datetime | None = None
    application_url: str | None = None
    application_email: str | None = None

    # Status and metadata
    status: str
    posted_at: datetime
    updated_at: datetime
    created_at: datetime

    # ATS integration
    ats_job_id: str | None = None
    ats_last_sync: datetime | None = None
    schema_version: str
    source_method: str
    source_reference: str | None = None
    sync_status: str
    published_to_candidates: bool
    closed_at: datetime | None = None

    # Employer info
    employer: EmployerOut

    model_config = ConfigDict(from_attributes=True)


class JobPostingListResponse(BaseModel):
    jobs: list[JobPostingOut]
    total: int
    page: int
    per_page: int


# CSV Upload Schema
class CSVJobUpload(BaseModel):
    jobs: list[JobPostingCreate]


class CSVUploadResponse(BaseModel):
    batch_id: str
    jobs_created: int
    jobs_updated: int
    errors: list[str] = Field(default_factory=list)
    total_rows_processed: int


class EmployerIntegrationConfigUpdate(BaseModel):
    ats_system: str | None = None
    careers_page_url: str | None = None
    integration_methods: list[Literal["manual", "csv", "ats_webhook"]] | None = None
    webhook_url: str | None = None
    webhook_enabled: bool | None = None


class EmployerIntegrationOut(BaseModel):
    employer_id: int
    ats_system: str | None = None
    careers_page_url: str | None = None
    integration_methods: list[str] = Field(default_factory=list)
    webhook_url: str | None = None
    webhook_endpoint: str
    webhook_enabled: bool
    webhook_secret: str
    last_webhook_at: datetime | None = None
    last_sync_at: datetime | None = None
    sync_status: str


# Webhook Schemas for ATS Integration
class WebhookJobCreate(StandardJobSchema):
    job_id: str
    ats_job_id: str | None = None
    status: Literal["active", "paused", "closed", "filled"] = "active"
    source_reference: str | None = None


class WebhookJobUpdate(BaseModel):
    job_id: str
    title: str | None = None
    department: str | None = None
    employment_type: str | None = None
    experience_level: str | None = None
    work_location_type: str | None = None

    # Location
    location_city: str | None = None
    location_state: str | None = None
    location_country: str | None = None
    location_postal_code: str | None = None
    is_remote: bool | None = None

    # Compensation
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    show_salary: bool | None = None

    # Job details
    description: str | None = None
    requirements: str | None = None
    responsibilities: str | None = None
    benefits: list[str] | None = None
    skills_required: list[str] | None = None
    skills_preferred: list[str] | None = None

    # Application
    application_deadline: datetime | None = None
    application_url: str | None = None
    application_email: str | None = None
    published_to_candidates: bool | None = None

    # Status
    status: Literal["active", "paused", "closed", "filled"] | None = None

    # ATS specific
    ats_job_id: str | None = None
    source_reference: str | None = None


class WebhookJobDelete(BaseModel):
    job_id: str
    ats_job_id: str | None = None


class WebhookEvent(BaseModel):
    event_type: Literal["job.created", "job.updated", "job.deleted"]
    timestamp: str  # ISO format
    data: WebhookJobCreate | WebhookJobUpdate | WebhookJobDelete

class WebhookResponse(BaseModel):
    status: str = "success"
    message: str | None = None
    job_id: str | None = None


class MilestoneUpdatePayload(BaseModel):
    step_id: str
    completed: bool


class ProjectUpdatePayload(BaseModel):
    project_id: str
    status: str  # "Not Started", "In Progress", "Completed"
    repo: str | None = None
    demo: str | None = None
    notes: str | None = None
    completed_date: str | None = None


class ResourceUpdatePayload(BaseModel):
    resource_id: str
    started_date: str | None = None
    completed_date: str | None = None
    time_spent: float = 0.0
    percent: float = 0.0


class PracticeSavePayload(BaseModel):
    technical_score: float
    hr_score: float
    confidence_score: float
    response_time: float
    questions_count: int
    correct_count: int


class ProjectAnalysisResponse(BaseModel):
    architecture: str
    code_quality: str
    documentation: str
    portfolio_value: str
    resume_impact: str
    deployment: str
    suggestions: list[str] = Field(default_factory=list)


class RoadmapProgressOut(BaseModel):
    completed_milestones: list[str] = Field(default_factory=list)
    projects: dict = Field(default_factory=dict)
    learning_resources: dict = Field(default_factory=dict)
    weekly_goals: list = Field(default_factory=list)
    achievements: list = Field(default_factory=list)
    interview_practice: dict = Field(default_factory=dict)
    daily_mentor: dict = Field(default_factory=dict)
    learning_streak: int = 0
    last_active_date: str | None = None


class CompanyReadinessOut(BaseModel):
    company_name: str
    match_percentage: float
    required_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    expected_salary: str
    hiring_trend: str
    learning_priority: str


class DailyMentorOut(BaseModel):
    suggestion: str
    date: str


class AchievementOut(BaseModel):
    badges: list[str] = Field(default_factory=list)


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Interviewing", "Offer", "Rejected", "Saved"]

class PDFExportRequest(BaseModel):
    html: str


class RoadmapExportPayload(BaseModel):
    format: Literal["pdf", "markdown", "checklist", "csv"]


class RoadmapExportResponse(BaseModel):
    format: str
    content: str


class ResumeTailorRequest(BaseModel):
    job_title: str
    company_name: str | None = None
    job_description: str


class TailoredBullet(BaseModel):
    original: str
    suggested: str
    justification: str


class ResumeTailorResponse(BaseModel):
    original_skills_found: list[str]
    missing_skills_found: list[str]
    ats_score_before: int
    ats_score_after: int
    tailored_summary: str
    tailored_bullets: list[TailoredBullet]
    cover_letter: str
class GeneratePDFRequest(BaseModel):
    title: str
    content: str
class StarAuditRequest(BaseModel):
    bullets: list[str]

class StarAuditResult(BaseModel):
    original: str
    is_weak: bool
    critique: str
    suggested_rewrite: str

class StarAuditResponse(BaseModel):
    audits: list[StarAuditResult]
