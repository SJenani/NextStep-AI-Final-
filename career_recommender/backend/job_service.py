from sqlalchemy.exc import OperationalError

from database import SessionLocal, init_db
import models


def _join_location_parts(*parts: str | None) -> str | None:
    cleaned: list[str] = []
    for part in parts:
        value = " ".join((part or "").split()).strip()
        if value:
            cleaned.append(value)
    return ", ".join(cleaned) if cleaned else None


def _job_matches_mode(job_posting: models.JobPosting, mode: str) -> bool:
    employment_type = (job_posting.employment_type or "").strip().lower()
    if mode == "internship":
        return employment_type == "internship"
    return employment_type != "internship"


def _tokenize_query(value: str | None) -> set[str]:
    cleaned = (value or "").lower().replace("fullstack", "full stack").replace("/", " ").replace("-", " ")
    return {
        token
        for token in cleaned.split()
        if len(token) > 2
    }


def _build_public_job_record(job_posting: models.JobPosting) -> dict:
    location = _join_location_parts(
        job_posting.location_city,
        job_posting.location_state,
        job_posting.location_country,
    )

    description_parts = [
        job_posting.description,
        job_posting.requirements,
        job_posting.responsibilities,
        "Skills: " + ", ".join(job_posting.skills_required or []) if job_posting.skills_required else "",
    ]
    combined_description = "\n\n".join(part for part in description_parts if part)
    apply_link = job_posting.application_url
    if not apply_link and job_posting.application_email:
        apply_link = f"mailto:{job_posting.application_email}"
    if not apply_link:
        apply_link = (
            job_posting.employer.careers_page_url
            or job_posting.employer.company_website
        )

    source_label = "ATS Webhook" if job_posting.source_method == "ats_webhook" else "Employer Portal"
    apply_provider = "ATS" if job_posting.source_method == "ats_webhook" else "company website"

    return {
        "external_job_id": job_posting.job_id,
        "job_title": job_posting.title,
        "company_name": job_posting.employer.company_name,
        "company_website": job_posting.employer.company_website or job_posting.employer.careers_page_url,
        "contact_email": job_posting.application_email or job_posting.employer.contact_email,
        "location": location or ("Remote" if job_posting.is_remote else job_posting.employer.location or "Not specified"),
        "employment_type": job_posting.employment_type,
        "posted_date": job_posting.posted_at.isoformat() if job_posting.posted_at else None,
        "apply_link": apply_link,
        "apply_provider": apply_provider,
        "is_direct_apply": True,
        "apply_link_verified": True,
        "apply_link_note": "Direct first-party company-connected job on this platform.",
        "job_description": combined_description,
        "job_summary": (job_posting.description or "")[:280],
        "salary_min": job_posting.salary_min,
        "salary_max": job_posting.salary_max,
        "source": source_label,
        "schema_version": job_posting.schema_version,
        "source_method": job_posting.source_method,
        "source_reference": job_posting.source_reference,
        "published_to_candidates": job_posting.published_to_candidates,
    }


def get_all_jobs():
    db = SessionLocal()
    try:
        all_jobs = []

        # Get legacy jobs (if table exists)
        try:
            legacy_jobs = db.query(models.Job).all()
            for j in legacy_jobs:
                all_jobs.append({
                    "id": f"legacy_{j.id}",
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "description": j.description,
                    "skills": j.skills or [],
                    "salary_range": j.salary_range,
                    "apply_url": j.apply_url,
                    "posted_at": j.posted_at,
                    "source": j.source,
                    "is_remote": j.is_remote,
                    "employment_type": "full-time",  # Default assumption
                    "experience_level": None,
                })
        except OperationalError as exc:
            if "no such table: jobs" not in str(exc).lower():
                raise
            # Table doesn't exist, skip legacy jobs

        # Get employer job postings
        try:
            job_postings = db.query(models.JobPosting).filter(
                models.JobPosting.status == "active",
                models.JobPosting.published_to_candidates.is_(True),
            ).all()

            for jp in job_postings:
                # Build location string
                location_parts = []
                if jp.location_city:
                    location_parts.append(jp.location_city)
                if jp.location_state:
                    location_parts.append(jp.location_state)
                if jp.location_country:
                    location_parts.append(jp.location_country)
                location = ", ".join(location_parts) if location_parts else None

                # Build salary range string
                salary_range = None
                if jp.show_salary and jp.salary_min and jp.salary_max:
                    salary_range = f"{jp.salary_currency} {jp.salary_min:,.0f} - {jp.salary_max:,.0f} per {jp.salary_period}"
                elif jp.show_salary and jp.salary_min:
                    salary_range = f"{jp.salary_currency} {jp.salary_min:,.0f}+ per {jp.salary_period}"

                all_jobs.append({
                    "id": f"employer_{jp.id}",
                    "title": jp.title,
                    "company": jp.employer.company_name,
                    "location": location,
                    "description": jp.description,
                    "skills": jp.skills_required + jp.skills_preferred,
                    "salary_range": salary_range,
                    "apply_url": jp.application_url,
                    "posted_at": jp.posted_at,
                    "source": "employer_portal",
                    "is_remote": jp.is_remote,
                    "employment_type": jp.employment_type,
                    "experience_level": jp.experience_level,
                    "department": jp.department,
                    "benefits": jp.benefits,
                    "requirements": jp.requirements,
                    "responsibilities": jp.responsibilities,
                })
        except OperationalError:
            # Job postings table doesn't exist yet, skip
            pass

        return all_jobs
    finally:
        db.close()


def get_platform_jobs(profile, mode: str, limit: int = 40, query: str | None = None) -> list[dict]:
    db = SessionLocal()
    try:
        job_postings = (
            db.query(models.JobPosting)
            .join(models.Employer)
            .filter(
                models.JobPosting.status == "active",
                models.JobPosting.published_to_candidates.is_(True),
            )
            .order_by(models.JobPosting.updated_at.desc(), models.JobPosting.posted_at.desc())
            .all()
        )
    except OperationalError as exc:
        if "no such table" in str(exc).lower() or "no such column" in str(exc).lower():
            db.close()
            return []
        db.close()
        raise

    preferred_location = " ".join((getattr(profile, "location", None) or "").split()).lower()
    query_tokens = _tokenize_query(query or getattr(profile, "desired_role", None) or getattr(profile, "domain", None))

    scored_jobs: list[tuple[tuple[int, float], dict]] = []
    for job_posting in job_postings:
        if not _job_matches_mode(job_posting, mode):
            continue

        job_location = _join_location_parts(
            job_posting.location_city,
            job_posting.location_state,
            job_posting.location_country,
        ) or (job_posting.employer.location or "")
        haystack = " ".join(
            [
                job_posting.title or "",
                job_posting.department or "",
                job_posting.description or "",
                job_posting.requirements or "",
                " ".join(job_posting.skills_required or []),
                " ".join(job_posting.skills_preferred or []),
            ]
        ).lower()

        role_overlap = len(query_tokens & _tokenize_query(haystack))
        location_match = int(bool(preferred_location and preferred_location in (job_location or "").lower()))
        freshness = job_posting.updated_at.timestamp() if job_posting.updated_at else 0.0
        scored_jobs.append(
            (
                (location_match + role_overlap, freshness),
                _build_public_job_record(job_posting),
            )
        )

    db.close()
    scored_jobs.sort(key=lambda item: item[0], reverse=True)
    return [job for _, job in scored_jobs[:limit]]
