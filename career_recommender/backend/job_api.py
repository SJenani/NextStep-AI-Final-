import asyncio
import copy
import os
import re
import time
from urllib.parse import urlparse

from fastapi import APIRouter, Request

import httpx
from env_config import load_backend_env

from job_service import get_platform_jobs

router = APIRouter()

load_backend_env()

JOB_SEARCH_CACHE_TTL_SECONDS = int(os.getenv("JOB_SEARCH_CACHE_TTL_SECONDS", "900"))
JOB_SEARCH_FALLBACK_CACHE_TTL_SECONDS = int(os.getenv("JOB_SEARCH_FALLBACK_CACHE_TTL_SECONDS", "180"))
JOB_SEARCH_CACHE_MAX_ENTRIES = int(os.getenv("JOB_SEARCH_CACHE_MAX_ENTRIES", "128"))

_JOB_SEARCH_CACHE: dict[str, tuple[float, dict]] = {}
_JOB_SEARCH_LOCKS: dict[str, asyncio.Lock] = {}

ATS_HOST_KEYWORDS = (
    "greenhouse",
    "lever",
    "workday",
    "smartrecruiters",
    "ashby",
    "workable",
    "job-boards",
    "jobs.",
)

AGGREGATOR_HOST_KEYWORDS = (
    "adzuna",
    "linkedin",
    "ziprecruiter",
    "monster",
    "talent.com",
    "jooble",
    "glassdoor",
    "indeed",
    "beBee".lower(),
)

OFFICIAL_COMPANY_HOSTS = {
    "amazon": ("amazon.jobs", "amazon.com"),
}

FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "yahoo.com",
    "ymail.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
}

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
ROLE_STOP_WORDS = {
    "and",
    "associate",
    "developer",
    "engineer",
    "for",
    "fresher",
    "full",
    "in",
    "intern",
    "internship",
    "job",
    "jr",
    "junior",
    "of",
    "role",
    "senior",
    "software",
    "the",
    "time",
    "trainee",
    "with",
}

COMPANY_NAME_STOP_WORDS = {
    "co",
    "company",
    "corp",
    "corporation",
    "group",
    "inc",
    "india",
    "limited",
    "llc",
    "ltd",
    "private",
    "pvt",
    "services",
    "solutions",
    "technologies",
    "technology",
}

SUMMARY_DROP_PATTERNS = (
    re.compile(r"\bno compensation\b", re.IGNORECASE),
    re.compile(r"\bno salary\b", re.IGNORECASE),
    re.compile(r"\bno stipend\b", re.IGNORECASE),
    re.compile(r"\bpay:\s*from\b", re.IGNORECASE),
    re.compile(r"\bwfh is not available\b", re.IGNORECASE),
    re.compile(r"\bwork from (our )?.+ office only\b", re.IGNORECASE),
    re.compile(r"\bwilling to work without (any )?pay\b", re.IGNORECASE),
    re.compile(r"\bwilling to work from .+ office\b", re.IGNORECASE),
    re.compile(r"\bapplication question", re.IGNORECASE),
    re.compile(r"\bwork location:\s*in person\b", re.IGNORECASE),
    re.compile(r"\blocation:\b", re.IGNORECASE),
)

SUMMARY_PRIORITY_PATTERNS = (
    re.compile(r"\bpython\b", re.IGNORECASE),
    re.compile(r"\bllm\b", re.IGNORECASE),
    re.compile(r"\brag\b", re.IGNORECASE),
    re.compile(r"\bagent\b", re.IGNORECASE),
    re.compile(r"\blangchain\b", re.IGNORECASE),
    re.compile(r"\bllamaindex\b", re.IGNORECASE),
    re.compile(r"\bcrewai\b", re.IGNORECASE),
    re.compile(r"\bautogen\b", re.IGNORECASE),
    re.compile(r"\bdata\b", re.IGNORECASE),
    re.compile(r"\banalytics?\b", re.IGNORECASE),
    re.compile(r"\bmachine learning\b", re.IGNORECASE),
    re.compile(r"\bresponsibilit", re.IGNORECASE),
    re.compile(r"\bimplement\b", re.IGNORECASE),
    re.compile(r"\bbuild\b", re.IGNORECASE),
)

CURATED_COMPANIES = [
    {
        "name": "Tata Consultancy Services (TCS)",
        "careers_url": "https://www.tcs.com/careers",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Kolkata", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "python", "cloud", "data", "testing", "support", "fresher", "intern"],
    },
    {
        "name": "Infosys",
        "careers_url": "https://www.infosys.com/careers/",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mysuru", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "python", "cloud", "data", "testing", "fresher", "intern"],
    },
    {
        "name": "Wipro",
        "careers_url": "https://careers.wipro.com/",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "cloud", "data", "cybersecurity", "testing", "fresher"],
    },
    {
        "name": "HCL Technologies",
        "careers_url": "https://www.hcltech.com/careers",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Noida", "Bengaluru", "Hyderabad", "Pune", "India"],
        "role_keywords": ["software", "developer", "engineer", "embedded", "cloud", "data", "testing", "fresher"],
    },
    {
        "name": "Tech Mahindra",
        "careers_url": "https://www.techmahindra.com/en-in/careers/",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Pune", "Bengaluru", "Hyderabad", "Noida", "India"],
        "role_keywords": ["software", "developer", "engineer", "telecom", "cloud", "data", "support", "testing"],
    },
    {
        "name": "LTIMindtree",
        "careers_url": "https://www.ltimindtree.com/careers/",
        "category": "Indian IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "data", "analytics", "java", "testing"],
    },
    {
        "name": "Accenture",
        "careers_url": "https://www.accenture.com/in-en/careers",
        "category": "Global IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Gurugram", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "data", "analytics", "consulting", "testing", "fresher"],
    },
    {
        "name": "Cognizant",
        "careers_url": "https://careers.cognizant.com/india-en/",
        "category": "Global IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Kolkata", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "cloud", "data", "testing", "healthcare", "fresher"],
    },
    {
        "name": "Capgemini",
        "careers_url": "https://www.capgemini.com/in-en/careers/",
        "category": "Global IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "data", "analytics", "testing", "fresher"],
    },
    {
        "name": "IBM India",
        "careers_url": "https://www.ibm.com/in-en/careers",
        "category": "Global IT Services",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Gurugram", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "data", "ai", "machine learning", "security"],
    },
    {
        "name": "Deloitte",
        "careers_url": "https://www.deloitte.com/in/en/careers.html",
        "category": "Consulting Tech",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Mumbai", "Gurugram", "India"],
        "role_keywords": ["software", "developer", "data", "analytics", "consulting", "cybersecurity", "cloud"],
    },
    {
        "name": "Microsoft India",
        "careers_url": "https://careers.microsoft.com/",
        "category": "Product / MNC",
        "locations": ["Hyderabad", "Bengaluru", "Noida", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "azure", "ai", "data", "frontend", "backend"],
    },
    {
        "name": "Google India",
        "careers_url": "https://www.google.com/about/careers/applications/",
        "category": "Product / MNC",
        "locations": ["Bengaluru", "Hyderabad", "Gurugram", "Mumbai", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "ai", "machine learning", "data", "frontend", "backend"],
    },
    {
        "name": "Amazon India / AWS",
        "careers_url": "https://www.amazon.jobs/en/locations/india",
        "category": "Product / MNC",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Gurugram", "India"],
        "role_keywords": ["software", "developer", "engineer", "cloud", "aws", "data", "backend", "devops"],
    },
    {
        "name": "Oracle India",
        "careers_url": "https://www.oracle.com/in/careers/",
        "category": "Product / MNC",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "Pune", "India"],
        "role_keywords": ["software", "developer", "engineer", "database", "java", "cloud", "data"],
    },
    {
        "name": "SAP Labs India",
        "careers_url": "https://www.sap.com/india/about/careers.html",
        "category": "Product / MNC",
        "locations": ["Bengaluru", "Gurugram", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "cloud", "data", "analytics", "enterprise"],
    },
    {
        "name": "Zoho Corporation",
        "careers_url": "https://www.zoho.com/careers/",
        "category": "Indian Product / SaaS",
        "locations": ["Chennai", "Coimbatore", "Tenkasi", "India"],
        "role_keywords": ["software", "developer", "engineer", "frontend", "backend", "java", "javascript", "testing", "fresher", "intern"],
    },
    {
        "name": "Freshworks",
        "careers_url": "https://www.freshworks.com/company/careers/",
        "category": "Indian Product / SaaS",
        "locations": ["Chennai", "Bengaluru", "Hyderabad", "India"],
        "role_keywords": ["software", "developer", "engineer", "frontend", "backend", "javascript", "react", "data", "product"],
    },
    {
        "name": "Razorpay",
        "careers_url": "https://razorpay.com/jobs/",
        "category": "Indian Product / Fintech",
        "locations": ["Bengaluru", "India"],
        "role_keywords": ["software", "developer", "engineer", "backend", "frontend", "payments", "fintech", "data"],
    },
    {
        "name": "PhonePe",
        "careers_url": "https://www.phonepe.com/careers/",
        "category": "Indian Product / Fintech",
        "locations": ["Bengaluru", "Pune", "India"],
        "role_keywords": ["software", "developer", "engineer", "backend", "frontend", "payments", "fintech", "data"],
    },
    {
        "name": "Flipkart",
        "careers_url": "https://www.flipkartcareers.com/",
        "category": "Indian Product / Ecommerce",
        "locations": ["Bengaluru", "Chennai", "India"],
        "role_keywords": ["software", "developer", "engineer", "backend", "frontend", "data", "analytics", "supply chain"],
    },
    {
        "name": "Naukri.com / InfoEdge",
        "careers_url": "https://www.infoedge.in/careers/",
        "category": "Indian Product / Internet",
        "locations": ["Noida", "Bengaluru", "India"],
        "role_keywords": ["software", "developer", "engineer", "frontend", "backend", "data", "product"],
    },
    {
        "name": "BrowserStack",
        "careers_url": "https://www.browserstack.com/careers",
        "category": "Indian Product / SaaS",
        "locations": ["Mumbai", "Bengaluru", "Remote", "India"],
        "role_keywords": ["software", "developer", "engineer", "testing", "qa", "automation", "frontend", "backend"],
    },
    {
        "name": "NVIDIA India",
        "careers_url": "https://www.nvidia.com/en-in/about-nvidia/careers/",
        "category": "Semiconductor / AI",
        "locations": ["Bengaluru", "Hyderabad", "Pune", "India"],
        "role_keywords": ["software", "developer", "engineer", "ai", "machine learning", "embedded", "gpu", "systems", "data"],
    },
    {
        "name": "AMD India",
        "careers_url": "https://www.amd.com/en/corporate/careers.html",
        "category": "Semiconductor / Embedded",
        "locations": ["Bengaluru", "Hyderabad", "India"],
        "role_keywords": ["software", "developer", "engineer", "embedded", "systems", "hardware", "verification", "driver"],
    },
    {
        "name": "Texas Instruments India",
        "careers_url": "https://careers.ti.com/",
        "category": "Semiconductor / Embedded",
        "locations": ["Bengaluru", "India"],
        "role_keywords": ["software", "developer", "engineer", "embedded", "systems", "hardware", "firmware", "electronics"],
    },
    {
        "name": "JPMorgan Chase India",
        "careers_url": "https://careers.jpmorgan.com/in/en/home",
        "category": "Banking / Finance Tech",
        "locations": ["Bengaluru", "Hyderabad", "Mumbai", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "python", "data", "cloud", "finance", "backend"],
    },
    {
        "name": "Goldman Sachs India",
        "careers_url": "https://www.goldmansachs.com/careers/",
        "category": "Banking / Finance Tech",
        "locations": ["Bengaluru", "Hyderabad", "India"],
        "role_keywords": ["software", "developer", "engineer", "java", "python", "data", "finance", "analytics"],
    },
    {
        "name": "Visa India",
        "careers_url": "https://usa.visa.com/careers.html",
        "category": "Banking / Finance Tech",
        "locations": ["Bengaluru", "India"],
        "role_keywords": ["software", "developer", "engineer", "payments", "fintech", "data", "security", "backend"],
    },
]


def _join_location_parts(*parts: str | None) -> str | None:
    cleaned = []
    seen = set()
    for part in parts:
        value = " ".join((part or "").split()).strip()
        if not value:
            continue
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(value)
    return ", ".join(cleaned) if cleaned else None


def _has_live_job_feed() -> bool:
    rapidapi_key = os.getenv("RAPIDAPI_KEY")
    return bool(rapidapi_key and not rapidapi_key.startswith("your_"))


def _normalize_cache_part(value: str | None) -> str:
    return " ".join((value or "").split()).strip().lower()


def _build_job_search_cache_key(profile, mode: str, role_query: str, limit: int) -> str:
    return "|".join(
        [
            f"mode={mode}",
            f"query={_normalize_cache_part(role_query)}",
            f"location={_normalize_cache_part(getattr(profile, 'location', None))}",
            f"market={_get_rapidapi_market()}",
            f"limit={limit}",
        ]
    )


def _clone_job_search_payload(payload: dict) -> tuple[list[dict], str, str | None]:
    return (
        copy.deepcopy(payload["jobs"]),
        str(payload["status"]),
        payload.get("message"),
    )


def _get_cached_job_search(cache_key: str) -> tuple[list[dict], str, str | None] | None:
    cached = _JOB_SEARCH_CACHE.get(cache_key)
    if not cached:
        return None

    expires_at, payload = cached
    if expires_at <= time.monotonic():
        _JOB_SEARCH_CACHE.pop(cache_key, None)
        return None

    return _clone_job_search_payload(payload)


def _set_cached_job_search(
    cache_key: str,
    jobs: list[dict],
    status: str,
    message: str | None,
    ttl_seconds: int,
) -> None:
    if len(_JOB_SEARCH_CACHE) >= JOB_SEARCH_CACHE_MAX_ENTRIES:
        oldest_key = min(_JOB_SEARCH_CACHE.items(), key=lambda item: item[1][0])[0]
        _JOB_SEARCH_CACHE.pop(oldest_key, None)

    _JOB_SEARCH_CACHE[cache_key] = (
        time.monotonic() + max(ttl_seconds, 1),
        {
            "jobs": copy.deepcopy(jobs),
            "status": status,
            "message": message,
        },
    )


def _get_job_search_ttl(status: str) -> int:
    return JOB_SEARCH_CACHE_TTL_SECONDS if status == "live" else JOB_SEARCH_FALLBACK_CACHE_TTL_SECONDS


def clear_job_search_cache() -> None:
    _JOB_SEARCH_CACHE.clear()
    _JOB_SEARCH_LOCKS.clear()


def _get_rapidapi_key() -> str | None:
    return os.getenv("RAPIDAPI_KEY")


def _get_rapidapi_host() -> str:
    return os.getenv("RAPIDAPI_HOST", "jsearch.p.rapidapi.com")


def _get_rapidapi_job_search_url() -> str:
    return os.getenv("RAPIDAPI_JOB_SEARCH_URL", "https://jsearch.p.rapidapi.com/search")


def _get_rapidapi_market() -> str:
    return os.getenv("RAPIDAPI_MARKET", "in").lower()


def _coerce_external_link(url: str | None) -> str | None:
    candidate = " ".join((url or "").split()).strip()
    if not candidate:
        return None

    if candidate.lower().startswith("www."):
        candidate = f"https://{candidate}"
    elif "://" not in candidate and candidate.count("@") == 1 and " " not in candidate:
        candidate = f"mailto:{candidate}"
    elif "://" not in candidate and "." in candidate and " " not in candidate:
        candidate = f"https://{candidate}"

    return candidate if _is_external_link(candidate) else None


def _is_external_link(url: str | None) -> bool:
    if not url:
        return False

    parsed = urlparse(url)
    return parsed.scheme in {"http", "https", "mailto"} and bool(parsed.netloc or parsed.path)


def _normalize_host(url: str | None) -> str:
    if not _is_external_link(url):
        return ""
    return urlparse(url).netloc.lower()


def _host_matches_employer(host: str, employer_name: str | None = None, employer_website: str | None = None) -> bool:
    employer_host = _normalize_host(employer_website)
    if employer_host and (host == employer_host or host.endswith(f".{employer_host}")):
        return True

    normalized_name = " ".join((employer_name or "").lower().split())
    for keyword, patterns in OFFICIAL_COMPANY_HOSTS.items():
        if keyword in normalized_name and any(host == pattern or host.endswith(f".{pattern}") for pattern in patterns):
            return True

    return False


def _is_direct_company_or_ats_link(
    url: str | None,
    employer_website: str | None = None,
    employer_name: str | None = None,
) -> bool:
    host = _normalize_host(url)
    if not host:
        return False

    if _host_matches_employer(host, employer_name, employer_website):
        return True

    if any(keyword in host for keyword in AGGREGATOR_HOST_KEYWORDS):
        return False

    return any(keyword in host for keyword in ATS_HOST_KEYWORDS)


def _extract_contact_email(text: str | None) -> str | None:
    if not text:
        return None

    match = EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def _get_role_tokens(value: str | None) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (value or "").lower())
        if len(token) > 2 and token not in ROLE_STOP_WORDS
    }


def _get_company_tokens(value: str | None) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (value or "").lower())
        if len(token) > 3 and token not in COMPANY_NAME_STOP_WORDS
    }


def _get_location_match_score(preferred_location: str | None, candidate_location: str | None) -> int:
    normalized_preferred = " ".join((preferred_location or "").split()).strip().lower()
    normalized_candidate = " ".join((candidate_location or "").split()).strip().lower()
    if not normalized_preferred or not normalized_candidate or _should_skip_location_filter(normalized_preferred):
        return 0

    if normalized_preferred in normalized_candidate:
        return 4

    preferred_parts = [
        part.strip()
        for part in re.split(r"[,/|-]", normalized_preferred)
        if part.strip()
    ]
    if any(part in normalized_candidate for part in preferred_parts):
        return 3

    preferred_tokens = {token for token in re.findall(r"[a-z0-9]+", normalized_preferred) if len(token) > 2}
    candidate_tokens = {token for token in re.findall(r"[a-z0-9]+", normalized_candidate) if len(token) > 2}
    overlap = len(preferred_tokens & candidate_tokens)
    if overlap:
        return min(2, overlap)

    return 0


def _is_official_company_email(
    email: str | None,
    employer_website: str | None = None,
    employer_name: str | None = None,
) -> bool:
    normalized_email = (email or "").strip().lower()
    if "@" not in normalized_email:
        return False

    domain = normalized_email.split("@", 1)[1]
    if domain in FREE_EMAIL_DOMAINS:
        return False

    employer_host = _normalize_host(employer_website)
    if employer_host and (domain == employer_host or domain.endswith(f".{employer_host}") or employer_host.endswith(f".{domain}")):
        return True

    for keyword, patterns in OFFICIAL_COMPANY_HOSTS.items():
        if keyword in " ".join((employer_name or "").lower().split()):
            if any(domain == pattern or domain.endswith(f".{pattern}") for pattern in patterns):
                return True

    company_tokens = _get_company_tokens(employer_name)
    return any(token in domain for token in company_tokens)


def _summarize_job_description(text: str | None, title: str | None = None) -> str:
    normalized = re.sub(r"[\r\t]+", " ", text or "")
    normalized = re.sub(r"[•●▪■◆]+", ". ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return ""

    raw_segments = [
        re.sub(r"\s+", " ", segment).strip(" -:;,.")
        for segment in re.split(r"(?<=[.!?])\s+|\s*[;|]\s*", normalized)
    ]
    segments: list[str] = []
    seen: set[str] = set()
    title_lower = (title or "").strip().lower()

    for segment in raw_segments:
        lowered = segment.lower()
        if len(segment) < 18:
            continue
        if lowered == title_lower:
            continue
        if any(pattern.search(segment) for pattern in SUMMARY_DROP_PATTERNS):
            continue
        if lowered in seen:
            continue
        seen.add(lowered)
        segments.append(segment)

    if not segments:
        return normalized[:280].rstrip()

    prioritized = sorted(
        segments,
        key=lambda segment: (
            sum(1 for pattern in SUMMARY_PRIORITY_PATTERNS if pattern.search(segment)),
            -len(segment),
        ),
        reverse=True,
    )

    chosen: list[str] = []
    total_length = 0
    for segment in prioritized:
        next_length = total_length + len(segment) + (2 if chosen else 0)
        if next_length > 320 and chosen:
            continue
        chosen.append(segment)
        total_length = next_length
        if len(chosen) == 3 or total_length >= 240:
            break

    summary = ". ".join(chosen).strip()
    if summary and not summary.endswith((".", "!", "?")):
        summary += "."
    return summary or normalized[:280].rstrip()


def _classify_apply_destination(
    apply_link: str | None,
    employer_name: str | None = None,
    employer_website: str | None = None,
    is_direct_apply: bool = False,
) -> tuple[bool, str | None]:
    if not apply_link:
        return False, None

    if apply_link.startswith("mailto:"):
        email = apply_link.split(":", 1)[1]
        if _is_official_company_email(email, employer_website, employer_name):
            return True, "Official company email"
        return False, "Public hiring email"

    host = _normalize_host(apply_link)
    if _host_matches_employer(host, employer_name, employer_website):
        return True, "Official company careers link"
    if any(keyword in host for keyword in ATS_HOST_KEYWORDS):
        return True, "Direct ATS apply link"
    if is_direct_apply:
        return False, "Direct listing link"
    return False, "Third-party listing"


def _pick_best_apply_option(result: dict) -> tuple[str | None, bool, str | None]:
    employer_website = _coerce_external_link(result.get("employer_website"))
    employer_name = result.get("employer_name") or ""
    primary_link = _coerce_external_link(result.get("job_apply_link"))
    primary_is_direct = bool(result.get("job_apply_is_direct"))
    apply_options = result.get("apply_options") or []

    ranked_options = []
    for option in apply_options:
        link = _coerce_external_link(option.get("apply_link"))
        if not _is_external_link(link):
            continue

        publisher = option.get("publisher")
        is_direct = bool(option.get("is_direct"))
        score = 0
        if is_direct:
            score += 4
        if _host_matches_employer(_normalize_host(link), employer_name, employer_website):
            score += 6
        if _is_direct_company_or_ats_link(link, employer_website, employer_name):
            score += 4
        if publisher and publisher.lower() not in {"adzuna", "linkedin", "monster", "ziprecruiter", "jooble"}:
            score += 1
        ranked_options.append((score, link, is_direct, publisher))

    if ranked_options:
        ranked_options.sort(key=lambda item: item[0], reverse=True)
        _, link, is_direct, publisher = ranked_options[0]
        return link, is_direct, publisher

    if _is_external_link(primary_link):
        return primary_link, primary_is_direct, result.get("job_publisher")

    return None, False, None


def _should_skip_location_filter(location: str | None) -> bool:
    if not location:
        return True

    normalized = location.strip().lower()
    return normalized in {"remote", "anywhere", "worldwide", "global", "online"}


def _preferred_market_location() -> str | None:
    market = _get_rapidapi_market()
    if market == "in":
        return "India"
    if market == "us":
        return "United States"
    return None


def _normalize_token_set(*values: str | None) -> set[str]:
    cleaned_values = []
    for value in values:
        if value:
            cleaned_values.append(value.lower().replace("fullstack", "full stack"))
        else:
            cleaned_values.append(value)
    return {
        token
        for value in cleaned_values
        for token in re.findall(r"[a-z0-9]+", (value or "").lower())
        if len(token) > 2 and token not in ROLE_STOP_WORDS
    }


def _score_curated_company(company: dict, role_query: str, profile, mode: str) -> tuple[int, int, int]:
    role_tokens = _normalize_token_set(role_query, getattr(profile, "domain", None), getattr(profile, "desired_role", None))
    company_tokens = _normalize_token_set(company.get("category"), " ".join(company.get("role_keywords", [])))
    keyword_score = len(role_tokens & company_tokens)

    location = " ".join((getattr(profile, "location", "") or "").split()).lower()
    company_locations = [item.lower() for item in company.get("locations", [])]
    location_score = 0
    if location and not _should_skip_location_filter(location):
        location_score = 2 if any(location in item or item in location for item in company_locations) else 0
    elif "india" in company_locations:
        location_score = 1

    mode_score = 1 if mode == "internship" and any(keyword in company.get("role_keywords", []) for keyword in ("intern", "fresher")) else 0
    return keyword_score, location_score, mode_score


def _candidate_queries(role_query: str, mode: str) -> list[str]:
    normalized = " ".join((role_query or "").split())
    candidates = [normalized]

    if mode == "internship":
        lowered = normalized.lower()
        if "internship" not in lowered:
            candidates.append(f"{normalized} Internship")
        if "intern" in lowered:
            candidates.append(normalized.replace("Intern", "Internship").replace("intern", "internship"))
    else:
        lowered = normalized.lower()
        if "fresher" not in lowered and "entry" not in lowered and "junior" not in lowered:
            candidates.append(f"Fresher {normalized}")
            candidates.append(f"Junior {normalized}")

    seen = set()
    ordered = []
    for candidate in candidates:
        cleaned = " ".join(candidate.split()).strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            ordered.append(cleaned)
    return ordered


def _infer_role_skills(role: str | None) -> list[str]:
    normalized = " ".join((role or "").lower().split())
    role_skill_map = [
        (
            ("web designer", "frontend", "front end", "front-end", "ui developer", "react developer"),
            ["html", "css", "javascript", "react", "ui/ux", "figma", "github"],
        ),
        (
            ("backend", "back end", "api developer", "python developer", "fastapi"),
            ["python", "api", "rest api", "fastapi", "sql", "github"],
        ),
        (
            ("data analyst", "business analyst", "analytics"),
            ["excel", "sql", "power bi", "data analysis", "data visualization", "communication"],
        ),
        (
            ("machine learning", "ml engineer", "ai engineer", "data scientist"),
            ["python", "machine learning", "pandas", "numpy", "scikit-learn", "sql"],
        ),
        (
            ("devops", "cloud", "site reliability", "sre"),
            ["linux", "git", "github", "docker", "aws", "deployment"],
        ),
    ]

    for keywords, skills in role_skill_map:
        if any(keyword in normalized for keyword in keywords):
            return skills

    if any(keyword in normalized for keyword in ("developer", "engineer", "software")):
        return ["git", "github", "api", "problem solving", "communication"]

    return []


def _build_company_role_skills(base_skills: list[str], company: dict) -> list[str]:
    company_keywords = company.get("role_keywords", [])
    category = (company.get("category") or "").lower()
    category_skills: list[str] = []

    if "fintech" in category or "finance" in category or "banking" in category:
        category_skills = ["sql", "data analysis", "security", "api"]
    elif "saas" in category or "product" in category or "internet" in category:
        category_skills = ["api", "frontend", "backend", "javascript"]
    elif "semiconductor" in category or "embedded" in category:
        category_skills = ["c++", "linux", "problem solving"]
    elif "consulting" in category or "services" in category:
        category_skills = ["communication", "problem solving", "sql"]

    skills = [*base_skills, *company_keywords, *category_skills]
    return list(dict.fromkeys(skill for skill in skills if skill))


def _build_company_suggestion_jobs(profile, mode: str, limit: int, role_query: str | None = None) -> list[dict]:
    role = role_query or profile.desired_role or f"{profile.domain} specialist"
    suffix = "Intern" if mode == "internship" else "Engineer"
    display_location = _join_location_parts(getattr(profile, "location", None)) or _preferred_market_location() or "India"
    role_skills = _infer_role_skills(role)

    scored_companies = sorted(
        CURATED_COMPANIES,
        key=lambda company: (*_score_curated_company(company, role, profile, mode), company["name"].lower()),
        reverse=True,
    )

    jobs = []
    for index, company in enumerate(scored_companies[:limit], start=1):
        keyword_score, location_score, mode_score = _score_curated_company(company, role, profile, mode)
        relevance_score = min(100, 55 + keyword_score * 8 + location_score * 8 + mode_score * 6)
        description = (
            f"{company['name']} is a suitable {company['category']} target for {role} roles. "
            "Check current openings on the official careers portal; live vacancy counts are unavailable from the external feed right now."
        )
        company_role_skills = _build_company_role_skills(role_skills, company)
        clean_role = role.title().strip()
        if mode == "internship" and re.search(r"\bintern(ship)?\b", clean_role, re.IGNORECASE):
            job_title = clean_role
        elif mode == "job" and re.search(r"\bengineer\b", clean_role, re.IGNORECASE):
            job_title = clean_role
        else:
            job_title = f"{clean_role} {suffix}"
        jobs.append(
            {
                "external_job_id": f"company-suggestion-{index}-{re.sub(r'[^a-z0-9]+', '-', company['name'].lower()).strip('-')}",
                "job_title": job_title,
                "company_name": company["name"],
                "company_website": company["careers_url"],
                "contact_email": None,
                "location": display_location,
                "employment_type": "internship" if mode == "internship" else "full_time",
                "posted_date": "Official careers portal",
                "apply_url": company["careers_url"],
                "apply_link": company["careers_url"],
                "apply_provider": "official careers portal",
                "is_direct_apply": True,
                "apply_link_verified": True,
                "apply_link_note": "Official company careers portal.",
                "job_description": description,
                "job_summary": description,
                "role_skills": company_role_skills,
                "source": "Company Suggestion",
                "salary_max": 120000 if mode == "job" else 35000,
                "company_category": company["category"],
                "vacancy_label": "Official careers portal",
                "role_fit_score": relevance_score,
            }
        )
    return jobs


def _candidate_locations(profile) -> list[str | None]:
    location = getattr(profile, "location", None)
    candidates: list[str | None] = []

    for candidate in (_join_location_parts(location), location):
        normalized = " ".join((candidate or "").split()).strip()
        if not normalized or _should_skip_location_filter(normalized):
            continue
        if normalized not in candidates:
            candidates.append(normalized)

    preferred_market = _preferred_market_location()
    if preferred_market and preferred_market not in candidates:
        candidates.append(preferred_market)

    candidates.append(None)
    return candidates


async def _search_rapidapi_jobs(role_query: str, location: str | None, limit: int, mode: str) -> list[dict]:
    query_parts = [role_query]
    if location and not _should_skip_location_filter(location):
        query_parts.append(f"in {location}")

    params = {
        "query": " ".join(query_parts),
        "page": "1",
        "num_pages": "1",
    }

    headers = {
        "X-RapidAPI-Key": _get_rapidapi_key(),
        "X-RapidAPI-Host": _get_rapidapi_host(),
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(_get_rapidapi_job_search_url(), headers=headers, params=params)
        response.raise_for_status()
        payload = response.json()
        results = payload.get("data", []) or payload.get("results", [])
        jobs = [_normalize_job(item, mode) for item in results]
        return [job for job in jobs if job]


def _classify_live_feed_status(error: Exception | None) -> tuple[str, str]:
    if error is None:
        return (
            "no_results",
            "Live JSearch returned no strong matches for this search, so demo recommendations are shown instead.",
        )

    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        if status_code == 429:
            return (
                "rate_limited",
                "RapidAPI JSearch is rate-limited right now (429 Too Many Requests), so demo recommendations are shown temporarily.",
            )
        if status_code in {401, 403}:
            return (
                "invalid_credentials",
                "RapidAPI JSearch rejected the configured credentials, so demo recommendations are being shown.",
            )
        return (
            "upstream_error",
            f"RapidAPI JSearch returned HTTP {status_code}, so demo recommendations are shown temporarily.",
        )

    if isinstance(error, httpx.RequestError):
        return (
            "network_error",
            "RapidAPI JSearch could not be reached right now, so demo recommendations are shown temporarily.",
        )

    return (
        "upstream_error",
        "RapidAPI JSearch could not provide live results right now, so demo recommendations are shown temporarily.",
    )


async def fetch_jobs_with_status(
    profile,
    mode_override: str | None = None,
    limit: int = 20,
    query: str | None = None,
) -> tuple[list[dict], str, str | None]:
    mode = (mode_override or profile.mode or "job").lower()
    role_query = query or profile.desired_role or f"{profile.domain} {mode}"
    if mode == "internship" and "intern" not in role_query.lower():
        role_query = f"{role_query} intern"
    platform_jobs = get_platform_jobs(profile, mode=mode, limit=limit, query=role_query)

    cache_key = _build_job_search_cache_key(profile, mode, role_query, limit)
    cached = _get_cached_job_search(cache_key)
    if cached is not None:
        return cached

    company_suggestion_jobs = _build_company_suggestion_jobs(profile, mode, limit, role_query)
    lock = _JOB_SEARCH_LOCKS.setdefault(cache_key, asyncio.Lock())

    async with lock:
        cached = _get_cached_job_search(cache_key)
        if cached is not None:
            return cached

        if not _has_live_job_feed():
            if platform_jobs:
                result = (
                    platform_jobs[:limit],
                    "platform_live",
                    "Showing real-time first-party jobs synced through your employer portal and ATS integrations.",
                )
            else:
                result = (
                    company_suggestion_jobs,
                    "missing_credentials",
                    None,
                )
            _set_cached_job_search(cache_key, *result, ttl_seconds=_get_job_search_ttl(result[1]))
            return result

        queries = _candidate_queries(role_query, mode)
        locations_to_try = _candidate_locations(profile)
        last_error: Exception | None = None

        for candidate_query in queries:
            for location in locations_to_try:
                try:
                    jobs = await _search_rapidapi_jobs(candidate_query, location, limit, mode)
                except Exception as exc:
                    last_error = exc
                    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in {401, 403, 429}:
                        status, message = _classify_live_feed_status(exc)
                        if platform_jobs:
                            result = (
                                platform_jobs[:limit],
                                "platform_live",
                                f"{message} First-party employer-connected jobs are still available on your platform.",
                            )
                        else:
                            result = (
                                company_suggestion_jobs,
                                status,
                                None,
                            )
                        _set_cached_job_search(cache_key, *result, ttl_seconds=_get_job_search_ttl(status))
                        return result
                    continue

                if jobs:
                    merged_jobs = _merge_job_results(platform_jobs, jobs, limit)
                    status = "hybrid_live" if platform_jobs else "live"
                    message = (
                        "Showing a hybrid feed of real-time employer-connected jobs plus external live market data."
                        if platform_jobs
                        else None
                    )
                    result = (merged_jobs[:limit], status, message)
                    _set_cached_job_search(cache_key, *result, ttl_seconds=_get_job_search_ttl(result[1]))
                    return result

        status, message = _classify_live_feed_status(last_error)
        if platform_jobs:
            result = (
                platform_jobs[:limit],
                "platform_live",
                f"{message} First-party employer-connected jobs are still available on your platform.",
            )
        else:
            result = (
                company_suggestion_jobs,
                status,
                None,
            )
        _set_cached_job_search(cache_key, *result, ttl_seconds=_get_job_search_ttl(status))
        return result


def _merge_job_results(primary_jobs: list[dict], secondary_jobs: list[dict], limit: int) -> list[dict]:
    merged: list[dict] = []
    seen_keys: set[str] = set()
    for job in [*(primary_jobs or []), *(secondary_jobs or [])]:
        dedupe_key = "|".join(
            [
                str(job.get("external_job_id") or ""),
                str(job.get("job_title") or "").lower(),
                str(job.get("company_name") or "").lower(),
            ]
        )
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        merged.append(job)
        if len(merged) >= limit:
            break
    return merged


def _normalize_job(result: dict, mode: str) -> dict | None:
    employer_website = _coerce_external_link(result.get("employer_website"))
    employer_name = result.get("employer_name") or "Unknown"
    raw_description = result.get("job_description") or ""
    contact_email = _extract_contact_email(raw_description)
    apply_link, is_direct_apply, apply_provider = _pick_best_apply_option(result)
    job_country = result.get("job_country")
    location = _join_location_parts(result.get("job_city"), result.get("job_state"), job_country)
    job_title = result.get("job_title") or "Untitled Role"
    job_summary = _summarize_job_description(raw_description, job_title)

    employment_type = (result.get("job_employment_type") or "").strip().upper()
    if mode == "internship" and "INTERN" not in employment_type and "intern" not in (result.get("job_title") or "").lower():
        # Keep mixed markets usable, but let ranking push internships higher.
        pass

    if not apply_link and employer_website:
        apply_link = employer_website
        apply_provider = "company website"
        is_direct_apply = True
    elif not apply_link and contact_email and _is_official_company_email(contact_email, employer_website, employer_name):
        apply_link = f"mailto:{contact_email}"
        apply_provider = "company email"
        is_direct_apply = True
    elif apply_link and not apply_provider:
        if apply_link.startswith("mailto:"):
            apply_provider = "company email"
        elif _host_matches_employer(_normalize_host(apply_link), employer_name, employer_website):
            apply_provider = "company website"
            is_direct_apply = True

    apply_link_verified, apply_link_note = _classify_apply_destination(
        apply_link,
        employer_name=employer_name,
        employer_website=employer_website,
        is_direct_apply=is_direct_apply,
    )

    return {
        "external_job_id": str(result.get("job_id") or apply_link or ""),
        "job_title": job_title,
        "company_name": employer_name,
        "company_website": employer_website,
        "contact_email": contact_email,
        "location": location or ("Remote" if result.get("job_is_remote") else _preferred_market_location() or "Not specified"),
        "employment_type": employment_type or "Not specified",
        "posted_date": result.get("job_posted_at_datetime_utc") or result.get("job_offer_expiration_datetime_utc"),
        "apply_url": apply_link if apply_link_verified else employer_website,
        "apply_link": apply_link,
        "apply_provider": apply_provider,
        "is_direct_apply": is_direct_apply,
        "apply_link_verified": apply_link_verified,
        "apply_link_note": apply_link_note,
        "job_description": raw_description,
        "job_summary": job_summary,
        "salary_max": result.get("job_max_salary"),
        "salary_min": result.get("job_min_salary"),
        "source": "RapidAPI JSearch",
    }


def enrich_top_companies(companies: list[dict], jobs: list[dict]) -> list[dict]:
    if not companies:
        return derive_company_trends(jobs)

    link_by_company = {}
    for job in jobs:
        company_name = (job.get("company_name") or "").strip()
        if not company_name:
            continue
        if company_name not in link_by_company and _is_external_link(job.get("apply_link")):
            link_by_company[company_name] = {
                "open_roles_url": job.get("apply_link"),
                "sample_role": job.get("job_title"),
            }

    enriched = []
    for company in companies:
        company_name = (company.get("company_name") or "").strip()
        if not company_name:
            continue
        links = link_by_company.get(company_name, {})
        enriched.append(
            {
                "company_name": company_name,
                "vacancies": company.get("vacancies"),
                "average_salary": company.get("average_salary"),
                "open_roles_url": links.get("open_roles_url"),
                "sample_role": links.get("sample_role"),
                "is_live": bool(links.get("open_roles_url")),
            }
        )
    return enriched


async def fetch_jobs(profile, mode_override: str | None = None, limit: int = 20, query: str | None = None) -> list[dict]:
    jobs, _, _ = await fetch_jobs_with_status(profile, mode_override=mode_override, limit=limit, query=query)
    return jobs


async def fetch_top_companies(query: str, location: str | None = None) -> list[dict]:
    return []


def derive_company_trends(
    jobs: list[dict],
    preferred_location: str | None = None,
    preferred_role: str | None = None,
    top_n: int = 20,
) -> list[dict]:
    companies: dict[str, dict] = {}
    preferred_role_tokens = _get_role_tokens(preferred_role)

    for job in jobs:
        company_name = " ".join((job.get("company_name") or "").split()).strip()
        if not company_name:
            continue

        company = companies.setdefault(
            company_name,
            {
                "company_name": company_name,
                "vacancies": 0,
                "average_salary": None,
                "open_roles_url": None,
                "sample_role": None,
                "company_location": None,
                "company_email": None,
                "company_website": None,
                "link_label": None,
                "link_note": None,
                "is_official_link": False,
                "is_live": False,
                "location_match_score": 0,
                "role_match_score": 0,
                "role_fit_score": 0,
                "vacancy_label": None,
            },
        )

        if job.get("source") == "Company Suggestion":
            company["vacancy_label"] = job.get("vacancy_label") or "Official careers portal"
            company["role_fit_score"] = max(company["role_fit_score"], int(job.get("role_fit_score") or 0))
        else:
            company["vacancies"] += 1
        company["company_website"] = company["company_website"] or job.get("company_website")
        company["company_email"] = company["company_email"] or job.get("contact_email")
        company["sample_role"] = company["sample_role"] or job.get("job_title")
        company["company_location"] = company["company_location"] or job.get("location")

        salary_values = [value for value in (job.get("salary_min"), job.get("salary_max")) if isinstance(value, (int, float))]
        if salary_values:
            current_average = company["average_salary"]
            next_average = sum(salary_values) / len(salary_values)
            company["average_salary"] = round(next_average if current_average is None else (current_average + next_average) / 2, 2)

        candidate_link = _coerce_external_link(job.get("apply_link"))
        if candidate_link and not company["open_roles_url"]:
            company["open_roles_url"] = candidate_link
            company["is_official_link"] = bool(job.get("apply_link_verified"))
            company["link_note"] = job.get("apply_link_note")
            if candidate_link.startswith("mailto:") and job.get("apply_link_verified"):
                company["link_label"] = "Official email"
            elif candidate_link.startswith("mailto:"):
                company["link_label"] = "Email company"
            elif job.get("apply_link_verified"):
                company["link_label"] = "Official site"
            elif job.get("apply_provider") == "company website":
                company["link_label"] = "Company site"
            elif job.get("is_direct_apply"):
                company["link_label"] = "Apply now"
            else:
                company["link_label"] = f"Open {job.get('apply_provider') or 'listing'}"

        location_score = _get_location_match_score(preferred_location, job.get("location"))
        if location_score > company["location_match_score"]:
            company["location_match_score"] = location_score
            company["company_location"] = job.get("location") or company["company_location"]

        role_score = len(preferred_role_tokens & _get_role_tokens(job.get("job_title")))
        if role_score > company["role_match_score"]:
            company["role_match_score"] = role_score
            company["sample_role"] = job.get("job_title") or company["sample_role"]

    ordered_companies = sorted(
        companies.values(),
        key=lambda company: (
            company["location_match_score"] > 0,
            company["location_match_score"],
            company["role_match_score"],
            company["role_fit_score"],
            company["vacancies"],
            company["company_name"].lower(),
        ),
        reverse=True,
    )

    top_companies = []
    for company in ordered_companies[:top_n]:
        if not company["open_roles_url"] and company["company_website"]:
            company["open_roles_url"] = company["company_website"]
            company["link_label"] = "Official site"
            company["link_note"] = "Official company careers link"
            company["is_official_link"] = True
        elif not company["open_roles_url"] and company["company_email"]:
            company["open_roles_url"] = f"mailto:{company['company_email']}"
            is_official_email = _is_official_company_email(
                company["company_email"],
                company["company_website"],
                company["company_name"],
            )
            company["link_label"] = "Official email" if is_official_email else "Email company"
            company["link_note"] = "Official company email" if is_official_email else "Public hiring email"
            company["is_official_link"] = is_official_email

        company["is_live"] = bool(company["open_roles_url"])
        company["match_basis"] = "Location match" if company["location_match_score"] > 0 else "Role match"
        if company.get("vacancy_label"):
            company["vacancy_display"] = company["vacancy_label"]
        top_companies.append(company)

    return top_companies


@router.post("/recommendations")
def recommend_jobs(payload: dict, request: Request):
    skills = payload.get("skills", "")

    recommender = request.app.state.recommender

    results = recommender.recommend(skills, top_k=10)

    return {"recommendations": results}
