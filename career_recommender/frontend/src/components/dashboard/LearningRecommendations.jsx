import { BookOpen, ExternalLink } from "lucide-react";
import { EmptyState, SectionHeading } from "./shared";
import { estimateHours, getCourseDetails, titleCase } from "./utils";

export default function LearningRecommendations({ model }) {
  const skills = Array.from(new Set([...model.quickWins.map((item) => item.skill), ...model.missingSkills])).slice(0, 5);

  return (
    <section className="dashboard-card">
      <SectionHeading icon={BookOpen} title="Learning Recommendations" />
      <div className="dashboard-course-grid">
        {skills.length ? skills.map((skill, index) => {
          const course = getCourseDetails(skill);
          const hours = estimateHours(skill, model.quickWins[index]?.demand_count || 4);
          const level = hours > 24 ? "Advanced" : hours > 14 ? "Intermediate" : "Beginner";
          return (
            <a key={skill} className="dashboard-course-card" href={course.url} target="_blank" rel="noreferrer">
              <div>
                <span>{course.platform}</span>
                <strong>{course.title}</strong>
              </div>
              <p>{course.note}</p>
              <div>
                <small>{course.badge}</small>
                <small>{hours} hours</small>
                <small>{level}</small>
              </div>
              <em>Recommended because {titleCase(skill)} appears in your current role gaps or quick-win path.</em>
              <ExternalLink size={16} />
            </a>
          );
        }) : (
          <EmptyState title="No course recommendations yet" message="The dashboard needs missing-skill signals before it can suggest courses." />
        )}
      </div>
    </section>
  );
}