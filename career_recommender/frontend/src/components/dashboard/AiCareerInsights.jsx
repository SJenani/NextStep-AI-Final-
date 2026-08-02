import { AlertTriangle, Award, Brain, Sparkles, TrendingUp, Zap } from "lucide-react";
import { SectionHeading } from "./shared";
import { titleCase } from "./utils";

export default function AiCareerInsights({ model }) {
  const strongest = model.strongestFamilies.map((f) => f.family).join(", ") || model.matchedSkills.slice(0, 3).map(titleCase).join(", ") || "profile fundamentals";
  const weakest = model.weakestFamilies.map((f) => f.family).join(", ") || model.missingSkills.slice(0, 3).map(titleCase).join(", ") || "role-specific proof";
  const insights = [
    { label: "Strongest skill areas", value: strongest, icon: Award },
    { label: "Weakest skill areas", value: weakest, icon: AlertTriangle },
    { label: "Fastest match unlock", value: titleCase(model.fastestSkill), icon: Zap },
    { label: "Estimated match increase", value: `+${model.estimatedLift}% after the next learning sprint`, icon: TrendingUp },
  ];

  return (
    <section className="dashboard-card">
      <SectionHeading icon={Brain} title="AI Career Insights" />
      <div className="dashboard-insight-grid">
        {insights.map(({ label, value, icon: Icon }) => (
          <article key={label} className="dashboard-insight-card">
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="dashboard-advice">
        <Sparkles size={18} />
        <p>
          Prioritize {titleCase(model.fastestSkill)} first, then document one proof project. This creates a clearer resume signal
          and helps recruiters connect your existing strengths to {model.recommendedRole} openings faster.
        </p>
      </div>
    </section>
  );
}