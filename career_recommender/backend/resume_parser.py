from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO
from pathlib import Path

import numpy as np
import pdfplumber

from ml_ranker import extract_skills_from_text

try:
    import fitz
except ImportError:  # pragma: no cover
    fitz = None

try:
    from rapidocr_onnxruntime import RapidOCR
except ImportError:  # pragma: no cover
    RapidOCR = None


SECTION_HEADINGS = {
    "projects": {
        "projects",
        "project",
        "academic projects",
        "personal projects",
        "key projects",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "internships",
        "internship",
    },
    "skills": {
        "skills",
        "technical skills",
        "tech stack",
        "tools",
        "technologies",
        "core competencies",
    },
    "certifications": {
        "certifications",
        "certification",
        "certificates",
        "certificate",
        "licenses",
        "license",
    },
}

TOOL_SKILLS = {
    "aws",
    "azure",
    "bootstrap",
    "css",
    "docker",
    "excel",
    "express",
    "fastapi",
    "figma",
    "flask",
    "gcp",
    "git",
    "github",
    "html",
    "javascript",
    "jwt",
    "kubernetes",
    "linux",
    "mongodb",
    "mysql",
    "next.js",
    "node.js",
    "numpy",
    "oauth",
    "pandas",
    "postgresql",
    "power bi",
    "python",
    "pytorch",
    "react",
    "redis",
    "scikit-learn",
    "spring boot",
    "sql",
    "sqlite",
    "tableau",
    "tailwind css",
    "tensorflow",
    "typescript",
}

DOMAIN_SKILL_MAP = {
    "Software Development": {"python", "java", "javascript", "typescript", "fastapi", "django", "flask", "spring boot", "api", "jwt", "oauth"},
    "Frontend Development": {"html", "css", "javascript", "typescript", "react", "next.js", "tailwind css", "bootstrap", "ui/ux", "figma"},
    "Data & Analytics": {"sql", "excel", "power bi", "tableau", "data analysis", "data visualization", "pandas", "numpy", "financial modeling"},
    "AI & Machine Learning": {"machine learning", "deep learning", "scikit-learn", "tensorflow", "pytorch", "nlp", "llm", "rag", "agents"},
    "Cloud & DevOps": {"docker", "kubernetes", "aws", "azure", "gcp", "linux", "git", "github", "deployment"},
    "Marketing": {"seo", "content marketing", "digital marketing", "google analytics", "salesforce"},
}

ROLE_HINTS = [
    "data analyst",
    "data scientist",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "software engineer",
    "ai engineer",
    "machine learning engineer",
    "ui/ux designer",
    "digital marketing specialist",
    "business analyst",
]

PROJECT_TERMS = {
    "app",
    "application",
    "assistant",
    "automation",
    "bot",
    "clone",
    "dashboard",
    "detector",
    "engine",
    "management",
    "model",
    "platform",
    "portal",
    "prediction",
    "predictor",
    "recommender",
    "system",
    "tool",
    "tracker",
    "website",
}

ACTION_VERBS = {
    "achieved",
    "analyzed",
    "built",
    "created",
    "delivered",
    "designed",
    "developed",
    "implemented",
    "improved",
    "led",
    "managed",
    "optimized",
}

ROLE_TERMS = {
    "analyst",
    "architect",
    "consultant",
    "coordinator",
    "designer",
    "developer",
    "engineer",
    "executive",
    "intern",
    "manager",
    "specialist",
    "student",
}

COMPANY_HINTS = {
    "inc",
    "llc",
    "ltd",
    "limited",
    "corp",
    "company",
    "technologies",
    "solutions",
    "systems",
    "labs",
    "services",
}

MONTH_PATTERN = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*"
YEAR_PATTERN = r"(?:19|20)\d{2}"
DATE_RANGE_RE = re.compile(
    rf"\b(?:{MONTH_PATTERN}\s+)?({YEAR_PATTERN})\s*(?:-|to|–|—)\s*(?:(?:{MONTH_PATTERN}\s+)?({YEAR_PATTERN})|(present|current|now))\b",
    re.IGNORECASE,
)

_ocr_engine: RapidOCR | None = None


def _get_ocr_engine():
    global _ocr_engine
    if RapidOCR is None:
        return None
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine


def _extract_text_from_pdf_via_ocr(file_bytes: bytes) -> str:
    if fitz is None:
        return ""

    engine = _get_ocr_engine()
    if engine is None:
        return ""

    document = fitz.open(stream=file_bytes, filetype="pdf")
    extracted_pages: list[str] = []

    try:
        for page in document:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            result, _ = engine(image)
            lines = [item[1].strip() for item in (result or []) if len(item) > 1 and str(item[1]).strip()]
            page_text = "\n".join(lines).strip()
            if page_text:
                extracted_pages.append(page_text)
    finally:
        document.close()

    return "\n\n".join(extracted_pages).strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""

    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        text = "\n".join((page.extract_text() or "") for page in pdf.pages).strip()

    if text:
        return text

    if fitz is not None:
        document = fitz.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in document).strip()
        document.close()
    if text:
        return text

    return _extract_text_from_pdf_via_ocr(file_bytes)


def _clean_line(line: str) -> str:
    line = re.sub(r"^[\s\-\*\u2022\u25cf\u25aa\u25e6]+", "", line or "").strip()
    line = re.sub(r"\s+", " ", line)
    return line.strip(" |")


def _normalized_heading(line: str) -> str:
    return re.sub(r"[^a-z ]+", "", (line or "").lower()).strip()


def _match_heading(line: str) -> str | None:
    normalized = _normalized_heading(line)
    if not normalized:
        return None

    for section, headings in SECTION_HEADINGS.items():
        if normalized in headings:
            return section
        if len(normalized.split()) <= 4 and any(normalized.startswith(heading) for heading in headings):
            return section
    return None


def _sectionize_text(text: str) -> dict[str, list[str]]:
    sections = {key: [] for key in SECTION_HEADINGS}
    current_section: str | None = None

    for raw_line in (text or "").splitlines():
        line = _clean_line(raw_line)
        if not line:
            continue

        heading = _match_heading(line)
        if heading:
            current_section = heading
            continue

        if current_section:
            sections[current_section].append(line)

    return sections


def _dedupe_preserve_order(items: list[str], limit: int) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()

    for item in items:
        normalized = item.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(normalized)
        if len(cleaned) >= limit:
            break
    return cleaned


def _looks_like_contact(candidate: str) -> bool:
    lowered = candidate.lower()
    return lowered.startswith(("email", "phone", "linkedin", "github", "address", "portfolio")) or "@" in lowered


def _strip_leading_label(candidate: str) -> str:
    return re.sub(
        r"^(project|projects|experience|work experience|professional experience|internship|internships)\s*[:\-]\s*",
        "",
        candidate,
        flags=re.IGNORECASE,
    ).strip()


def _title_case_ratio(candidate: str) -> float:
    tokens = [token for token in re.split(r"\s+", candidate) if token]
    if not tokens:
        return 0.0
    titled = sum(1 for token in tokens if token[:1].isupper())
    return titled / len(tokens)


def _normalize_project_entry(candidate: str) -> str:
    candidate = _strip_leading_label(candidate)
    candidate = re.sub(r"\s{2,}", " ", candidate).strip(" -|")
    if " | " in candidate:
        left, right = candidate.split(" | ", 1)
        if len(left.split()) <= 10:
            return f"{left.strip()} ({right.strip()})"
    if " - " in candidate:
        left, right = candidate.split(" - ", 1)
        if len(left.split()) <= 10 and len(right.split()) <= 12:
            return f"{left.strip()} ({right.strip()})"
    return candidate


def _project_line_score(candidate: str) -> int:
    lowered = candidate.lower()
    tokens = re.findall(r"[a-zA-Z0-9\+\#\.]+", lowered)
    score = 0

    if len(candidate) < 10 or len(candidate) > 140:
        return -5
    if _looks_like_contact(candidate):
        return -10
    if lowered.endswith("."):
        score -= 1
    if any(term in tokens for term in PROJECT_TERMS):
        score += 4
    if "|" in candidate or ":" in candidate:
        score += 2
    if 2 <= len(tokens) <= 10:
        score += 2
    if _title_case_ratio(candidate) >= 0.45:
        score += 1
    if any(verb in lowered.split()[:2] for verb in ACTION_VERBS):
        score -= 3
    if any(marker in lowered for marker in ("responsible for", "worked on", "experience in")):
        score -= 2
    return score


def _experience_line_score(candidate: str) -> int:
    lowered = candidate.lower()
    tokens = re.findall(r"[a-zA-Z0-9\+\#\.]+", lowered)
    score = 0

    if len(candidate) < 8 or len(candidate) > 180:
        return -5
    if _looks_like_contact(candidate):
        return -10
    if DATE_RANGE_RE.search(candidate):
        score += 4
    if any(term in tokens for term in ROLE_TERMS):
        score += 4
    if any(hint in tokens for hint in COMPANY_HINTS):
        score += 2
    if any(verb in lowered.split()[:2] for verb in ACTION_VERBS):
        score += 2
    if any(char.isdigit() for char in candidate) and "%" in candidate:
        score += 2
    if any(char.isdigit() for char in candidate) and any(word in lowered for word in ("users", "customers", "projects", "apis", "dashboards")):
        score += 1
    return score


def _extract_generic_entries(lines: list[str], limit: int = 6) -> list[str]:
    entries: list[str] = []

    for line in lines:
        candidate = _clean_line(line)
        if len(candidate) < 8 or len(candidate) > 180:
            continue
        if _looks_like_contact(candidate):
            continue
        entries.append(candidate)

    return _dedupe_preserve_order(entries, limit)


def _extract_project_entries(lines: list[str], limit: int = 6) -> list[str]:
    scored: list[tuple[int, str]] = []

    for line in lines:
        candidate = _normalize_project_entry(_clean_line(line))
        score = _project_line_score(candidate)
        if score < 0:
            continue
        scored.append((score, candidate))

    if not scored:
        return _extract_generic_entries(lines, limit=limit)

    scored.sort(key=lambda item: (-item[0], len(item[1])))
    return _dedupe_preserve_order([candidate for _, candidate in scored], limit)


def _extract_experience_entries(lines: list[str], limit: int = 6) -> list[str]:
    scored: list[tuple[int, str]] = []

    for line in lines:
        candidate = _strip_leading_label(_clean_line(line))
        score = _experience_line_score(candidate)
        if score < 0:
            continue
        scored.append((score, candidate))

    if not scored:
        return _extract_generic_entries(lines, limit=limit)

    scored.sort(key=lambda item: (-item[0], len(item[1])))
    return _dedupe_preserve_order([candidate for _, candidate in scored], limit)


def _extract_section_entries(lines: list[str], limit: int = 6) -> list[str]:
    return _extract_generic_entries(lines, limit)


def _extract_certificates(lines: list[str], filename: str | None = None, document_type: str | None = None) -> list[str]:
    results: list[str] = []

    for line in lines:
        candidate = _clean_line(line)
        if len(candidate) < 6:
            continue
        lowered = candidate.lower()
        if lowered.startswith("this certificate"):
            continue
        if any(token in lowered for token in ("certificate", "certification", "certified", "license", "licensed")):
            results.append(candidate)

    if document_type == "certificate" and filename:
        guessed = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
        if guessed:
            results.append(guessed.title())

    return _dedupe_preserve_order(results, 8)


def _infer_years_of_experience(text: str, sections: dict[str, list[str]] = None) -> float:
    lowered = (text or "").lower()
    # Stricter regex: must be followed by "of experience", "experience", "exp", or "work"
    explicit_matches = [float(value) for value in re.findall(r"(\d+(?:\.\d+)?)\+?\s*(?:years|year|yrs|yr)(?:\s+of)?\s+(?:experience|exp|work)\b", lowered)]
    
    inferred_ranges: list[float] = []
    current_year = datetime.utcnow().year

    # Limit date range scanning to the experience section if available
    experience_text = ""
    if sections and "experience" in sections:
        experience_text = "\n".join(sections["experience"]).lower()
    else:
        experience_text = lowered

    for start_year, end_year, ongoing in DATE_RANGE_RE.findall(experience_text):
        start = int(start_year)
        end = current_year if ongoing else int(end_year)
        if end >= start:
            inferred_ranges.append(round(end - start + 0.3, 1))

    return max(explicit_matches + inferred_ranges, default=0.0)


def _infer_experience_level(years: float, text: str) -> str:
    lowered = (text or "").lower()
    if "student" in lowered:
        return "student"
    if years <= 0:
        return "fresher"
    if years < 2:
        return "entry"
    if years < 5:
        return "mid"
    if years < 8:
        return "senior"
    return "lead"


def _infer_domain(skills: list[str]) -> str:
    best_label = ""
    best_score = 0

    for label, domain_skills in DOMAIN_SKILL_MAP.items():
        score = sum(1 for skill in skills if skill in domain_skills)
        if score > best_score:
            best_label = label
            best_score = score

    return best_label or "Technology"


def _infer_role(text: str) -> str:
    lowered = (text or "").lower()
    for role in ROLE_HINTS:
        if role in lowered:
            title = role.title()
            if title == "Full Stack Developer":
                return "Fullstack Developer"
            return title
    if any(token in lowered for token in ("fastapi", "django", "flask", "spring boot", "jwt", "oauth")):
        return "Backend Developer"
    if any(token in lowered for token in ("react", "next.js", "tailwind css", "figma")):
        return "Frontend Developer"
    if any(token in lowered for token in ("sql", "power bi", "tableau", "excel", "data analysis")):
        return "Data Analyst"
    if any(token in lowered for token in ("machine learning", "tensorflow", "pytorch", "llm", "rag")):
        return "AI Engineer"
    return ""


def _is_likely_resume(text: str) -> bool:
    lowered = (text or "").lower()
    if not lowered.strip():
        return False

    # Standard section titles or indicators in resumes
    resume_keywords = [
        "experience", "work history", "employment", "internship", "professional history",
        "education", "academic", "university", "college", "school", "qualification",
        "skills", "technical skills", "technologies", "tech stack", "tools", "competencies",
        "projects", "personal projects", "academic projects",
        "certifications", "certificates", "publications", "achievements"
    ]

    # Count matching unique resume keywords
    match_count = sum(1 for kw in resume_keywords if kw in lowered)

    # Look for contact details (email, phone numbers, social/dev links)
    has_email = "@" in lowered
    
    import re
    has_phone = any(p in lowered for p in ["phone", "mobile", "contact", "tel:"]) or re.search(r"\b\d{10}\b", lowered) is not None
    has_profile = any(p in lowered for p in ["linkedin.com", "github.com", "portfolio"])

    # If the document is extremely long (like a textbook, monthly current affairs digest, or article), it's not a resume.
    # A single page or two page resume is typically under 1200 words. Let's set a safe limit of 2500 words.
    word_count = len(lowered.split())
    # If the document has more than 20 words and less than 3000 words, we assume it's a valid document
    # and let the AI try its best. This prevents blocking valid resumes that don't match our strict keywords.
    if 20 <= word_count <= 3000:
        return True

    return False


def analyze_document(file_bytes: bytes, filename: str, document_type: str) -> dict:
    text = extract_text_from_pdf(file_bytes)
    if document_type == "resume" and not _is_likely_resume(text):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400, 
            detail="Could not extract enough text from the PDF. Ensure it is a text-based resume (not a scanned image) and contains standard sections like Experience and Skills."
        )
    sections = _sectionize_text(text)
    skills = extract_skills_from_text(text)
    tools = [skill for skill in skills if skill in TOOL_SKILLS]
    projects = _extract_project_entries(sections["projects"], limit=6)
    experience_highlights = _extract_experience_entries(sections["experience"], limit=6)
    certificates = _extract_certificates(sections["certifications"], filename=filename, document_type=document_type)
    years_of_experience = _infer_years_of_experience(text, sections)

    return {
        "document_type": document_type,
        "filename": filename,
        "text": text,
        "skills": skills,
        "tools": tools,
        "projects": projects,
        "experience_highlights": experience_highlights,
        "certificates": certificates,
        "target_role": _infer_role(text),
        "years_of_experience": years_of_experience,
        "experience_level": _infer_experience_level(years_of_experience, text),
    }


def analyze_documents(documents: list[dict]) -> dict:
    analyzed = [
        analyze_document(item["bytes"], item["filename"], item["document_type"])
        for item in documents
    ]

    combined_text = "\n\n".join(item["text"] for item in analyzed if item["text"]).strip()
    combined_skills = _dedupe_preserve_order(
        [skill for item in analyzed for skill in item["skills"]],
        limit=50,
    )
    combined_tools = _dedupe_preserve_order(
        [tool for item in analyzed for tool in item["tools"]],
        limit=30,
    )
    combined_projects = _dedupe_preserve_order(
        [project for item in analyzed for project in item["projects"]],
        limit=8,
    )
    combined_experience = _dedupe_preserve_order(
        [item for analyzed_doc in analyzed for item in analyzed_doc["experience_highlights"]],
        limit=8,
    )
    combined_certificates = _dedupe_preserve_order(
        [item for analyzed_doc in analyzed for item in analyzed_doc["certificates"]],
        limit=10,
    )

    years_of_experience = max((item["years_of_experience"] for item in analyzed), default=0.0)
    experience_level = _infer_experience_level(years_of_experience, combined_text)
    suggested_domain = _infer_domain(combined_skills)
    target_role = next((item["target_role"] for item in analyzed if item["target_role"]), "")

    document_summaries = [
        {
            "document_type": item["document_type"],
            "filename": item["filename"],
            "extracted_text_preview": item["text"][:700],
            "extracted_skills": item["skills"][:12],
            "detected_projects": item["projects"][:4],
            "detected_certificates": item["certificates"][:4],
        }
        for item in analyzed
    ]

    return {
        "text": combined_text,
        "skills": combined_skills,
        "tools": combined_tools,
        "projects": combined_projects,
        "experience_highlights": combined_experience,
        "certificates": combined_certificates,
        "years_of_experience": round(years_of_experience, 1),
        "experience_level": experience_level,
        "suggested_domain": suggested_domain,
        "target_role": target_role,
        "documents": document_summaries,
    }
