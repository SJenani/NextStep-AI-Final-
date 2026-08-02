const INTERNSHIP_TERMS = ["intern", "internship", "trainee"];
const JOB_ONLY_TERMS = ["full time", "full-time", "permanent"];

export function getOpportunityModeMismatch(mode, desiredRole) {
  const normalizedRole = (desiredRole || "").trim().toLowerCase();
  if (!normalizedRole) {
    return "";
  }

  if (mode === "job" && INTERNSHIP_TERMS.some((term) => normalizedRole.includes(term))) {
    return "This role looks like an internship. Switch the opportunity type to Internship.";
  }

  if (mode === "internship" && JOB_ONLY_TERMS.some((term) => normalizedRole.includes(term))) {
    return "This role looks like a full-time job. Switch the opportunity type to Job.";
  }

  return "";
}

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const STANDARD_ROLES = [
  "Fullstack Developer",
  "Frontend Developer",
  "Backend Developer",
  "MERN Stack Developer",
  "MEAN Stack Developer",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Cloud & DevOps Engineer",
  "Digital Marketing Specialist",
  "UI/UX Designer",
  "Product Manager",
  "Software Engineer",
  "Product Support Engineer",
  "Marketing Associate",
  "Sales Associate",
  "HR Specialist"
];

const ALIAS_MAP = {
  "fullstack": "Fullstack Developer",
  "full-stack": "Fullstack Developer",
  "frontend": "Frontend Developer",
  "front-end": "Frontend Developer",
  "backend": "Backend Developer",
  "back-end": "Backend Developer",
  "mern": "MERN Stack Developer",
  "mean": "MEAN Stack Developer",
  "meanstack": "MEAN Stack Developer",
  "mean-stack": "MEAN Stack Developer",
  "meanstuck": "MEAN Stack Developer",
  "meanstuckdev": "MEAN Stack Developer",
  "meanstuckdeveloper": "MEAN Stack Developer",
  "mernstuck": "MERN Stack Developer",
  "mernstuckdev": "MERN Stack Developer",
  "mernstuckdeveloper": "MERN Stack Developer",
  "ml": "Machine Learning Engineer",
  "ai": "AI Engineer",
  "devops": "Cloud & DevOps Engineer",
  "uiux": "UI/UX Designer",
  "ui/ux": "UI/UX Designer",
  "swe": "Software Engineer",
  "sde": "Software Engineer"
};

export function correctRoleSpelling(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  const lowerInput = trimmed.toLowerCase();
  
  // 1. Direct Alias Mapping
  if (ALIAS_MAP[lowerInput]) {
    return ALIAS_MAP[lowerInput];
  }

  // Also check if stripped version matches an alias (e.g. "full stack" -> "fullstack")
  const strippedOriginal = lowerInput.replace(/[^a-z0-9]/g, "");
  if (ALIAS_MAP[strippedOriginal]) {
    return ALIAS_MAP[strippedOriginal];
  }

  // Preprocess input to expand common abbreviations/fixes
  let words = lowerInput.split(/\s+/);
  words = words.map(w => {
    if (w === "dev" || w === "devel") return "developer";
    if (w === "anal") return "analyst";
    if (w === "eng" || w === "engin") return "engineer";
    return w;
  });
  const processedInput = words.join(" ");
  const strippedInput = processedInput.replace(/[^a-z0-9]/g, "");

  // Check alias again on preprocessed input
  if (ALIAS_MAP[strippedInput]) {
    return ALIAS_MAP[strippedInput];
  }

  // 2. Substring / Prefix Matching
  const substringMatches = STANDARD_ROLES.filter(role => {
    const normRole = role.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normRole.includes(strippedInput) || strippedInput.includes(normRole);
  });

  if (substringMatches.length > 0) {
    // Return the match that has the closest length to the input
    substringMatches.sort((a, b) => {
      const diffA = Math.abs(a.length - trimmed.length);
      const diffB = Math.abs(b.length - trimmed.length);
      return diffA - diffB;
    });
    return substringMatches[0];
  }

  // 3. Levenshtein Distance Matching
  let bestMatch = null;
  let minDistance = 999;
  
  for (const role of STANDARD_ROLES) {
    const normRole = role.toLowerCase().replace(/[^a-z0-9]/g, "");
    const distance = getLevenshteinDistance(strippedInput, normRole);
    // threshold for distance depending on the input length
    const threshold = Math.max(3, Math.floor(normRole.length * 0.35));
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      bestMatch = role;
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // If no good match, just return the input (title-cased)
  return trimmed.replace(/\b\w/g, (l) => l.toUpperCase());
}
