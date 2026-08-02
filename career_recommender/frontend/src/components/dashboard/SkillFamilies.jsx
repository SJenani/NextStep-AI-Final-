import { ChevronDown, Target } from "lucide-react";
import { EmptyState, ProgressBar, SectionHeading } from "./shared";
import { buildSkillDetail, estimateHours, getPriority } from "./utils";

function SkillList({ title, skills, status, family, demand = 0, onOpenSkill }) {
  return (
    <div className="dashboard-skill-list">
      <h4>{title}</h4>
      <div>
        {skills.length ? skills.map((skill) => (
          <button
            key={`${title}-${skill}`}
            type="button"
            className={`dashboard-chip dashboard-gene-${status}`}
            onClick={() => onOpenSkill(buildSkillDetail(skill, status, family, demand))}
          >
            {skill}
          </button>
        )) : <span className="dashboard-muted">No signals yet</span>}
      </div>
    </div>
  );
}

function SkillFamilyCard({ family, expanded, onToggle, onOpenSkill }) {
  const priority = getPriority(family.gap_level, family.demand_count);
  const nextSkill = family.adjacent_next_skills?.[0] || family.missing_micro_skills?.[0] || "Portfolio proof";
  const hours = estimateHours(nextSkill, family.demand_count);
  const tone = priority === "High" ? "red" : priority === "Medium" ? "amber" : "green";

  return (
    <article className="dashboard-family-card">
      <button type="button" className="dashboard-family-top" onClick={onToggle} aria-expanded={expanded}>
        <span>
          <strong>{family.family}</strong>
          <small>{family.summary || "Skill family fit against current market expectations."}</small>
        </span>
        <span className={`dashboard-priority ${priority.toLowerCase()}`}>{priority}</span>
        <ChevronDown className={expanded ? "rotate" : ""} size={20} />
      </button>
      <div className="dashboard-family-metrics">
        <div><span>Current strength</span><strong>{Math.round(family.current_level)}%</strong></div>
        <div><span>Industry expectation</span><strong>{Math.round(family.target_level)}%</strong></div>
        <div><span>Gap</span><strong>{Math.round(family.gap_level)}%</strong></div>
        <div><span>Job demand</span><strong>{family.demand_count}</strong></div>
      </div>
      <ProgressBar value={family.current_level} tone={tone} />
      <div className="dashboard-family-next">
        <span>Next recommended skill</span>
        <button type="button" onClick={() => onOpenSkill(buildSkillDetail(nextSkill, "missing", family.family, family.demand_count))}>
          {nextSkill} - {hours}h estimate
        </button>
      </div>
      {expanded && (
        <div className="dashboard-family-details">
          <SkillList title="Skills already mastered" skills={family.matched_micro_skills || []} status="matched" family={family.family} onOpenSkill={onOpenSkill} />
          <SkillList title="Missing micro-skills" skills={family.missing_micro_skills || []} status="missing" family={family.family} demand={family.demand_count} onOpenSkill={onOpenSkill} />
          <SkillList title="Next skill path" skills={family.adjacent_next_skills || []} status="partial" family={family.family} demand={family.demand_count} onOpenSkill={onOpenSkill} />
        </div>
      )}
    </article>
  );
}

export default function SkillFamilies({ families, expandedFamilies, onToggleFamily, onOpenSkill }) {
  return (
    <section className="dashboard-card">
      <SectionHeading icon={Target} title="Skill Family Cards" />
      <div className="dashboard-family-stack">
        {families.length ? families.map((family) => (
          <SkillFamilyCard
            key={family.family}
            family={family}
            expanded={Boolean(expandedFamilies[family.family])}
            onToggle={() => onToggleFamily(family.family)}
            onOpenSkill={onOpenSkill}
          />
        )) : (
          <EmptyState title="No family gaps found" message="Your dashboard did not return family-level gap data for the selected filters." />
        )}
      </div>
    </section>
  );
}