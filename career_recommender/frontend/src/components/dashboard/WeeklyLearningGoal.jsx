import { Calendar } from "lucide-react";
import { ProgressRing, SectionHeading } from "./shared";
import { addDays, formatDate } from "./utils";

export default function WeeklyLearningGoal({ model }) {
  const target = Math.max(3, Math.min(5, model.quickWins.length || 3));
  const completed = Math.min(target, Math.max(1, Math.floor(model.matchedCount / 4)));
  const progress = Math.round((completed / target) * 100);
  const completionDate = addDays(new Date(), Math.max(1, target - completed) * 2);

  return (
    <section className="dashboard-card dashboard-learning-goal">
      <SectionHeading icon={Calendar} title="Weekly Learning Goal" />
      <ProgressRing value={progress} label="Goal progress" tone="green" />
      <div className="dashboard-goal-list">
        <div><span>Weekly target</span><strong>{target} skills</strong></div>
        <div><span>Completed skills</span><strong>{completed}</strong></div>
        <div><span>Remaining tasks</span><strong>{Math.max(0, target - completed)}</strong></div>
        <div><span>Estimated completion</span><strong>{formatDate(completionDate)}</strong></div>
      </div>
    </section>
  );
}