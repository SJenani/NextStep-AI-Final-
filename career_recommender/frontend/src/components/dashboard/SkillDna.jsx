import { BookOpen, Clock, ExternalLink, Gauge, Sparkles, Target, X, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useEffect } from "react";
import { EmptyState, SectionHeading } from "./shared";
import { buildSkillDetail, titleCase } from "./utils";

function SkillGene({ gene, family, demand, onOpen }) {
  return (
    <button
      type="button"
      className={`dashboard-gene dashboard-gene-${gene.status}`}
      onClick={() => onOpen(buildSkillDetail(gene.skill, gene.status, family, demand))}
      title={`${gene.skill} (${gene.label || titleCase(gene.status)})`}
    >
      <span>{gene.skill}</span>
      <small>{gene.label || titleCase(gene.status)}</small>
    </button>
  );
}

export default function SkillDnaSection({ profiles, selectedId, onSelect, onOpenSkill }) {
  if (!profiles.length) {
    return (
      <EmptyState
        title="Skill DNA will appear here"
        message="Upload a resume or refresh recommendations to compare your skills against target roles."
      />
    );
  }

  const activeProfile = profiles.find((p) => p.id === selectedId) || profiles[0];
  const matched = activeProfile.job_genes.filter((g) => g.status === "matched").length;
  const partial = activeProfile.job_genes.filter((g) => g.status === "partial").length;
  const missing = activeProfile.job_genes.filter((g) => g.status === "missing").length;

  return (
    <section className="dashboard-card dashboard-dna-card">
      <SectionHeading icon={Sparkles} title="Skill DNA">
        <div className="dashboard-dna-tabs">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              className={activeProfile.id === profile.id ? "active" : ""}
              onClick={() => onSelect(profile.id)}
              title={profile.role_title}
            >
              {profile.role_title}
            </button>
          ))}
        </div>
      </SectionHeading>
      <div className="dashboard-dna-summary">
        <div><strong>{matched}</strong><span>Matched</span></div>
        <div><strong>{partial}</strong><span>Partial</span></div>
        <div><strong>{missing}</strong><span>Missing</span></div>
        <div><strong>{Math.round(activeProfile.match_score)}%</strong><span>Overall fit</span></div>
      </div>
      <div className="dashboard-dna-columns">
        <div>
          <h3>Your Skill DNA</h3>
          <div className="dashboard-gene-grid">
            {activeProfile.user_genes.map((gene) => (
              <SkillGene key={`user-${activeProfile.id}-${gene.skill}`} gene={gene} family="Current profile" demand={2} onOpen={onOpenSkill} />
            ))}
          </div>
        </div>
        <div>
          <h3>Job Requires</h3>
          <div className="dashboard-gene-grid">
            {activeProfile.job_genes.map((gene) => (
              <SkillGene key={`job-${activeProfile.id}-${gene.skill}`} gene={gene} family={activeProfile.role_title} demand={4} onOpen={onOpenSkill} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SkillModal({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div className="dashboard-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className={`dashboard-modal status-${detail.status}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${detail.skill} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="dashboard-modal-close" onClick={onClose} aria-label="Close skill details">
          <X size={20} strokeWidth={1} />
        </button>
        
        <div className={`dashboard-skill-modal-hero status-${detail.status}`} style={{ borderBottom: "1px solid rgba(226, 232, 240, 0.8)", borderRadius: "20px 20px 0 0", marginBottom: "1.5rem" }}>
          <div className="dashboard-skill-status-wrapper">
            <span className={`dashboard-skill-status dashboard-gene-${detail.status}`}>
              {detail.status === "matched" && <CheckCircle size={13} className="inline mr-1 align-text-top" />}
              {detail.status === "partial" && <AlertCircle size={13} className="inline mr-1 align-text-top" />}
              {detail.status === "missing" && <XCircle size={13} className="inline mr-1 align-text-top" />}
              {titleCase(detail.status)}
            </span>
            {detail.family && <span className="dashboard-skill-family-badge" contentEditable suppressContentEditableWarning>{detail.family}</span>}
          </div>
          <h2 contentEditable suppressContentEditableWarning>{titleCase(detail.skill)}</h2>
          <p className="dashboard-skill-hero-desc" contentEditable suppressContentEditableWarning>{detail.description}</p>
        </div>

        <div className="dashboard-skill-why-spotlight">
          <div className="dashboard-skill-why-icon-container">
            <Target size={20} />
          </div>
          <div className="dashboard-skill-why-content">
            <h4 contentEditable suppressContentEditableWarning>Why recruiters look for this</h4>
            <p contentEditable suppressContentEditableWarning>{detail.why}</p>
          </div>
        </div>

        <div className="dashboard-skill-meta-grid">
          <div className="dashboard-skill-meta-card">
            <div className="dashboard-skill-meta-icon"><Gauge size={20} /></div>
            <div className="dashboard-skill-meta-info">
              <span contentEditable suppressContentEditableWarning>Learning Difficulty</span>
              <strong contentEditable suppressContentEditableWarning>{detail.difficulty}</strong>
            </div>
          </div>
          <div className="dashboard-skill-meta-card">
            <div className="dashboard-skill-meta-icon"><Clock size={20} /></div>
            <div className="dashboard-skill-meta-info">
              <span contentEditable suppressContentEditableWarning>Estimated Study Time</span>
              <strong contentEditable suppressContentEditableWarning>{detail.time}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-skill-resources-section">
          <h3>Recommended Learning Resources</h3>
          <div className="dashboard-resources-container">
            {detail.resources.map((resource) => (
              <a key={resource.url} className="dashboard-resource-card" href={resource.url} target="_blank" rel="noreferrer">
                <div className="dashboard-resource-card-main">
                  <BookOpen size={18} className="dashboard-resource-icon" />
                  <div className="dashboard-resource-info">
                    <span className="dashboard-resource-platform" contentEditable suppressContentEditableWarning>{resource.platform}</span>
                    <strong className="dashboard-resource-title" contentEditable suppressContentEditableWarning>{resource.title}</strong>
                    {resource.note && <span className="dashboard-resource-note" contentEditable suppressContentEditableWarning>{resource.note}</span>}
                  </div>
                </div>
                <div className="dashboard-resource-card-action">
                  {resource.badge && <span className="dashboard-resource-badge">{resource.badge}</span>}
                  <ExternalLink size={16} className="dashboard-resource-link-icon" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="dashboard-skill-projects-section">
          <h3>Suggested Projects & Actions</h3>
          <ul className="dashboard-project-checklist">
            {detail.projects.map((project, idx) => (
              <li key={idx} className="dashboard-project-checklist-item">
                <div className="dashboard-project-check-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span contentEditable suppressContentEditableWarning style={{ display: 'block', width: '100%' }}>{project}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
