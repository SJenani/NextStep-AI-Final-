import { Sparkles } from "lucide-react";
import { SectionHeading } from "./shared";
import { estimateHours, titleCase } from "./utils";

export default function SmartRecommendations({ model }) {
  const missing = new Set(model.missingSkills.map((skill) => String(skill).toLowerCase()));
  const recommendations = [
    {
      title: `Learn ${titleCase(model.fastestSkill)} to unlock more ${model.recommendedRole} opportunities.`,
      priority: "High",
      impact: `+${model.estimatedLift}% job match`,
      time: `${estimateHours(model.fastestSkill, model.quickWins[0]?.demand_count || 6)} hours`,
    },
    {
      title: "Learn Deployment to improve cloud readiness.",
      priority: missing.has("deployment") || missing.has("cloud") ? "High" : "Medium",
      impact: "+8% cloud readiness",
      time: "14 hours",
    },
    {
      title: "Improve Communication for better interview performance.",
      priority: "Medium",
      impact: "+6% interview confidence",
      time: "6 hours",
    },
  ];

  return (
    <section className="dashboard-card">
      <SectionHeading icon={Sparkles} title="Smart Recommendations" />
      <div className="dashboard-smart-grid">
        {recommendations.map((item) => (
          <article key={item.title} className="dashboard-smart-card">
            <span className={`dashboard-priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
            <strong>{item.title}</strong>
            <div><span>{item.impact}</span><span>{item.time}</span></div>
          </article>
        ))}
      </div>
    </section>
  );
}