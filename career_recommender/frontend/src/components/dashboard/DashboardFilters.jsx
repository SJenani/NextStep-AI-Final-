import { Filter } from "lucide-react";
import { DEFAULT_FILTERS, EXPERIENCE_LEVELS, INDUSTRIES, LOCATIONS } from "./model";

export default function DashboardFilters({ filters, onChange, model }) {
  const roles = ["All roles", ...Array.from(new Set(model.skillDnaProfiles.map((profile) => profile.role_title).filter(Boolean)))];
  if (filters.targetRole && !roles.includes(filters.targetRole)) {
    roles.push(filters.targetRole);
  }
  const exp = [...EXPERIENCE_LEVELS];
  if (filters.experienceLevel && !exp.includes(filters.experienceLevel)) {
    exp.push(filters.experienceLevel);
  }
  const ind = [...INDUSTRIES];
  if (filters.industry && !ind.includes(filters.industry)) {
    ind.push(filters.industry);
  }
  const categories = ["All categories", ...Array.from(new Set(model.allFamilyGaps.map((family) => family.family)))];
  if (filters.skillCategory && !categories.includes(filters.skillCategory)) {
    categories.push(filters.skillCategory);
  }
  const loc = [...LOCATIONS];
  if (filters.location && !loc.includes(filters.location)) {
    loc.push(filters.location);
  }

  const filterConfig = [
    ["targetRole", "Target Role", roles],
    ["experienceLevel", "Experience Level", exp],
    ["industry", "Industry", ind],
    ["skillCategory", "Skill Category", categories],
    ["location", "Job Location", loc],
  ];

  return (
    <section className="dashboard-card dashboard-filter-card">
      <div className="dashboard-section-heading compact">
        <span><Filter size={16} /> Dashboard Filters</span>
        <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="dashboard-text-button">Reset</button>
      </div>
      <div className="dashboard-filter-grid">
        {filterConfig.map(([key, label, options]) => (
          <label key={key} className="dashboard-field">
            <span>{label}</span>
            <select value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })}>
              {options.map((option) => (
                <option key={`${key}-${option}`} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}