"""
Semantic job recommender powered by SentenceTransformers + FAISS.

Provides a `SemanticRecommender` class that can be attached to FastAPI's
`app.state. On ``fit(jobs)` it builds an in-memory FAISS index from the
provided job documents. `recommend()` embeds a user query and returns ranked
jobs with hybrid scores (semantic + skill + freshness).
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Utility Functions
# ------------------------------------------------------------------

def _skill_gap_score(user_skills: list[str], job_skills: list[str]) -> tuple[float, list[str]]:
    if not job_skills:
        return 1.0, []

    user_set = {s.lower().strip() for s in user_skills}
    job_set = {s.lower().strip() for s in job_skills}

    matched = user_set & job_set
    missing = [s for s in job_skills if s.lower().strip() not in user_set]

    return len(matched) / len(job_set), missing


def _freshness_boost(posted_at_ts: float, max_age_days: int = 30) -> float:
    age_days = (time.time() - posted_at_ts) / 86400
    return max(0.0, 1.0 - age_days / max_age_days)


def _hybrid_score(
    semantic_sim: float,
    skill_match: float,
    freshness: float,
    weights: Optional[dict[str, float]] = None,
) -> float:
    if weights is None:
        weights = {"semantic": 0.4, "skill": 0.45, "freshness": 0.15}

    return (
        weights["semantic"] * semantic_sim
        + weights["skill"] * skill_match
        + weights["freshness"] * freshness
    )


# ------------------------------------------------------------------
# Recommender Class
# ------------------------------------------------------------------

class SemanticRecommender:
    """Lightweight wrapper around SentenceTransformer + FAISS."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        logger.info("Loading embedder: %s", model_name)

        allow_download = os.getenv("SEMANTIC_MODEL_ALLOW_DOWNLOAD", "false").lower() == "true"

        self.embedder: SentenceTransformer | None = None
        self._index = None
        self._metadata: list[dict] = []
        self._dim = 0

        try:
            self.embedder = SentenceTransformer(
                model_name,
                local_files_only=not allow_download,
            )
            self._dim = self.embedder.get_sentence_embedding_dimension()
        except Exception:
            logger.exception(
                "Unable to load semantic model '%s'. Semantic recommendations will be disabled.",
                model_name,
            )

    # ------------------------------------------------------------------
    # Indexing
    # ------------------------------------------------------------------

    def fit(self, jobs: list[dict]) -> None:
        """Build or rebuild the FAISS index from a list of job dicts."""

        if self.embedder is None:
            logger.warning("Semantic model unavailable; skipping index build.")
            self._index = None
            self._metadata = []
            return

        if not jobs:
            logger.warning("fit() called with empty job list; clearing index.")
            self._index = None
            self._metadata = []
            return

        texts: list[str] = []
        self._metadata = []

        for job in jobs:
            text = " ".join(
                str(job.get(k, "")) for k in ("title", "description", "company", "location")
            ).strip()

            if not text:
                text = str(job.get("id", "unknown"))

            texts.append(text)
            self._metadata.append(dict(job))

        logger.info("Embedding %d jobs ...", len(texts))

        embeddings = self.embedder.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        if len(embeddings) == 0:
            logger.warning("No embeddings generated; skipping index build.")
            return

        try:
            import faiss
        except ImportError:
            logger.exception("FAISS is not installed. Install with pip install faiss-cpu.")
            self._index = None
            return

        self._index = faiss.IndexFlatIP(self._dim)
        self._index.add(np.array(embeddings, dtype="float32"))

        logger.info("FAISS index built: %d vectors, dim=%d", self._index.ntotal, self._dim)

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def recommend(
        self,
        user_text: str,
        top_k: int = 10,
        location: Optional[str] = None,
        remote_only: bool = False,
        user_skills: Optional[list[str]] = None,
        min_match: float = 0.0,
    ) -> list[dict]:
        """
        Return ranked job dicts with keys:
        job_id, title, company, location, salary_range, apply_url,
        match_score, missing_skills, freshness_score, source.
        """

        if self.embedder is None or self._index is None or not self._metadata:
            logger.info("Index empty; returning no results.")
            return []

        if user_skills is None:
            user_skills = [s.strip() for s in user_text.split(",") if s.strip()]

        user_vec = self.embedder.encode([user_text], normalize_embeddings=True)

        search_k = min(top_k * 3, len(self._metadata))

        distances, indices = self._index.search(
            np.array(user_vec, dtype="float32"),
            search_k,
        )

        semantic_scores = (distances[0] + 1) / 2

        results: list[dict] = []

        for idx, sem_score in zip(indices[0], semantic_scores):
            if idx < 0 or idx >= len(self._metadata):
                continue

            job = self._metadata[idx]

            # Filters
            if location and location.lower() not in str(job.get("location", "")).lower():
                continue

            if remote_only and not job.get("is_remote", False):
                continue

            # Skills
            job_skills = job.get("skills", [])
            if isinstance(job_skills, str):
                job_skills = [s.strip() for s in job_skills.split(",") if s.strip()]

            skill_match, missing = _skill_gap_score(user_skills, job_skills)

            # Freshness
            posted_at = job.get("posted_at", time.time())

            if isinstance(posted_at, str):
                try:
                    from datetime import datetime
                    posted_at = datetime.fromisoformat(
                        posted_at.replace("Z", "+00:00")
                    ).timestamp()
                except Exception:
                    posted_at = time.time()

            fresh = _freshness_boost(float(posted_at))

            score = _hybrid_score(float(sem_score), skill_match, fresh)

            if score < min_match:
                continue

            results.append({
                "job_id": str(job.get("id", idx)),
                "title": job.get("title", "Untitled"),
                "company": job.get("company", "Unknown"),
                "location": job.get("location", ""),
                "salary_range": job.get("salary_range"),
                "apply_url": job.get("apply_url", ""),
                "match_score": round(score, 3),
                "missing_skills": missing[:5],
                "freshness_score": round(fresh, 3),
                "source": job.get("source", "unknown"),
            })

        results.sort(key=lambda j: j["match_score"], reverse=True)
        return results[:top_k]
