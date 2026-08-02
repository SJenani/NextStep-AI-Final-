import { Award, BarChart3, Target, TrendingDown, TrendingUp } from "lucide-react";
import { ProgressBar, SectionHeading } from "./shared";
import { titleCase } from "./utils";

function MarketList({ title, icon: Icon, items, tone }) {
  return (
    <article className={`dashboard-market-list ${tone}`}>
      <h3><Icon size={17} /> {title}</h3>
      {items.length ? items.map((item, index) => (
        <div key={`${title}-${item}`} className="dashboard-market-row">
          <span>{titleCase(item)}</span>
          <ProgressBar value={Math.max(22, 92 - index * 11)} tone={tone === "red" ? "red" : tone === "amber" ? "amber" : "green"} />
        </div>
      )) : <p className="dashboard-muted">No market signals yet.</p>}
    </article>
  );
}

export default function MarketDemand({ model }) {
  const requestedSkills = [...model.missingSkills, ...model.trendingSkills].slice(0, 8);
  const highestPaying = (model.trendingSkills.length ? model.trendingSkills : ["cloud", "machine learning", "react", "sql"]).slice(0, 5);
  const losingPopularity = model.familyGaps.filter((family) => family.demand_count <= 2).map((family) => family.family).slice(0, 5);

  return (
    <section className="dashboard-card">
      <SectionHeading icon={BarChart3} title="Market Demand" />
      <div className="dashboard-market-grid">
        <MarketList title="Trending technologies" icon={TrendingUp} items={model.trendingSkills.slice(0, 6)} tone="green" />
        <MarketList title="Most requested skills" icon={Target} items={requestedSkills} tone="blue" />
        <MarketList title="Highest paying skills" icon={Award} items={highestPaying} tone="amber" />
        <MarketList title="Skills losing popularity" icon={TrendingDown} items={losingPopularity.length ? losingPopularity : ["Low-demand legacy gaps"]} tone="red" />
      </div>
    </section>
  );
}