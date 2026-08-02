import { AlertTriangle, Briefcase, CheckCircle, FileText, Gauge } from "lucide-react";
import { MetricCard, ProgressRing } from "./shared";

const topMetrics = [
  { label: "Overall ATS Score", key: "atsScore", suffix: "%", icon: Gauge },
  { label: "Resume Match", key: "resumeMatch", suffix: "%", icon: FileText },
  { label: "Skills Matched", key: "matchedCount", suffix: "", icon: CheckCircle },
  { label: "Missing Skills", key: "missingCount", suffix: "", icon: AlertTriangle },
];

export default function CareerOverview({ model }) {
  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <p className="dashboard-eyebrow">Skill dashboard</p>
        <h2>Career readiness, skill gaps, and market demand in one view</h2>
        <p>
          A recruiter-quality snapshot of your fit for current roles, powered by matched skills,
          missing micro-skills, family gaps, and live dashboard analysis.
        </p>
        <div className="dashboard-role-card">
          <Briefcase size={18} />
          <span>Recommended Career Role</span>
          <strong>{model.recommendedRole}</strong>
        </div>
      </div>
      <div className="dashboard-hero-score">
        <ProgressRing value={model.readinessScore} label="Career readiness" tone="green" />
      </div>
      <div className="dashboard-overview-grid">
        {topMetrics.map(({ label, key, suffix, icon }) => (
          <MetricCard
            key={label}
            label={label}
            value={key === "resumeMatch" ? Math.round(model[key]) : model[key]}
            suffix={suffix}
            icon={icon}
          />
        ))}
      </div>
    </section>
  );
}
