import { average, clamp } from "./utils";

export const VISUAL_FAMILIES = [
  { label: "Frontend", match: ["frontend"] },
  { label: "Backend & APIs", match: ["backend"] },
  { label: "Cloud & Delivery", match: ["cloud"] },
  { label: "Core Professional", match: ["core professional"] },
  { label: "ML & AI", match: ["ml", "ai"] },
  { label: "Marketing & Growth", match: ["marketing"] },
];

export const MATCH_COLORS = {
  Matched: "#10b981",
  Partial: "#f59e0b",
  Missing: "#ef4444",
};

export const DEFAULT_FILTERS = {
  targetRole: "All roles",
  experienceLevel: "All levels",
  industry: "All industries",
  skillCategory: "All categories",
  location: "All locations",
};

export const EXPERIENCE_LEVELS = ["All levels", "Student", "Fresher", "Entry", "Mid", "Senior"];
export const INDUSTRIES = ["All industries", "Software", "AI/ML", "Data", "Cloud", "Product"];
export const LOCATIONS = ["All locations", "Remote", "India", "United States", "Hybrid", "On-site"];

export function buildDashboardModel(dashboard, filters) {
  const matchedSkills = dashboard?.matched_skills || [];
  const missingSkills = dashboard?.missing_skills || [];
  const trendingSkills = dashboard?.trending_skills || [];
  const quickWins = dashboard?.quick_win_skills || [];
  const skillDnaProfiles = dashboard?.skill_dna_profiles || [];
  const summary = dashboard?.micro_gap_summary || {};
  const allFamilyGaps = dashboard?.family_gaps || [];

  const familyGaps = allFamilyGaps.filter((family) => {
    if (filters.skillCategory !== "All categories" && family.family !== filters.skillCategory) return false;
    return true;
  });

  const roleProfiles = skillDnaProfiles.filter((profile) => {
    if (filters.targetRole === "All roles") return true;
    return profile.role_title === filters.targetRole;
  });

  const activeProfile = roleProfiles[0] || skillDnaProfiles[0] || null;
  const matchScore = clamp(activeProfile?.match_score || average(skillDnaProfiles.map((p) => p.match_score)) || 0);
  const familyStrength = clamp(average(familyGaps.map((f) => f.current_level)));
  const gapPenalty = clamp(average(familyGaps.map((f) => f.gap_level)));
  const resumeMatch = clamp(matchScore || (matchedSkills.length / Math.max(matchedSkills.length + missingSkills.length, 1)) * 100);
  const atsScore = clamp(Math.round(resumeMatch * 0.55 + familyStrength * 0.3 + Math.max(0, 100 - gapPenalty) * 0.15));
  const readinessScore = clamp(Math.round(resumeMatch * 0.45 + atsScore * 0.35 + familyStrength * 0.2));
  const recommendedRole = activeProfile?.role_title || (familyGaps[0]?.family ? `${familyGaps[0].family} Specialist` : "AI-ready developer");
  const fastestSkill = quickWins[0]?.skill || missingSkills[0] || trendingSkills[0] || "communication";
  const estimatedLift = clamp(Math.round(4 + Math.min(16, (quickWins[0]?.demand_count || missingSkills.length || 3) * 1.8)), 4, 22);

  const strongestFamilies = [...familyGaps].sort((a, b) => b.current_level - a.current_level).slice(0, 3);
  const weakestFamilies = [...familyGaps].sort((a, b) => b.gap_level - a.gap_level).slice(0, 3);
  const radarData = (familyGaps.length ? familyGaps : allFamilyGaps).slice(0, 6).map((f) => ({
    family: f.family.replace(" Development", "").replace("Engineering", "Eng"),
    Current: Math.round(f.current_level),
    Expected: Math.round(f.target_level),
  }));
  const demandData = (familyGaps.length ? familyGaps : allFamilyGaps).slice(0, 6).map((f) => ({
    family: f.family.replace(" Development", "").replace("Engineering", "Eng"),
    demand: f.demand_count,
  }));
  const skillPieData = [
    { name: "Matched", value: matchedSkills.length },
    { name: "Missing", value: missingSkills.length },
    { name: "Partial", value: skillDnaProfiles.reduce((total, p) => total + p.job_genes.filter((g) => g.status === "partial").length, 0) },
  ].filter((item) => item.value > 0);
  const learningProgress = [
    { week: "W1", score: Math.max(20, readinessScore - 22) },
    { week: "W2", score: Math.max(25, readinessScore - 16) },
    { week: "W3", score: Math.max(30, readinessScore - 9) },
    { week: "Now", score: readinessScore },
    { week: "+1", score: clamp(readinessScore + Math.round(estimatedLift / 2)) },
    { week: "+2", score: clamp(readinessScore + estimatedLift) },
  ];

  return {
    activeProfile,
    allFamilyGaps,
    atsScore,
    demandData,
    estimatedLift,
    familyGaps,
    familyStrength,
    fastestSkill,
    learningProgress,
    matchedCount: matchedSkills.length,
    matchedSkills,
    missingCount: missingSkills.length,
    missingSkills,
    quickWins,
    radarData,
    readinessScore,
    recommendedRole,
    resumeMatch,
    skillDnaProfiles,
    skillPieData,
    strongestFamilies,
    summary,
    trendingSkills,
    weakestFamilies,
  };
}