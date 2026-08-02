import { getCourseForSkill } from "../../utils/courseLinks";

/* ------------------------------------------------------------------ */
/*  Shared helper functions for the dashboard                          */
/* ------------------------------------------------------------------ */

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

export function titleCase(value) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((total, value) => total + value, 0) / clean.length;
}

export function getPriority(gap = 0, demand = 0) {
  if (gap >= 36 || demand >= 16) return "High";
  if (gap >= 18 || demand >= 8) return "Medium";
  return "Low";
}

export function getDifficulty(skill, status) {
  const normalized = String(skill || "").toLowerCase();
  if (status === "matched" || status === "used") return "Beginner refresh";
  if (normalized.includes("cloud") || normalized.includes("kubernetes") || normalized.includes("machine learning")) return "Advanced";
  if (normalized.includes("api") || normalized.includes("react") || normalized.includes("sql") || normalized.includes("deployment")) return "Intermediate";
  return "Beginner";
}

export function estimateHours(skill, demand = 0, status = "missing") {
  const difficulty = getDifficulty(skill, status);
  const base = difficulty === "Advanced" ? 28 : difficulty === "Intermediate" ? 16 : 8;
  return Math.max(4, base + Math.min(8, Math.round(demand / 2)));
}

/* ------------------------------------------------------------------ */
/*  Course lookup helpers                                              */
/* ------------------------------------------------------------------ */

export function getCourseDetails(skill) {
  const course = getCourseForSkill(skill);
  return {
    platform: course?.provider || "Class Central",
    title: `${titleCase(skill)} career track`,
    url: course?.url || `https://www.classcentral.com/search?q=${encodeURIComponent(skill || "career skills")}`,
    badge: course?.tag?.toLowerCase().includes("free") ? "Free" : "Free/Paid",
    note: course?.note || "Curated course search for this skill gap.",
  };
}

/* ------------------------------------------------------------------ */
/*  Skill detail builder (for the modal)                               */
/* ------------------------------------------------------------------ */

export function buildSkillDetail(skill, status, family, demand = 0) {
  const course = getCourseDetails(skill);
  const cleanSkill = titleCase(skill);
  const difficulty = getDifficulty(skill, status);
  const hours = estimateHours(skill, demand, status);

  return {
    skill,
    status,
    family: family || "Career skill",
    description: `${cleanSkill} is a practical signal that you can contribute to ${family || "target role"} work with less ramp-up time.`,
    why: `Recruiters and hiring teams look for ${cleanSkill} because it reduces delivery risk, improves team velocity, and helps validate role fit during screening.`,
    difficulty,
    time: `${hours}-${hours + 4} hours`,
    resources: [course],
    projects: [
      `Build a focused ${cleanSkill} mini-project and publish it with a README.`,
      `Add one resume bullet showing how you used ${cleanSkill} to solve a measurable problem.`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Market demand trend helper                                         */
/* ------------------------------------------------------------------ */

export function getDemandTrend(demand) {
  if (demand >= 14) return { label: "↑ Trending", tone: "up" };
  if (demand <= 2) return { label: "↓ Declining", tone: "down" };
  return { label: "→ Stable", tone: "stable" };
}

/* ------------------------------------------------------------------ */
/*  Risk / tone mapping helpers                                        */
/* ------------------------------------------------------------------ */

export function toneForValue(value) {
  if (value >= 70) return "green";
  if (value >= 45) return "amber";
  return "red";
}

export function priorityClass(priority) {
  return String(priority || "").toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}