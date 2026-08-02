import { Clock } from "lucide-react";
import { SectionHeading } from "./shared";
import { titleCase } from "./utils";

export default function RecentActivity({ model }) {
  const now = new Date();
  const rows = [
    ["Recently learned skills", model.matchedSkills.slice(0, 3).map(titleCase).join(", ") || "No recent skill signals"],
    ["Recently uploaded resume", model.resumeMatch > 0 ? "Resume analysis available" : "No upload detected"],
    ["Latest career recommendations", `Focus on ${titleCase(model.fastestSkill)}`],
    ["Last dashboard update", now.toLocaleString()],
    ["Last ATS analysis", `${model.atsScore}% readiness`],
  ];

  return (
    <section className="dashboard-card">
      <SectionHeading icon={Clock} title="Recent Activity" />
      <div className="dashboard-activity-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}