import { AlertTriangle, Briefcase, CheckCircle, FileText, Gauge, Target, Zap } from "lucide-react";
import { StatCard } from "./shared";

export default function CareerStatistics({ model }) {
  const stats = [
    { label: "Skill Families", value: model.summary.families_tracked ?? model.familyGaps.length, suffix: "", icon: Target, tone: "blue" },
    { label: "High Gap Families", value: model.summary.high_gap_families ?? model.familyGaps.filter((f) => f.gap_level >= 35).length, suffix: "", icon: AlertTriangle, tone: "red" },
    { label: "Quick Wins", value: model.summary.quick_win_count ?? model.quickWins.length, suffix: "", icon: Zap, tone: "amber" },
    { label: "Matched Micro-skills", value: model.summary.matched_micro_skills ?? model.matchedCount, suffix: "", icon: CheckCircle, tone: "green" },
    { label: "Resume Strength", value: Math.round(model.resumeMatch), suffix: "%", icon: FileText, tone: "blue" },
    { label: "ATS Readiness", value: model.atsScore, suffix: "%", icon: Gauge, tone: "amber" },
    { label: "Job Match Score", value: model.readinessScore, suffix: "%", icon: Briefcase, tone: "green" },
  ];

  return (
    <section className="dashboard-stat-grid">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}