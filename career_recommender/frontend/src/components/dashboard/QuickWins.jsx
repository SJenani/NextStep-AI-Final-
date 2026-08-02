import { Briefcase, Clock, TrendingUp, Zap } from "lucide-react";
import { EmptyState, SectionHeading } from "./shared";
import { buildSkillDetail, estimateHours } from "./utils";

export default function QuickWinsPanel({ quickWins, onOpenSkill }) {
  return (
    <section className="dashboard-card">
      <SectionHeading icon={Zap} title="Quick Wins" />
      <div className="dashboard-quick-grid">
        {quickWins.length ? quickWins.map((item) => {
          const hours = estimateHours(item.skill, item.demand_count);
          return (
            <article key={`${item.family}-${item.skill}`} className="dashboard-quick-card">
              <button type="button" onClick={() => onOpenSkill(buildSkillDetail(item.skill, "missing", item.family, item.demand_count))}>
                {item.skill}
              </button>
              <p>{item.note || "Fast adjacent skill based on your current profile."}</p>
              <div>
                <span><Clock size={14} /> {hours}h</span>
                <span><TrendingUp size={14} /> Demand {item.demand_count}</span>
                <span><Briefcase size={14} /> {Math.max(1, Math.round(item.demand_count / 2))} jobs</span>
              </div>
              <small>Unlock path: {item.unlocked_by?.length ? item.unlocked_by.join(", ") : "current matched skills"}</small>
            </article>
          );
        }) : (
          <EmptyState title="No quick wins yet" message="Add more profile skills or upload a resume to unlock faster learning suggestions." />
        )}
      </div>
    </section>
  );
}