import re
from collections import Counter
from typing import Iterable
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


COMMON_SKILLS = {
    "backend",
    "python",
    "java",
    "javascript",
    "typescript",
    "frontend",
    "react",
    "next.js",
    "node.js",
    "express",
    "fastapi",
    "django",
    "flask",
    "sql",
    "postgresql",
    "mysql",
    "sqlite",
    "mongodb",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "github",
    "html",
    "css",
    "tailwind css",
    "bootstrap",
    "power bi",
    "excel",
    "tableau",
    "data science",
    "pandas",
    "numpy",
    "scikit-learn",
    "machine learning",
    "deep learning",
    "nlp",
    "data analysis",
    "data visualization",
    "tensorflow",
    "pytorch",
    "seo",
    "content marketing",
    "google analytics",
    "salesforce",
    "digital marketing",
    "financial modeling",
    "accounting",
    "communication",
    "problem solving",
    "rest api",
    "api",
    "jwt",
    "oauth",
    "linux",
    "figma",
    "ui/ux",
    "prompting",
    "rag",
    "llm",
    "agents",
    "deployment",
    "c++",
    "c#",
    "spring boot",
}

SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "html5": "html",
    "css3": "css",
    "reactjs": "react",
    "react.js": "react",
    "nextjs": "next.js",
    "node": "node.js",
    "nodejs": "node.js",
    "express.js": "express",
    "postgres": "postgresql",
    "postgres sql": "postgresql",
    "postgre sql": "postgresql",
    "powerbi": "power bi",
    "power-bi": "power bi",
    "datascience": "data science",
    "data-science": "data science",
    "microsoft excel": "excel",
    "ms excel": "excel",
    "spreadsheets": "excel",
    "spreadsheet": "excel",
    "restful api": "rest api",
    "restful apis": "rest api",
    "apis": "api",
    "github actions": "github",
    "machine-learning": "machine learning",
    "deep-learning": "deep learning",
    "nlp models": "nlp",
    "communication skills": "communication",
    "problem-solving": "problem solving",
    "ui ux": "ui/ux",
    "ui and ux": "ui/ux",
    "ui ux design": "ui/ux",
    "ui and ux design": "ui/ux",
    "user interface": "ui/ux",
    "user experience": "ui/ux",
    "user interface design": "ui/ux",
    "user experience design": "ui/ux",
}

SKILL_FAMILY_GROUPS = (
    {
        "name": "Frontend Development",
        "skills": ["html", "css", "javascript", "typescript", "react", "next.js", "tailwind css", "bootstrap", "ui/ux", "figma"],
    },
    {
        "name": "Backend & APIs",
        "skills": ["backend", "python", "java", "c++", "c#", "node.js", "express", "fastapi", "django", "flask", "spring boot", "api", "rest api", "jwt", "oauth"],
    },
    {
        "name": "Data & BI",
        "skills": ["sql", "postgresql", "mysql", "sqlite", "mongodb", "redis", "excel", "power bi", "tableau", "data analysis", "data visualization", "google analytics", "financial modeling", "accounting", "salesforce"],
    },
    {
        "name": "ML & AI",
        "skills": ["data science", "llm", "prompting", "rag", "agents", "pandas", "numpy", "scikit-learn", "machine learning", "deep learning", "nlp", "tensorflow", "pytorch"],
    },
    {
        "name": "Cloud & Delivery",
        "skills": ["linux", "git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "deployment"],
    },
    {
        "name": "Marketing & Growth",
        "skills": ["seo", "content marketing", "digital marketing"],
    },
    {
        "name": "Core Professional",
        "skills": ["communication", "problem solving"],
    },
)

ADJACENT_SKILL_HINTS = {
    "html": ["css", "javascript"],
    "css": ["javascript", "tailwind css", "bootstrap"],
    "javascript": ["typescript", "react", "next.js"],
    "typescript": ["react", "next.js"],
    "react": ["next.js", "typescript", "api"],
    "python": ["fastapi", "sql", "pandas", "machine learning"],
    "java": ["spring boot", "api", "sql"],
    "node.js": ["express", "api", "mongodb"],
    "sql": ["postgresql", "mysql", "power bi", "data analysis"],
    "postgresql": ["docker", "aws"],
    "mysql": ["sql", "power bi"],
    "excel": ["sql", "power bi", "data analysis"],
    "data analysis": ["sql", "power bi", "data visualization"],
    "power bi": ["sql", "data visualization"],
    "machine learning": ["python", "scikit-learn", "tensorflow", "pytorch"],
    "pandas": ["numpy", "machine learning", "data visualization"],
    "scikit-learn": ["machine learning", "tensorflow"],
    "git": ["github", "docker", "deployment"],
    "docker": ["aws", "kubernetes", "deployment"],
    "aws": ["docker", "deployment"],
    "communication": ["problem solving", "ui/ux", "data visualization"],
    "ui/ux": ["figma", "react"],
}

SKILL_TERM_LOOKUP = {skill: skill for skill in COMMON_SKILLS}
SKILL_TERM_LOOKUP.update(SKILL_ALIASES)

SKILL_TO_FAMILY = {}
for family in SKILL_FAMILY_GROUPS:
    for skill in family["skills"]:
        SKILL_TO_FAMILY[skill] = family["name"]

RESUME_ROLE_STOP_WORDS = {
    "a",
    "an",
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

RESUME_SECTION_RULES = (
    (
        "Professional Summary",
        (
            r"\b(summary|profile|objective|about me)\b",
            r"\bcareer objective\b",
        ),
        "Shows recruiters quickly what role you are targeting and what value you bring.",
    ),
    (
        "Skills",
        (
            r"\b(skills|technical skills|tech stack|core competencies|technologies)\b",
        ),
        "Makes ATS keyword matching easier and highlights your tools at a glance.",
    ),
    (
        "Experience",
        (
            r"\b(experience|work experience|employment|professional experience)\b",
        ),
        "Demonstrates applied work, internships, freelance work, or leadership experience.",
    ),
    (
        "Projects",
        (
            r"\b(projects|academic projects|personal projects|key projects)\b",
        ),
        "Gives direct proof that you can build role-relevant work beyond coursework.",
    ),
    (
        "Education",
        (
            r"\b(education|coursework|university|college|b\.tech|btech|b\.e|be|bsc|msc)\b",
        ),
        "Provides academic context and helps recruiters understand your current stage.",
    ),
)

ACTION_VERBS = {
    "analyzed",
    "automated",
    "built",
    "created",
    "delivered",
    "deployed",
    "designed",
    "developed",
    "implemented",
    "improved",
    "increased",
    "led",
    "optimized",
    "reduced",
}

IMPACT_PATTERN = re.compile(
    r"\b("
    r"\d+%|"
    r"\d+\+|"
    r"\$\d+[a-z]*|"
    r"\d+\s*(users|clients|customers|projects|features|reports|dashboards|apis|hours|days|weeks|months|years)"
    r")\b",
    re.IGNORECASE,
)

SKILL_PROJECT_SUGGESTIONS = {
    "fastapi": {
        "title": "FastAPI Service Starter",
        "level": "Intermediate",
        "summary": "Build a FastAPI service with auth, validation, Swagger docs, and a small database-backed workflow.",
        "skills": ["fastapi", "python", "api"],
        "deployment": "Deploy on Render or Railway with environment variables and health checks.",
    },
    "react": {
        "title": "React Portfolio Dashboard",
        "level": "Basic",
        "summary": "Create a React interface with search, filters, loading states, and reusable components.",
        "skills": ["react", "javascript", "css"],
        "deployment": "Deploy on Vercel with a public README and screenshots.",
    },
    "tailwind css": {
        "title": "Tailwind Product Landing Page",
        "level": "Basic",
        "summary": "Design a responsive product landing page with clear sections, call-to-actions, and polished spacing.",
        "skills": ["tailwind css", "html", "css"],
        "deployment": "Deploy on Netlify and attach the live link in your portfolio.",
    },
    "sql": {
        "title": "SQL Analytics Case Study",
        "level": "Basic",
        "summary": "Model a reporting database and write business-focused queries for trends, cohorts, and KPIs.",
        "skills": ["sql", "data analysis"],
        "deployment": "Publish the schema, queries, and dashboard screenshots in GitHub.",
    },
    "postgresql": {
        "title": "Database Migration Project",
        "level": "Intermediate",
        "summary": "Migrate an app from SQLite to PostgreSQL with migrations, seed data, and rollback support.",
        "skills": ["postgresql", "sql"],
        "deployment": "Run the database on Neon or Supabase and document the migration steps.",
    },
    "docker": {
        "title": "Containerized Full-Stack App",
        "level": "Advanced",
        "summary": "Package a frontend, backend, and database with Docker Compose for local and staging environments.",
        "skills": ["docker", "backend", "deployment"],
        "deployment": "Ship the stack with Docker Compose and a production-ready `.env.example`.",
    },
    "machine learning": {
        "title": "Model Benchmark Project",
        "level": "Advanced",
        "summary": "Train and compare multiple ML models on one dataset and explain performance tradeoffs clearly.",
        "skills": ["machine learning", "python", "scikit-learn"],
        "deployment": "Expose predictions with a notebook demo or a small API endpoint.",
    },
    "data analysis": {
        "title": "Hiring Trends Analysis",
        "level": "Basic",
        "summary": "Analyze a hiring dataset and build charts that explain demand, salaries, and skills trends.",
        "skills": ["data analysis", "python", "sql"],
        "deployment": "Publish the report as a GitHub README or Notion case study with visuals.",
    },
    "power bi": {
        "title": "Executive KPI Dashboard",
        "level": "Intermediate",
        "summary": "Create a business dashboard with drill-downs, KPIs, and decision-ready visuals.",
        "skills": ["power bi", "data visualization", "sql"],
        "deployment": "Publish the dashboard to Power BI Service and share a walkthrough.",
    },
    "aws": {
        "title": "Cloud Deployment Project",
        "level": "Pro",
        "summary": "Deploy a backend on AWS with environment-based config, CI/CD, logging, and monitoring basics.",
        "skills": ["aws", "deployment", "backend"],
        "deployment": "Use EC2, Elastic Beanstalk, or App Runner and document the release workflow.",
    },
    "javascript": {
        "title": "Interactive Productivity App",
        "level": "Basic",
        "summary": "Build a polished JavaScript app with filtering, drag-and-drop, and stateful interactions.",
        "skills": ["javascript", "frontend"],
        "deployment": "Deploy on Vercel or Netlify and include a short demo video.",
    },
}

ROLE_PROJECT_SUGGESTIONS = {
    "data analyst": [
        {
            "title": "Basic Sales Dashboard",
            "level": "Basic",
            "summary": "Build a dashboard for one dataset with KPIs, filters, and a short insight summary.",
            "skills": ["sql", "excel", "data visualization"],
            "deployment": "Publish a Power BI or Tableau link plus screenshots in GitHub.",
        },
        {
            "title": "Intermediate Funnel Analysis",
            "level": "Intermediate",
            "summary": "Analyze conversion funnels and identify drop-off points with segmented reporting.",
            "skills": ["sql", "data analysis", "power bi"],
            "deployment": "Share a dashboard link and a one-page business recommendation note.",
        },
        {
            "title": "Advanced Forecasting Case Study",
            "level": "Advanced",
            "summary": "Build a forecasting case study for sales, traffic, or demand and justify the assumptions.",
            "skills": ["python", "data analysis", "machine learning"],
            "deployment": "Publish notebook outputs and a clear decision summary for stakeholders.",
        },
        {
            "title": "Pro Executive Analytics Portal",
            "level": "Pro",
            "summary": "Create a multi-page analytics portal with role-based dashboards and business storytelling.",
            "skills": ["power bi", "sql", "data visualization"],
            "deployment": "Host documentation, data model diagrams, and dashboard access instructions.",
        },
    ],
    "data scientist": [
        {
            "title": "Basic EDA Notebook",
            "level": "Basic",
            "summary": "Build an exploratory analysis notebook with data cleaning, charts, and initial hypotheses.",
            "skills": ["python", "pandas", "data analysis"],
            "deployment": "Publish the notebook on GitHub with a short findings section.",
        },
        {
            "title": "Intermediate Prediction Pipeline",
            "level": "Intermediate",
            "summary": "Create a full prediction pipeline with preprocessing, model training, and evaluation metrics.",
            "skills": ["machine learning", "scikit-learn", "python"],
            "deployment": "Ship a Streamlit or notebook demo that explains how predictions work.",
        },
        {
            "title": "Advanced Experiment Tracking Project",
            "level": "Advanced",
            "summary": "Compare multiple models, tune parameters, and track experiments with reproducible results.",
            "skills": ["machine learning", "python", "data visualization"],
            "deployment": "Deploy a model demo with metrics, charts, and versioned experiment notes.",
        },
        {
            "title": "Pro Decision Intelligence App",
            "level": "Pro",
            "summary": "Build a decision-support app that combines ML predictions, explanations, and business recommendations.",
            "skills": ["machine learning", "python", "api"],
            "deployment": "Deploy the app with a backend API, monitoring notes, and a business-facing walkthrough.",
        },
    ],
    "ai engineer": [
        {
            "title": "Basic Prompt Workflow Demo",
            "level": "Basic",
            "summary": "Build a small AI workflow that classifies, summarizes, or extracts information from text.",
            "skills": ["python", "llm", "prompting"],
            "deployment": "Share the workflow as a notebook or lightweight web app.",
        },
        {
            "title": "Intermediate RAG Assistant",
            "level": "Intermediate",
            "summary": "Create a retrieval-augmented assistant over domain documents with citations and evaluation cases.",
            "skills": ["rag", "llm", "python"],
            "deployment": "Deploy a small chat UI with uploaded documents and sample test questions.",
        },
        {
            "title": "Advanced Agent Workflow",
            "level": "Advanced",
            "summary": "Build a multi-step AI workflow that plans tasks, retrieves data, and validates outputs.",
            "skills": ["agents", "llm", "python"],
            "deployment": "Deploy the orchestrator with logging and runbook-style examples.",
        },
        {
            "title": "Pro Production AI Platform Slice",
            "level": "Pro",
            "summary": "Design one production-style AI feature with evaluation, guardrails, traceability, and fallback handling.",
            "skills": ["llm", "rag", "api"],
            "deployment": "Deploy with monitoring, prompt versioning, and a technical architecture note.",
        },
    ],
    "llm": [
        {
            "title": "Basic Prompt Engineering Lab",
            "level": "Basic",
            "summary": "Compare prompts for summarization, extraction, and classification with clear evaluation examples.",
            "skills": ["llm", "prompting"],
            "deployment": "Publish a notebook or simple app with prompt comparisons.",
        },
        {
            "title": "Intermediate LLM Knowledge Assistant",
            "level": "Intermediate",
            "summary": "Build an assistant that answers questions on custom documents with chunking and retrieval.",
            "skills": ["llm", "rag", "python"],
            "deployment": "Deploy a lightweight interface and document latency and answer quality.",
        },
        {
            "title": "Advanced Evaluation Harness",
            "level": "Advanced",
            "summary": "Create an evaluation workflow for hallucination checks, prompt variants, and response scoring.",
            "skills": ["llm", "python", "data analysis"],
            "deployment": "Ship dashboards or reports that show model quality and regression tracking.",
        },
        {
            "title": "Pro Multi-Model AI Feature",
            "level": "Pro",
            "summary": "Build an AI feature that routes between models, retrieval, and fallback logic for reliability.",
            "skills": ["llm", "rag", "api"],
            "deployment": "Deploy with tracing, prompt versioning, and production-style safeguards.",
        },
    ],
    "backend": [
        {
            "title": "Basic CRUD API",
            "level": "Basic",
            "summary": "Create a clean CRUD API with validation, pagination, and simple auth.",
            "skills": ["python", "fastapi", "sql"],
            "deployment": "Deploy on Render and share API docs.",
        },
        {
            "title": "Intermediate Auth Service",
            "level": "Intermediate",
            "summary": "Build a backend service with JWT auth, roles, and protected endpoints.",
            "skills": ["fastapi", "jwt", "postgresql"],
            "deployment": "Deploy with a managed database and environment-based secrets.",
        },
        {
            "title": "Advanced Event-Driven Backend",
            "level": "Advanced",
            "summary": "Design a backend with background jobs, retries, and structured logging.",
            "skills": ["python", "redis", "docker"],
            "deployment": "Containerize the app and document the operations flow.",
        },
        {
            "title": "Pro Production Service Blueprint",
            "level": "Pro",
            "summary": "Create a production-ready backend slice with testing, observability, and CI/CD.",
            "skills": ["fastapi", "docker", "aws"],
            "deployment": "Deploy with CI/CD, logs, health checks, and rollback notes.",
        },
    ],
    "frontend": [
        {
            "title": "Basic UI Clone",
            "level": "Basic",
            "summary": "Build a responsive interface with strong spacing, reusable components, and mobile support.",
            "skills": ["html", "css", "javascript"],
            "deployment": "Deploy on Vercel and document the design decisions.",
        },
        {
            "title": "Intermediate Dashboard UI",
            "level": "Intermediate",
            "summary": "Create a dashboard with charts, filters, async states, and a clean information hierarchy.",
            "skills": ["react", "javascript", "css"],
            "deployment": "Deploy a live demo with a short product tour.",
        },
        {
            "title": "Advanced Data App Frontend",
            "level": "Advanced",
            "summary": "Build a frontend that consumes multiple APIs and handles search, drill-down, and performance states.",
            "skills": ["react", "api", "frontend"],
            "deployment": "Deploy with environment variables and a polished README.",
        },
        {
            "title": "Pro Design System Starter",
            "level": "Pro",
            "summary": "Create a mini design system with reusable components, theme tokens, and usage docs.",
            "skills": ["react", "css", "ui/ux"],
            "deployment": "Publish a live component showcase with docs and examples.",
        },
    ],
    "full stack": [
        {
            "title": "Basic Portfolio App",
            "level": "Basic",
            "summary": "Build a simple full-stack app with forms, persistence, and one end-to-end workflow.",
            "skills": ["javascript", "react", "sql"],
            "deployment": "Deploy frontend and backend separately with linked URLs.",
        },
        {
            "title": "Intermediate Management System",
            "level": "Intermediate",
            "summary": "Create a role-based full-stack dashboard with authentication and CRUD modules.",
            "skills": ["react", "fastapi", "postgresql"],
            "deployment": "Deploy with managed database and environment configs.",
        },
        {
            "title": "Advanced Marketplace Workflow",
            "level": "Advanced",
            "summary": "Build a multi-step product flow with dashboard analytics, notifications, and admin views.",
            "skills": ["frontend", "backend", "docker"],
            "deployment": "Containerize the stack and document the architecture.",
        },
        {
            "title": "Pro SaaS Slice",
            "level": "Pro",
            "summary": "Create a production-style SaaS feature with billing-ready architecture, auth, analytics, and CI/CD.",
            "skills": ["react", "fastapi", "aws"],
            "deployment": "Deploy with CI/CD, logs, and a release checklist.",
        },
    ],
}

STARTUP_KEYWORDS = {
    "startup",
    "start-up",
    "early stage",
    "early-stage",
    "seed funded",
    "series a",
    "series b",
    "0-1",
    "founding",
    "small team",
    "fast-paced",
}

FRESHER_KEYWORDS = {
    "fresher",
    "freshers",
    "entry level",
    "entry-level",
    "graduate",
    "junior",
    "intern",
    "internship",
    "0-1 years",
    "0-2 years",
    "1 year",
    "campus",
}


def normalize_skills(skills: str | Iterable[str]) -> list[str]:
    if isinstance(skills, str):
        candidates = re.split(r"[,/\n;|]+", skills)
    else:
        candidates = list(skills)

    normalized: list[str] = []
    seen: set[str] = set()
    for skill in candidates:
        clean = re.sub(r"\s+", " ", str(skill).strip().lower())
        clean = SKILL_ALIASES.get(clean, clean)
        if clean and clean not in seen:
            seen.add(clean)
            normalized.append(clean)
    return normalized


def extract_skills_from_text(text: str) -> list[str]:
    lowered = text.lower()
    matches: set[str] = set()
    for term in sorted(SKILL_TERM_LOOKUP, key=len, reverse=True):
        pattern = rf"(?<!\w){re.escape(term)}(?!\w)"
        if re.search(pattern, lowered):
            matches.add(SKILL_TERM_LOOKUP[term])
    return sorted(matches)


def _sorted_skills_by_signal(skills: set[str], *counters: Counter, limit: int = 5) -> list[str]:
    return sorted(
        skills,
        key=lambda skill: tuple(counter.get(skill, 0) for counter in counters) + (-len(skill),),
        reverse=True,
    )[:limit]


def _build_quick_win_skills(profile_skills: set[str], missing: Counter, trending: Counter) -> list[dict]:
    quick_wins: dict[str, dict] = {}

    for skill in profile_skills:
        for candidate in ADJACENT_SKILL_HINTS.get(skill, []):
            if candidate in profile_skills:
                continue
            demand_count = (missing.get(candidate, 0) * 3) + (trending.get(candidate, 0) * 2)
            if demand_count <= 0:
                continue

            entry = quick_wins.setdefault(
                candidate,
                {
                    "skill": candidate,
                    "family": SKILL_TO_FAMILY.get(candidate, "Other"),
                    "unlocked_by": set(),
                    "demand_count": 0,
                    "note": "",
                },
            )
            entry["unlocked_by"].add(skill)
            entry["demand_count"] = max(entry["demand_count"], demand_count)

    if not quick_wins:
        for skill, count in missing.most_common(5):
            quick_wins[skill] = {
                "skill": skill,
                "family": SKILL_TO_FAMILY.get(skill, "Other"),
                "unlocked_by": set(),
                "demand_count": max(count * 3, 1),
                "note": "",
            }

    ranked = sorted(
        quick_wins.values(),
        key=lambda item: (item["demand_count"], len(item["unlocked_by"]), -len(item["skill"])),
        reverse=True,
    )[:6]

    results: list[dict] = []
    for item in ranked:
        unlocked_by = sorted(item["unlocked_by"])
        note = (
            f"Easy next step from {', '.join(unlocked_by[:2])}"
            if unlocked_by
            else "High-demand micro-skill appearing across current matches"
        )
        results.append(
            {
                "skill": item["skill"],
                "family": item["family"],
                "unlocked_by": unlocked_by,
                "demand_count": item["demand_count"],
                "note": note,
            }
        )
    return results


def _build_family_gaps(profile_skills: set[str], matched: Counter, missing: Counter, trending: Counter, ranked_jobs: list[dict] | None = None) -> list[dict]:
    family_rows: list[dict] = []
    family_demand_totals = [
        sum(missing.get(skill, 0) + trending.get(skill, 0) + matched.get(skill, 0) for skill in family["skills"])
        for family in SKILL_FAMILY_GROUPS
    ]
    max_family_demand = max(family_demand_totals or [1], default=1)

    for family in SKILL_FAMILY_GROUPS:
        family_skill_set = set(family["skills"])
        owned_skills = sorted(skill for skill in profile_skills if skill in family_skill_set)
        matched_skills = _sorted_skills_by_signal(family_skill_set & set(matched), matched, trending, limit=4)
        missing_skills = _sorted_skills_by_signal(family_skill_set & set(missing), missing, trending, limit=5)

        demand_count = sum(missing.get(skill, 0) + trending.get(skill, 0) for skill in family_skill_set)
        job_count = 0
        for job in ranked_jobs or []:
            job_skill_set = set(
                normalize_skills(
                    list(job.get("matched_skills") or [])
                    + list(job.get("missing_skills") or [])
                    + extract_skills_from_text(f"{job.get('job_title', '')} {job.get('job_description', '')}")
                )
            )
            if family_skill_set & job_skill_set:
                job_count += 1
        matched_signal = sum(matched.get(skill, 0) for skill in family_skill_set)
        missing_signal = sum(missing.get(skill, 0) for skill in family_skill_set)
        family_size = max(len(family_skill_set), 1)

        current_level = round(
            min(
                100.0,
                ((len(owned_skills) / family_size) * 58.0) + min(matched_signal * 6.0, 28.0),
            ),
            2,
        )
        target_level = round(
            min(
                100.0,
                max(
                    current_level + min(missing_signal * 8.0, 36.0),
                    28.0 + ((demand_count / max_family_demand) * 50.0),
                ),
            ),
            2,
        )
        gap_level = round(max(target_level - current_level, 0.0), 2)

        adjacent_candidates: list[str] = []
        for skill in owned_skills + matched_skills:
            adjacent_candidates.extend(ADJACENT_SKILL_HINTS.get(skill, []))
        adjacent_next_skills = [
            skill
            for skill in dict.fromkeys(adjacent_candidates)
            if skill not in profile_skills and (skill in family_skill_set or skill in missing)
        ][:3]
        if not adjacent_next_skills:
            adjacent_next_skills = missing_skills[:3]

        summary = (
            f"You already show {', '.join((matched_skills or owned_skills)[:2])}. "
            f"To close this family gap faster, add {', '.join(missing_skills[:3])}."
            if missing_skills
            else "You already cover the strongest micro-skills showing up in this family right now."
        )

        if not owned_skills and not matched_skills and not missing_skills and demand_count == 0:
            continue

        family_rows.append(
            {
                "family": family["name"],
                "current_level": current_level,
                "target_level": target_level,
                "gap_level": gap_level,
                "demand_count": demand_count,
                "job_count": job_count,
                "strength_count": len(set(owned_skills) | set(matched_skills)),
                "gap_count": len(missing_skills),
                "matched_micro_skills": (matched_skills or owned_skills)[:4],
                "missing_micro_skills": missing_skills,
                "adjacent_next_skills": adjacent_next_skills,
                "summary": summary,
            }
        )

    family_rows.sort(key=lambda item: (item["gap_level"], item["demand_count"], item["gap_count"]), reverse=True)
    return family_rows[:6]


def _is_partial_related(skill: str, profile_skills: set[str]) -> bool:
    skill_family = SKILL_TO_FAMILY.get(skill)
    if any(skill in ADJACENT_SKILL_HINTS.get(owned_skill, []) for owned_skill in profile_skills):
        return True
    if skill_family and any(SKILL_TO_FAMILY.get(owned_skill) == skill_family for owned_skill in profile_skills):
        return True
    return False


def _build_skill_dna_profiles(profile_skills: set[str], ranked_jobs: list[dict]) -> list[dict]:
    profiles: list[dict] = []

    for index, job in enumerate(ranked_jobs[:3]):
        matched_skills = normalize_skills(job.get("matched_skills", []))
        missing_skills = normalize_skills(job.get("missing_skills", []))
        required_skills = list(dict.fromkeys(matched_skills + missing_skills))

        if not required_skills:
            extracted = extract_skills_from_text(f"{job.get('job_title', '')} {job.get('job_description', '')}")
            required_skills = extracted[:6]
            matched_skills = [skill for skill in required_skills if skill in profile_skills]
            missing_skills = [skill for skill in required_skills if skill not in profile_skills]

        user_gene_source = list(dict.fromkeys(matched_skills + list(profile_skills)))[:8]
        user_genes = [
            {
                "skill": skill,
                "status": "used" if skill in matched_skills else "not_required",
                "label": "Used" if skill in matched_skills else "Not required",
            }
            for skill in user_gene_source
        ]

        job_genes: list[dict] = []
        for skill in required_skills[:8]:
            if skill in matched_skills:
                status = "matched"
                label = "You have this"
            elif _is_partial_related(skill, profile_skills):
                status = "partial"
                label = "You're close"
            else:
                status = "missing"
                label = "Evolve next"

            job_genes.append(
                {
                    "skill": skill,
                    "status": status,
                    "label": label,
                }
            )

        profiles.append(
            {
                "id": str(job.get("external_job_id") or f"dna-{index}"),
                "role_title": job.get("job_title", "Recommended role"),
                "company_name": job.get("company_name") or "",
                "match_score": round(float(job.get("job_readiness_score") or job.get("ai_score") or 0.0), 2),
                "matched_count": len(matched_skills[:8]),
                "missing_count": len([gene for gene in job_genes if gene["status"] != "matched"]),
                "user_genes": user_genes,
                "job_genes": job_genes,
            }
        )

    return profiles


def _tokenize_resume_role(target_role: str | None) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9]+", (target_role or "").lower())
        if len(token) > 2 and token not in RESUME_ROLE_STOP_WORDS
    ]


def _section_checks(resume_text: str, user_name: str = "") -> tuple[list[dict], float]:
    normalized = (resume_text or "").lower()
    checks: list[dict] = []

    # 1. Full Name
    name_present = False
    if user_name:
        parts = [p.strip().lower() for p in user_name.split() if len(p.strip()) > 2]
        if parts:
            name_present = any(part in normalized for part in parts)
    else:
        name_present = len(normalized.strip()) > 10
        
    checks.append({
        "title": "Full Name",
        "present": name_present,
        "detail": "Include your full name at the top of the resume." if not name_present else "Full name is present."
    })

    # 2. Email Address
    email_pattern = r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"
    email_present = bool(re.search(email_pattern, normalized))
    checks.append({
        "title": "Email Address",
        "present": email_present,
        "detail": "Add a professional email address for communication." if not email_present else "Email address is present."
    })

    # 3. Phone Number
    phone_pattern = r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b|\b\d{5}\s\d{5}\b"
    phone_present = bool(re.search(phone_pattern, normalized))
    checks.append({
        "title": "Phone Number",
        "present": phone_present,
        "detail": "Provide a phone number so recruiters can reach you." if not phone_present else "Phone number is present."
    })

    # 4. LinkedIn Profile
    linkedin_present = "linkedin.com/in/" in normalized or "linkedin.com/" in normalized
    checks.append({
        "title": "LinkedIn Profile",
        "present": linkedin_present,
        "detail": "Include your LinkedIn profile link to showcase professional network." if not linkedin_present else "LinkedIn profile is present."
    })

    # 5. GitHub/Portfolio
    portfolio_present = any(kw in normalized for kw in ["github.com", "portfolio", "personal website", "behance.net", "dribbble.com", "gitlab.com"])
    checks.append({
        "title": "GitHub/Portfolio",
        "present": portfolio_present,
        "detail": "Add links to your GitHub or portfolio to display active projects." if not portfolio_present else "GitHub/Portfolio link is present."
    })

    # 6. Professional Summary
    summary_present = any(re.search(p, normalized) for p in [r"\b(summary|profile|objective|about me)\b", r"\bcareer objective\b"])
    checks.append({
        "title": "Professional Summary",
        "present": summary_present,
        "detail": "Shows recruiters quickly what role you target and what value you bring." if not summary_present else "Professional summary is present."
    })

    # 7. Technical Skills
    tech_skills_present = any(re.search(p, normalized) for p in [r"\b(technical skills|skills|tech stack|technologies|languages|frameworks|tools|databases|developer tools)\b"])
    checks.append({
        "title": "Technical Skills",
        "present": tech_skills_present,
        "detail": "List your developer skills, frameworks, and programming languages." if not tech_skills_present else "Technical skills section is present."
    })

    # 8. Soft Skills
    soft_skills_present = any(re.search(p, normalized) for p in [r"\b(soft skills|interpersonal skills|strengths|competencies|professional skills|leadership|communication|collaboration|teamwork|problem solving)\b"])
    checks.append({
        "title": "Soft Skills",
        "present": soft_skills_present,
        "detail": "Include key soft skills like communication, leadership, or teamwork." if not soft_skills_present else "Soft skills section is present."
    })

    # 9. Work Experience
    experience_present = any(re.search(p, normalized) for p in [r"\b(experience|work experience|employment|professional experience|internships|work history)\b"])
    checks.append({
        "title": "Work Experience",
        "present": experience_present,
        "detail": "Demonstrates applied work, internships, freelance work, or leadership." if not experience_present else "Work experience section is present."
    })

    # 10. Projects
    projects_present = any(re.search(p, normalized) for p in [r"\b(projects|academic projects|personal projects|key projects|capstone projects)\b"])
    checks.append({
        "title": "Projects",
        "present": projects_present,
        "detail": "Gives direct proof that you can build role-relevant work." if not projects_present else "Projects section is present."
    })

    # 11. Education
    education_present = any(re.search(p, normalized) for p in [r"\b(education|coursework|university|college|b\.tech|btech|b\.e|be|bsc|msc|academic history)\b"])
    checks.append({
        "title": "Education",
        "present": education_present,
        "detail": "Provides academic context and helps recruiters understand your background." if not education_present else "Education section is present."
    })

    # 12. Certifications
    certifications_present = any(re.search(p, normalized) for p in [r"\b(certifications|certification|credentials|certified|courses|licensed)\b"])
    checks.append({
        "title": "Certifications",
        "present": certifications_present,
        "detail": "Add external courses, certifications, or license proofs." if not certifications_present else "Certifications section is present."
    })

    # 13. Achievements
    achievements_present = any(re.search(p, normalized) for p in [r"\b(achievements|awards|honors|accolades|recognition|extracurricular activities)\b"])
    checks.append({
        "title": "Achievements",
        "present": achievements_present,
        "detail": "Highlight academic awards, hackathon wins, or key accomplishments." if not achievements_present else "Achievements section is present."
    })

    # 14. Languages
    languages_present = any(re.search(p, normalized) for p in [r"\b(languages|bilingual|multilingual|english|hindi|tamil|telugu|kannada|french|spanish|german)\b"])
    checks.append({
        "title": "Languages",
        "present": languages_present,
        "detail": "List languages you speak (e.g. English, Hindi, German) for global opportunities." if not languages_present else "Languages section is present."
    })

    score = round((sum(1 for item in checks if item["present"]) / 14.0) * 100, 2)
    return checks, score


def _impact_score(resume_text: str) -> tuple[float, dict]:
    normalized = (resume_text or "").lower().strip()
    if len(normalized) < 50:
        return 0.0, {"metrics_found": 0, "action_verbs_found": 0}

    metrics_found = len(IMPACT_PATTERN.findall(normalized))
    action_verbs_found = sum(1 for verb in ACTION_VERBS if re.search(rf"\b{re.escape(verb)}\b", normalized))
    
    # Give a small single-digit baseline (5) for having readable text
    score = round(min(100.0, 5 + (metrics_found * 25) + (action_verbs_found * 10)), 2)
    return score, {
        "metrics_found": metrics_found,
        "action_verbs_found": action_verbs_found,
    }


def _collect_market_skills(jobs: list[dict], top_n: int = 12) -> list[str]:
    counter = Counter()
    for job in jobs:
        job_text = f"{job.get('job_title', '')} {job.get('job_description', '')}"
        for skill in extract_skills_from_text(job_text):
            counter[skill] += 1
    return [skill for skill, _ in counter.most_common(top_n)]


def _role_alignment_score(target_role: str, resume_text: str, resume_skills: list[str]) -> tuple[float, list[str]]:
    role_tokens = _tokenize_resume_role(target_role)
    if not role_tokens:
        return 5.0, []

    searchable_text = (resume_text or "").lower().strip()
    if not searchable_text:
        return 0.0, []

    normalized_skills = normalize_skills(resume_skills)

    matched_tokens: list[str] = []
    for token in role_tokens:
        if token in searchable_text or any(token in skill for skill in normalized_skills):
            matched_tokens.append(token)

    # Give a small baseline (5) for a readable document, then scale
    score = round(5 + ((len(matched_tokens) / len(role_tokens)) * 95), 2)
    return min(score, 100.0), matched_tokens


def _market_readiness_score(candidate_skills: set[str], jobs: list[dict]) -> float:
    if not candidate_skills:
        return 0.0

    coverage_scores: list[float] = []
    for job in jobs[:8]:
        job_skills = set(extract_skills_from_text(f"{job.get('job_title', '')} {job.get('job_description', '')}"))
        if not job_skills:
            continue
        coverage_scores.append((len(candidate_skills & job_skills) / len(job_skills)) * 100)

    if not coverage_scores:
        return 55.0

    return round(sum(coverage_scores) / len(coverage_scores), 2)


def generate_resume_audit(profile, jobs: list[dict], target_role: str | None = None) -> dict:
    resolved_role = (target_role or getattr(profile, "desired_role", None) or f"{profile.domain} {profile.mode}").strip() or "Target Role"
    resume_text = getattr(profile, "resume_text", "") or ""
    profile_skills = normalize_skills(getattr(profile, "skills", []) or [])
    resume_skills = extract_skills_from_text(resume_text)
    
    # Strictly evaluate only the skills found in the uploaded document
    candidate_skills = set(resume_skills)

    market_skills = _collect_market_skills(jobs)
    matched_keywords = [skill for skill in market_skills if skill in candidate_skills]
    missing_keywords = [skill for skill in market_skills if skill not in candidate_skills]

    keyword_match_score = round((len(matched_keywords) / max(len(market_skills), 1)) * 100, 2) if candidate_skills and market_skills else 0.0
    role_alignment_score, matched_role_tokens = _role_alignment_score(resolved_role, resume_text, resume_skills)

    user_name = ""
    if hasattr(profile, "user") and profile.user:
        user_name = profile.user.full_name
    elif hasattr(profile, "full_name"):
        user_name = profile.full_name

    section_checks, section_score = _section_checks(resume_text, user_name)
    impact_score, impact_signals = _impact_score(resume_text)
    resume_strength_score = round((section_score * 0.6) + (impact_score * 0.4), 2)
    market_readiness_score = _market_readiness_score(candidate_skills, jobs)

    overall_score = round(
        (keyword_match_score * 0.35)
        + (role_alignment_score * 0.25)
        + (resume_strength_score * 0.20)
        + (market_readiness_score * 0.20),
        2,
    )

    summary_skills = matched_keywords[:4] or profile_skills[:4] or resume_skills[:4]
    summary_text = ", ".join(summary_skills) if summary_skills else "your strongest relevant skills"
    next_keywords = ", ".join(missing_keywords[:3]) if missing_keywords else "the next set of market keywords already covered"
    suggested_summary = (
        f"Targeting {resolved_role.title()} roles with visible strength in {summary_text}. "
        f"Prioritize evidence for {next_keywords} across projects, experience, and skills sections."
    )

    improvement_tips: list[str] = []
    if missing_keywords:
        improvement_tips.append(
            f"Add role-relevant keywords like {', '.join(missing_keywords[:4])} only where they truthfully appear in your projects, coursework, or experience."
        )
    missing_sections = [section["title"] for section in section_checks if not section["present"]]
    if missing_sections:
        improvement_tips.append(
            f"Add or rename these sections for better ATS readability: {', '.join(missing_sections[:3])}."
        )
    if impact_signals["metrics_found"] < 2:
        improvement_tips.append(
            "Quantify impact in at least 2-3 bullets using numbers such as percentages, users, projects, response time, or results delivered."
        )
    if len(matched_role_tokens) < max(1, len(_tokenize_resume_role(resolved_role)) // 2):
        improvement_tips.append(
            f"Retarget your headline and summary more directly toward {resolved_role.title()} so the role intent is obvious within the first few lines."
        )
    if not improvement_tips:
        improvement_tips.append("Keep tailoring project bullets to each application and move the most relevant keywords nearer the top of the page.")

    return {
        "target_role": resolved_role,
        "overall_score": overall_score,
        "keyword_match_score": round(keyword_match_score, 2),
        "role_alignment_score": round(role_alignment_score, 2),
        "resume_strength_score": round(resume_strength_score, 2),
        "market_readiness_score": round(market_readiness_score, 2),
        "matched_keywords": matched_keywords[:8],
        "missing_keywords": missing_keywords[:8],
        "suggested_summary": suggested_summary,
        "improvement_tips": improvement_tips[:4],
        "section_checks": section_checks,
        "recommended_projects": _project_suggestions(resolved_role, missing_keywords[:8])[:4],
    }


def build_profile_document(profile) -> str:
    parts = [
        " ".join(profile.skills or []),
        profile.domain or "",
        profile.location or "",
        f"{getattr(profile, 'years_of_experience', 0) or 0} years experience",
        profile.experience_level or "",
        profile.mode or "",
        profile.desired_role or "",
        profile.resume_text or "",
    ]
    return " ".join(parts).strip()


def _experience_alignment(experience_level: str, job_text: str) -> float:
    job_text = job_text.lower()
    mapping = {
        "student": {"intern", "internship", "graduate", "entry"},
        "fresher": {"fresher", "entry", "junior", "graduate"},
        "entry": {"entry", "junior", "associate", "graduate"},
        "mid": {"mid", "3+ years", "2+ years", "experienced"},
        "senior": {"senior", "lead", "5+ years", "staff"},
        "lead": {"lead", "principal", "manager", "architect"},
    }
    keywords = mapping.get(experience_level.lower(), set())
    if not keywords:
        return 55.0
    return 100.0 if any(keyword in job_text for keyword in keywords) else 60.0


def _domain_alignment(domain: str, job_text: str) -> float:
    domain = (domain or "").lower()
    if not domain:
        return 60.0
    return 100.0 if domain in job_text else 65.0


def _startup_alignment(job_text: str, company_name: str) -> float:
    haystack = f"{company_name} {job_text}".lower()
    matches = sum(1 for keyword in STARTUP_KEYWORDS if keyword in haystack)
    if matches >= 2:
        return 100.0
    if matches == 1:
        return 80.0
    return 50.0


def _fresher_alignment(profile, job_text: str) -> float:
    normalized = job_text.lower()
    years_of_experience = float(getattr(profile, "years_of_experience", 0.0) or 0.0)
    entry_candidate = years_of_experience <= 2 or (profile.experience_level or "").lower() in {"student", "fresher", "entry"}

    matches = sum(1 for keyword in FRESHER_KEYWORDS if keyword in normalized)
    if entry_candidate and matches >= 2:
        return 100.0
    if entry_candidate and matches == 1:
        return 85.0
    if entry_candidate:
        return 65.0
    if matches >= 2:
        return 75.0
    return 55.0


def _project_payload(
    title: str,
    level: str,
    summary: str,
    skills: list[str] | None = None,
    deployment: str | None = None,
) -> dict:
    return {
        "title": title,
        "level": level,
        "summary": summary,
        "skills": skills or [],
        "deployment": deployment,
    }


def _fallback_projects(target_role: str | None) -> list[dict]:
    role_label = (target_role or "your target role").strip().title()
    return [
        _project_payload(
            f"{role_label} Foundations Project",
            "Basic",
            f"Build a beginner-friendly project tailored to {role_label} that shows core workflow understanding.",
            deployment="Publish the code, screenshots, and short project summary in GitHub.",
        ),
        _project_payload(
            f"{role_label} Portfolio Case Study",
            "Intermediate",
            f"Create a portfolio-ready case study for {role_label} with measurable outcomes and documented decisions.",
            deployment="Share a live demo, notebook, or dashboard link with a clear README.",
        ),
        _project_payload(
            f"{role_label} Applied Workflow",
            "Advanced",
            f"Build an advanced project for {role_label} that combines multiple tools and realistic business or product constraints.",
            deployment="Deploy the project and include architecture, setup, and evaluation notes.",
        ),
        _project_payload(
            f"{role_label} Production Slice",
            "Pro",
            f"Design a production-style portfolio project for {role_label} with scalability, testing, and release readiness in mind.",
            deployment="Document deployment, monitoring, and rollback considerations.",
        ),
    ]


def _project_suggestions(target_role: str | None, missing_skills: list[str]) -> list[dict]:
    suggestions: list[dict] = []
    seen_titles: set[str] = set()
    normalized_role = (target_role or "").strip().lower().replace(" ", "")

    for role_keyword, role_suggestions in ROLE_PROJECT_SUGGESTIONS.items():
        if role_keyword.replace(" ", "") in normalized_role:
            for suggestion in role_suggestions:
                title = suggestion["title"]
                if title not in seen_titles:
                    seen_titles.add(title)
                    suggestions.append(suggestion)

    for skill in missing_skills:
        suggestion = SKILL_PROJECT_SUGGESTIONS.get(skill)
        if suggestion and suggestion["title"] not in seen_titles:
            seen_titles.add(suggestion["title"])
            suggestions.append(suggestion)

    for fallback in _fallback_projects(target_role):
        if fallback["title"] not in seen_titles:
            seen_titles.add(fallback["title"])
            suggestions.append(fallback)

    level_order = {"Basic": 0, "Intermediate": 1, "Advanced": 2, "Pro": 3}
    suggestions.sort(key=lambda item: (level_order.get(item["level"], 99), item["title"].lower()))
    return suggestions[:10]


def _ordered_unique_skills(*skill_groups: Iterable[str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    for skills in skill_groups:
        for skill in normalize_skills(skills):
            if skill and skill not in seen:
                seen.add(skill)
                ordered.append(skill)

    return ordered


def compute_readiness(
    skill_match: float,
    ai_score: float,
    experience_score: float,
    domain_score: float,
    startup_score: float,
    fresher_score: float,
) -> float:
    readiness = (
        (skill_match * 0.34)
        + (ai_score * 0.28)
        + (experience_score * 0.14)
        + (domain_score * 0.08)
        + (startup_score * 0.08)
        + (fresher_score * 0.08)
    )
    return round(min(readiness, 100.0), 2)


def rank_jobs(profile, jobs: list[dict], top_n: int = 10) -> dict:
    if not jobs:
        return {
            "jobs": [],
            "matched_skills": [],
            "missing_skills": [],
            "trending_skills": [],
            "project_suggestions": [],
        }

    profile_skills = set(normalize_skills(profile.skills or []))
    profile_doc = build_profile_document(profile)
    job_docs = [
        " ".join(
            [
                job.get("job_title", ""),
                job.get("company_name", ""),
                job.get("location", ""),
                job.get("employment_type", ""),
                job.get("job_description", ""),
                " ".join(normalize_skills(job.get("role_skills", []))),
            ]
        )
        for job in jobs
    ]

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    matrix = vectorizer.fit_transform([profile_doc, *job_docs])
    similarities = cosine_similarity(matrix[0:1], matrix[1:]).flatten()

    overall_matched = Counter()
    overall_missing = Counter()
    trending = Counter()
    scored_jobs = []

    for job, similarity, job_doc in zip(jobs, similarities, job_docs):
        role_skills = normalize_skills(job.get("role_skills", []))
        extracted_skills = extract_skills_from_text(job_doc)
        title_skills = extract_skills_from_text(job.get("job_title", ""))
        job_skills_ordered = _ordered_unique_skills(role_skills, extracted_skills, title_skills)
        job_skills = set(job_skills_ordered)

        matched = [skill for skill in job_skills_ordered if skill in profile_skills]
        missing = [skill for skill in job_skills_ordered if skill not in profile_skills]

        for item in matched:
            overall_matched[item] += 1
        for item in missing:
            overall_missing[item] += 1
        for item in job_skills:
            trending[item] += 1

        base_denominator = len(job_skills) if job_skills else max(len(profile_skills), 1)
        exact_skill_match = round((len(matched) / base_denominator) * 100, 2)
        skill_match = exact_skill_match
        ai_score = round(float(similarity) * 100, 2)
        experience_score = _experience_alignment(profile.experience_level, job_doc)
        domain_score = _domain_alignment(profile.domain, job_doc)
        startup_score = _startup_alignment(job_doc, job.get("company_name", ""))
        fresher_score = _fresher_alignment(profile, job_doc)
        ranking_score = round(
            (ai_score * 0.52)
            + (skill_match * 0.18)
            + (experience_score * 0.10)
            + (startup_score * 0.10)
            + (fresher_score * 0.10),
            2,
        )
        readiness = compute_readiness(skill_match, ai_score, experience_score, domain_score, startup_score, fresher_score)

        enriched = {
            **job,
            "ai_score": ranking_score,
            "semantic_score": ai_score,
            "skill_match_percentage": skill_match,
            "exact_skill_match_percentage": exact_skill_match,
            "matched_skills": matched[:6],
            "missing_skills": missing[:6],
            "job_readiness_score": readiness,
            "startup_score": round(startup_score, 2),
            "fresher_score": round(fresher_score, 2),
            "is_startup_friendly": startup_score >= 80.0,
            "is_fresher_friendly": fresher_score >= 80.0,
        }
        scored_jobs.append(enriched)

    scored_jobs.sort(key=lambda item: (item["ai_score"], item["job_readiness_score"]), reverse=True)
    top_jobs = scored_jobs[:top_n]

    return {
        "jobs": top_jobs,
        "matched_skills": [skill for skill, _ in overall_matched.most_common(10)],
        "missing_skills": [skill for skill, _ in overall_missing.most_common(10)],
        "trending_skills": [skill for skill, _ in trending.most_common(10)],
        "project_suggestions": _project_suggestions(
            getattr(profile, "desired_role", None),
            [skill for skill, _ in overall_missing.most_common(10)],
        ),
    }


def build_skill_dashboard(profile, ranked_jobs: list[dict]) -> dict:
    profile_skills = set(normalize_skills(profile.skills or []))
    matched = Counter()
    missing = Counter()
    trending = Counter()

    for job in ranked_jobs:
        for skill in job.get("matched_skills", []):
            matched[skill] += 1
        for skill in job.get("missing_skills", []):
            missing[skill] += 1
        for skill in extract_skills_from_text(f"{job.get('job_title', '')} {job.get('job_description', '')}"):
            trending[skill] += 1

    for skill in profile_skills:
        if skill not in matched:
            matched[skill] += 1

    gap_chart = []
    for skill, value in matched.most_common(8):
        gap_chart.append({"skill": skill, "type": "matched", "value": value})
    for skill, value in missing.most_common(8):
        gap_chart.append({"skill": skill, "type": "missing", "value": value})
    for skill, value in trending.most_common(8):
        gap_chart.append({"skill": skill, "type": "trending", "value": value})

    family_gaps = _build_family_gaps(profile_skills, matched, missing, trending, ranked_jobs)
    quick_win_skills = _build_quick_win_skills(profile_skills, missing, trending)
    skill_dna_profiles = _build_skill_dna_profiles(profile_skills, ranked_jobs)
    micro_gap_summary = {
        "families_tracked": len(family_gaps),
        "high_gap_families": sum(1 for family in family_gaps if family["gap_level"] >= 35),
        "quick_win_count": len(quick_win_skills),
        "matched_micro_skills": len({skill for skill in matched if matched[skill] > 0}),
    }

    return {
        "matched_skills": [skill for skill, _ in matched.most_common(12)],
        "missing_skills": [skill for skill, _ in missing.most_common(12)],
        "trending_skills": [skill for skill, _ in trending.most_common(12)],
        "gap_chart": gap_chart,
        "family_gaps": family_gaps,
        "quick_win_skills": quick_win_skills,
        "micro_gap_summary": micro_gap_summary,
        "skill_dna_profiles": skill_dna_profiles,
    }


ROLE_SKILL_REQUIREMENTS = {
    "Backend Developer": {"python", "java", "fastapi", "django", "flask", "spring boot", "node.js", "express", "sql", "postgresql", "mysql", "mongodb", "redis", "api", "jwt", "oauth", "rest api", "c++", "c#", "git", "github", "linux"},
    "Frontend Developer": {"javascript", "typescript", "react", "next.js", "html", "css", "tailwind css", "bootstrap", "figma", "ui/ux", "git", "github"},
    "Fullstack Developer": {"python", "javascript", "typescript", "react", "next.js", "node.js", "express", "fastapi", "sql", "postgresql", "mongodb", "html", "css", "tailwind css", "git", "github"},
    "Data Analyst": {"sql", "excel", "power bi", "tableau", "data analysis", "data visualization", "pandas", "numpy", "python"},
    "Machine Learning Engineer": {"python", "machine learning", "deep learning", "scikit-learn", "tensorflow", "pytorch", "nlp", "llm", "rag", "agents", "pandas", "numpy", "data science"},
    "AI Engineer": {"python", "llm", "rag", "agents", "machine learning", "deep learning", "pytorch", "tensorflow", "nlp", "prompting", "api"},
    "Cloud & DevOps Engineer": {"docker", "kubernetes", "aws", "azure", "gcp", "linux", "git", "github", "deployment"},
    "Digital Marketing Specialist": {"seo", "content marketing", "digital marketing", "google analytics", "salesforce"},
}


def suggest_roles_by_skills(user_skills: list[str], domain: str | None = None) -> list[dict]:
    normalized_user = set(normalize_skills(user_skills))
    role_scores = []
    
    if normalized_user:
        for role, role_skills in ROLE_SKILL_REQUIREMENTS.items():
            matched = normalized_user & role_skills
            missing = role_skills - normalized_user
            
            match_score = (len(matched) / len(role_skills)) * 100 if role_skills else 0.0
            
            if len(matched) > 0:
                role_scores.append({
                    "role": role,
                    "match_score": round(match_score, 2),
                    "matched_skills": sorted(list(matched)),
                    "missing_skills": sorted(list(missing))
                })
        # Sort by match score descending, then by number of matched skills descending
        role_scores.sort(key=lambda x: (x["match_score"], len(x["matched_skills"])), reverse=True)
        
    # Fallback to domain-based default roles if no roles matched or user has no skills
    if not role_scores:
        dom = (domain or "").strip().lower()
        fallback_roles = []
        if "frontend" in dom:
            fallback_roles = ["Frontend Developer", "UI/UX Designer"]
        elif "data" in dom or "analytics" in dom or "business" in dom:
            fallback_roles = ["Data Analyst", "Business Analyst"]
        elif "ai" in dom or "machine learning" in dom or "ml" in dom:
            fallback_roles = ["AI Engineer", "Machine Learning Engineer"]
        elif "marketing" in dom:
            fallback_roles = ["Digital Marketing Specialist"]
        elif "cloud" in dom or "devops" in dom:
            fallback_roles = ["Cloud & DevOps Engineer"]
        else:
            fallback_roles = ["Backend Developer", "Fullstack Developer", "Software Engineer"]
            
        for role in fallback_roles:
            role_skills = ROLE_SKILL_REQUIREMENTS.get(role, set())
            role_scores.append({
                "role": role,
                "match_score": 0.0,
                "matched_skills": [],
                "missing_skills": sorted(list(role_skills))
            })
            
    return role_scores[:3]
