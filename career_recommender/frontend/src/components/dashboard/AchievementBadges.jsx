import { Award } from "lucide-react";
import { SectionHeading } from "./shared";

export default function AchievementBadges({ model }) {
  const skillSet = new Set(model.matchedSkills.map((skill) => String(skill).toLowerCase()));
  const badges = [
    ["React Expert", skillSet.has("react")],
    ["Backend Ready", ["fastapi", "backend", "node.js", "api"].some((skill) => skillSet.has(skill))],
    ["API Builder", ["api", "rest api", "fastapi"].some((skill) => skillSet.has(skill))],
    ["Git Master", ["git", "github"].some((skill) => skillSet.has(skill))],
    ["Cloud Beginner", ["cloud", "aws", "azure", "deployment"].some((skill) => skillSet.has(skill))],
    ["Resume Optimized", model.atsScore >= 70],
  ];

  return (
    <section className="dashboard-card dashboard-achievement-card">
      <SectionHeading icon={Award} title="Achievement Badges" />
      <div className="dashboard-badge-grid">
        {badges.map(([label, earned]) => (
          <div key={label} className={`dashboard-badge ${earned ? "earned" : ""}`}>
            <Award size={18} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
