import { useEffect, useState } from "react";
import { COURSE_CATALOG, LEGACY_COURSE_TITLE_ALIASES } from "../constants/courseCatalog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function PillList({ items, className, formatItem = (item) => item, getItemHref }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        (() => {
          const key = typeof item === "string" ? item : (item?.course_id || item?.title || idx);
          const href = getItemHref ? getItemHref(item) : "";
          const label = formatItem(item);

          return href ? (
            <a key={`${key}-${idx}`} href={href} target="_blank" rel="noreferrer" className={className}>
              {label}
            </a>
          ) : (
            <span key={`${key}-${idx}`} className={className}>
              {label}
            </span>
          );
        })()
      ))}
    </div>
  );
}

function DetailBlock({
  title,
  items,
  className,
  emptyText,
  formatItem,
  getItemHref,
  panelClassName = "",
  titleClassName = "",
  isDone = false,
}) {
  const isSkill = title === "Technical Skills" || title === "Soft Skills" || title === "Tools";

  return (
    <div className={panelClassName}>
      <p className={`text-sm font-bold uppercase tracking-[0.18em] text-slate-600 ${titleClassName}`}>{title}</p>
      <div className="mt-3">
        {items?.length ? (
          isSkill ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((skill, idx) => {
                const currentLevel = isDone ? "L3" : "L1";
                const requiredLevel = "L3";
                const percent = isDone ? 100 : 33;
                const status = isDone ? "Completed" : "Acquiring";

                return (
                  <div key={`${skill}-${idx}`} className="rounded-xl border border-slate-100 bg-white p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900 capitalize">{skill}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isDone ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                      }`}>{status}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <span>Cur: {currentLevel}</span>
                      <span>Req: {requiredLevel}</span>
                    </div>
                    
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <PillList items={items} className={className} formatItem={formatItem} getItemHref={getItemHref} />
          )
        ) : (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function normalizeLegacyKey(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveCourseId(item) {
  if (item && typeof item === "object" && item.course_id) {
    return item.course_id;
  }

  const title = typeof item === "string"
    ? item
    : (item?.title || item?.label || item?.name || "");

  return LEGACY_COURSE_TITLE_ALIASES[normalizeLegacyKey(title)] || "";
}

function resolveRoadmapCatalogItem(item) {
  const raw = typeof item === "string"
    ? { title: item }
    : (item && typeof item === "object" ? item : {});
  const courseId = resolveCourseId(item);
  const catalogEntry = courseId ? COURSE_CATALOG[courseId] : null;
  const rawUrl = raw.url || raw.href || catalogEntry?.link || "";
  const safeUrl = isYoutubeShortsUrl(rawUrl) ? "" : rawUrl;

  return {
    courseId,
    title: raw.title || raw.label || raw.name || catalogEntry?.title || "Learning resource",
    url: safeUrl,
    type: raw.type || catalogEntry?.type || "resource",
    provider: raw.provider || catalogEntry?.provider || "",
    level: raw.level || catalogEntry?.level || "",
    note: isYoutubeShortsUrl(rawUrl)
      ? [raw.note, "Shorts skipped, long-form video preferred"].filter(Boolean).join(" - ")
      : (raw.note || ""),
  };
}

function formatCertificationDisplay(item) {
  const resolved = resolveRoadmapCatalogItem(item);
  return resolved.title;
}

const LEARNING_VIDEO_SUGGESTIONS = [
  { keywords: ["deployment", "ci/cd", "github actions", "production app deployment"], tutorialTitle: "CI/CD Tutorial using GitHub Actions", tutorialVideoId: "YLtlz88zrLg", resourceTitle: "GitHub Actions Documentation", resourceUrl: "https://docs.github.com/en/actions", resourceProvider: "GitHub Docs" },
  { keywords: ["testing", "reliability", "qa", "test"], tutorialTitle: "Software Testing Bootcamp Introduction", tutorialVideoId: "E2t5XbWwj7I", resourceTitle: "Playwright Testing Docs", resourceUrl: "https://playwright.dev/docs/intro", resourceProvider: "Playwright" },
  { keywords: ["service architecture", "microservices", "service oriented", "architecture guides"], tutorialTitle: "Microservices Explained in 5 Minutes", tutorialVideoId: "lL_j7ilk7rc", resourceTitle: "Microservices.io Resource Guide", resourceUrl: "https://microservices.io/resources/", resourceProvider: "microservices.io" },
  { keywords: ["system design", "architecture walkthrough", "case studies"], tutorialTitle: "System Design for Beginners Course", tutorialVideoId: "m8Icp_Cid5o", resourceTitle: "System Design Roadmap", resourceUrl: "https://roadmap.sh/system-design", resourceProvider: "roadmap.sh" },
  { keywords: ["python", "pandas", "jupyter"], tutorialTitle: "Python for Beginners", tutorialVideoId: "QXeEoD0pB3E", resourceTitle: "The Python Tutorial", resourceUrl: "https://docs.python.org/3/tutorial/", resourceProvider: "Python Docs" },
  { keywords: ["sql", "database schema", "cohort analysis"], tutorialTitle: "SQL Tutorial - Full Database Course for Beginners", tutorialVideoId: "HXV3zeQKqGY", resourceTitle: "SQLBolt Interactive Tutorial", resourceUrl: "https://sqlbolt.com/", resourceProvider: "SQLBolt" },
  { keywords: ["react", "component architecture", "frontend patterns"], tutorialTitle: "React Course for Beginners", tutorialVideoId: "TtPXvEcE11E", resourceTitle: "React Learn", resourceUrl: "https://react.dev/learn", resourceProvider: "React Docs" },
  { keywords: ["javascript", "crud", "vanilla javascript"], tutorialTitle: "Learning JavaScript for the First Time", tutorialVideoId: "mc0s-viF7q4", resourceTitle: "JavaScript Guide", resourceUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", resourceProvider: "MDN" },
  { keywords: ["responsive", "html", "css", "web design", "ui practice"], tutorialTitle: "Introduction To Responsive Web Design", tutorialVideoId: "srvUrASNj0s", resourceTitle: "Responsive Design Guide", resourceUrl: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design", resourceProvider: "MDN" },
  { keywords: ["figma", "ui/ux"], tutorialTitle: "Master Figma UI Design in 15 Minutes", tutorialVideoId: "uQsyobT2Rv8", resourceTitle: "Designing in Figma", resourceUrl: "https://help.figma.com/hc/en-us/categories/360002051613-Designing-in-Figma", resourceProvider: "Figma Help" },
  { keywords: ["postman", "api testing"], tutorialTitle: "Postman API Testing Tutorial for Beginners", tutorialVideoId: "CLG0ha_a0q8", resourceTitle: "Postman Learning Center", resourceUrl: "https://learning.postman.com/docs/getting-started/overview/", resourceProvider: "Postman" },
  { keywords: ["api design", "rest api", "api troubleshooting", "api basics"], tutorialTitle: "REST API Design and Implementation Best Practices", tutorialVideoId: "7nm1pYuKAhY", resourceTitle: "Best Practices for RESTful Web API Design", resourceUrl: "https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design", resourceProvider: "Microsoft Learn" },
  { keywords: ["linux", "command-line", "terminal"], tutorialTitle: "Linux Command Line Tutorial For Beginners", tutorialVideoId: "YHFzr-akOas", resourceTitle: "Linux Journey", resourceUrl: "https://linuxjourney.com/", resourceProvider: "Linux Journey" },
  { keywords: ["git", "version control"], tutorialTitle: "Git and GitHub Tutorial for Beginners", tutorialVideoId: "tRZGeaHPoaw", resourceTitle: "Git Tutorial", resourceUrl: "https://git-scm.com/docs/gittutorial", resourceProvider: "git-scm" },
  { keywords: ["excel", "spreadsheet"], tutorialTitle: "Microsoft Excel Tutorial for Beginners", tutorialVideoId: "Vl0H-qTclOg", resourceTitle: "Excel Video Training", resourceUrl: "https://support.microsoft.com/en-us/office/excel-video-training-9bc05390-e94c-46af-a5b3-d7c22f6990bb", resourceProvider: "Microsoft Support" },
  { keywords: ["power bi", "dashboard design", "dashboard", "reporting"], tutorialTitle: "Power BI for Data Analytics - Full Course for Beginners", tutorialVideoId: "FwjaHCVNBWA", resourceTitle: "Power BI Learning Path", resourceUrl: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi", resourceProvider: "Microsoft Learn" },
  { keywords: ["tableau", "visualization"], tutorialTitle: "Tableau Full Course for Beginners", tutorialVideoId: "aHaOIvR00So", resourceTitle: "Tableau Get Started Tutorial", resourceUrl: "https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm", resourceProvider: "Tableau Help" },
  { keywords: ["analytics", "data analysis", "case-study based analytics"], tutorialTitle: "Excel for Data Analytics - Full Course for Beginners", tutorialVideoId: "pCJ15nGFgVg", resourceTitle: "Kaggle Learn", resourceUrl: "https://www.kaggle.com/learn", resourceProvider: "Kaggle" },
  { keywords: ["seo"], tutorialTitle: "Complete SEO Course for Beginners", tutorialVideoId: "xsVTqzratPs", resourceTitle: "SEO Starter Guide", resourceUrl: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", resourceProvider: "Google Search Central" },
  { keywords: ["marketing", "campaign", "email lifecycle", "growth experimentation", "content planning"], tutorialTitle: "Digital Marketing Step By Step Guide For Beginners", tutorialVideoId: "9jyg_d9itas", resourceTitle: "Digital Marketing Course", resourceUrl: "https://academy.hubspot.com/courses/digital-marketing", resourceProvider: "HubSpot Academy" },
  { keywords: ["accounting", "finance", "forecasting", "financial storytelling"], tutorialTitle: "Accounting Basics: A Guide to Almost Everything", tutorialVideoId: "yYX4bvQSqbo", resourceTitle: "Accounting Basics Guide", resourceUrl: "https://www.investopedia.com/accounting-4689743", resourceProvider: "Investopedia" },
  { keywords: ["financial modeling", "scenario modeling"], tutorialTitle: "Financial Modeling Tutorial for Beginners", tutorialVideoId: "QhBLvRu2XSI", resourceTitle: "What Is Financial Modeling?", resourceUrl: "https://corporatefinanceinstitute.com/resources/financial-modeling/what-is-financial-modeling/", resourceProvider: "CFI" },
  { keywords: ["communication", "process improvement", "workflow planning", "presentation"], tutorialTitle: "Communication Skills Course for Beginners", tutorialVideoId: "A0BMyN3Eofk", resourceTitle: "Guide to Communication Skills", resourceUrl: "https://www.coursera.org/articles/communication-skills", resourceProvider: "Coursera" },
  { keywords: ["crm", "hubspot", "salesforce", "customer lifecycle"], tutorialTitle: "HubSpot CRM Tutorial for Beginners", tutorialVideoId: "t8QM5zunC44", resourceTitle: "Set Up Your CRM", resourceUrl: "https://knowledge.hubspot.com/crm-setup/set-up-your-crm", resourceProvider: "HubSpot Knowledge Base" },
  { keywords: ["accessibility", "a11y"], tutorialTitle: "Learn Accessibility - Full a11y Tutorial", tutorialVideoId: "e2nkq3h1P68", resourceTitle: "Introduction to Web Accessibility", resourceUrl: "https://www.w3.org/WAI/fundamentals/accessibility-intro/", resourceProvider: "W3C WAI" },
  { keywords: ["performance", "optimization"], tutorialTitle: "The Ultimate Guide to Web Performance", tutorialVideoId: "0fONene3OIA", resourceTitle: "web.dev Fast", resourceUrl: "https://web.dev/explore/fast", resourceProvider: "web.dev" },
];

function isYoutubeShortsUrl(url) {
  return typeof url === "string" && /youtube\.com\/shorts\//i.test(url);
}

function normalizeLearningResource(resource) {
  if (!resource || (typeof resource !== "string" && typeof resource !== "object")) {
    return {
      title: "Learning resource",
      url: "",
      type: "resource",
      provider: "",
      note: "",
    };
  }

  const resolved = resolveRoadmapCatalogItem(resource);
  const inferredType =
    resolved.type ||
    (resolved.url.includes("youtube.com") || resolved.url.includes("youtu.be") ? "video" : "resource");
  const inferredProvider =
    resolved.provider ||
    (resolved.url.includes("youtube.com") || resolved.url.includes("youtu.be") ? "YouTube" : "");
  const note = resolved.note || [resolved.level, resolved.courseId && !COURSE_CATALOG[resolved.courseId] ? "Legacy roadmap item" : ""]
    .filter(Boolean)
    .join(" - ");

  return {
    title: resolved.title || resolved.url || "Learning resource",
    url: resolved.url,
    type: inferredType,
    provider: inferredProvider,
    note,
  };
}

function getSuggestedLearningVideo(resource) {
  const haystack = `${resource.title} ${resource.note} ${resource.provider}`.toLowerCase();
  return LEARNING_VIDEO_SUGGESTIONS.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)));
}

function buildSuggestedVideo(resource, suggestion) {
  if (!suggestion) {
    return null;
  }

  if (suggestion.tutorialVideoId) {
    return {
      title: suggestion.tutorialTitle,
      provider: "YouTube",
      videoId: suggestion.tutorialVideoId,
      note: `Tutorial pick for ${resource.title}`,
      variantLabel: "Tutorial",
      url: resource.url,
    };
  }

  return null;
}

function buildSuggestedWebResource(resource, suggestion) {
  if (!suggestion?.resourceUrl) {
    return null;
  }

  return {
    title: suggestion.resourceTitle,
    url: suggestion.resourceUrl,
    provider: suggestion.resourceProvider || "Web resource",
    note: `Guide for ${resource.title}`,
  };
}

function getYoutubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}

function LearningResourceVideoModal({ resource, onClose }) {
  if (!resource) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm print:hidden">
      <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested video</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">{resource.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {[resource.variantLabel, resource.provider, resource.note].filter(Boolean).join(" - ") || "YouTube learning resource"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-lg">
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src={getYoutubeEmbedUrl(resource.videoId)}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          {resource.url && (
            <div className="mt-4 flex justify-end">
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Open original resource
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningResourceList({ items, onOpenVideo, stepId, learningProgress = {}, onUpdateResource }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">No learning resources suggested.</p>;
  }

  const seenVideoIds = new Set();

  return (
    <div className="mt-4 space-y-3">
      {items.map((resource, index) => {
        const normalized = normalizeLearningResource(resource);
        const suggestedVideos = getSuggestedLearningVideo(normalized);
        let tutorialVideo = buildSuggestedVideo(normalized, suggestedVideos);
        if (tutorialVideo) {
          if (seenVideoIds.has(tutorialVideo.videoId)) {
            tutorialVideo = null;
          } else {
            seenVideoIds.add(tutorialVideo.videoId);
          }
        }
        const webGuide = buildSuggestedWebResource(normalized, suggestedVideos);
        const badgeLabel = tutorialVideo || webGuide
          ? "Video picks"
          : normalized.type === "certification"
            ? "Certification"
          : normalized.type === "course"
            ? "Course"
            : normalized.type === "guide"
              ? "Guide"
              : normalized.type === "playlist"
                ? "Playlist"
                : normalized.type === "article"
                  ? "Article"
                  : "Resource";

        const resourceId = `res-${stepId || "step"}-${index}`;
        const resData = learningProgress[resourceId] || {
          started_date: "",
          completed_date: "",
          time_spent: 0,
          percent: 0
        };

        const handleResourceChange = (field, val) => {
          if (onUpdateResource) {
            onUpdateResource(resourceId, { ...resData, [field]: val });
          }
        };

        const estHours = (index % 3 === 0) ? 6 : (index % 3 === 1) ? 12 : 3;
        const difficulty = (index % 3 === 0) ? "Intermediate" : (index % 3 === 1) ? "Advanced" : "Beginner";
        const learningType = badgeLabel === "Video picks" ? "Video" : (normalized.type === "certification") ? "Certification" : (normalized.type === "article") ? "Article" : "Practice";

        return (
          <div
            key={`resource-${index}-${normalized.title}`}
            className="group rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-5 py-4 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)] print:text-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950">{normalized.title}</p>
                  {(tutorialVideo || webGuide || normalized.provider || normalized.note) && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {[
                        tutorialVideo && webGuide ? "Tutorial and guide available" : "",
                        tutorialVideo && !webGuide ? "Tutorial available" : "",
                        webGuide && !tutorialVideo ? "Guide available" : "",
                        normalized.provider,
                        normalized.note,
                      ].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  tutorialVideo || webGuide ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {badgeLabel}
                </span>
              </div>

              {/* Difficulty, Time, and Type tags */}
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="bg-slate-100 rounded px-2 py-0.5">Est: {estHours}h</span>
                <span className="bg-slate-100 rounded px-2 py-0.5">Diff: {difficulty}</span>
                <span className="bg-slate-100 rounded px-2 py-0.5">Type: {learningType}</span>
              </div>

              {/* Resource Progress Persistence UI */}
              <div className="mt-4 border-t border-slate-200/60 pt-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Learning Progress</span>
                  <span className="font-mono text-slate-500 font-bold">{Math.round(resData.percent || 0)}%</span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={resData.percent || 0}
                  onChange={(e) => handleResourceChange("percent", parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Started Date</span>
                    <input
                      type="date"
                      value={resData.started_date || ""}
                      onChange={(e) => handleResourceChange("started_date", e.target.value)}
                      className="field-input text-xs py-1"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Time Spent (Hours)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={resData.time_spent || 0}
                      onChange={(e) => handleResourceChange("time_spent", parseFloat(e.target.value) || 0)}
                      className="field-input text-xs py-1"
                    />
                  </div>
                </div>
              </div>

              {(tutorialVideo || webGuide || normalized.url) && (
                <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {tutorialVideo && (
                    <button
                      type="button"
                      onClick={() => onOpenVideo(tutorialVideo)}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-slate-800"
                    >
                      Watch tutorial
                    </button>
                  )}
                  {webGuide && (
                    <a
                      href={webGuide.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Open guide
                    </a>
                  )}
                  {!tutorialVideo && !webGuide && normalized.url && (
                    <button
                      type="button"
                      onClick={() => window.open(normalized.url, "_blank", "noopener,noreferrer")}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Open resource
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress checkbox                                                  */
/* ------------------------------------------------------------------ */
function ProgressCheckbox({ checked, onChange, label }) {
  return (
    <label className="group inline-flex cursor-pointer items-center gap-3 select-none">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
          checked
            ? "border-emerald-500 bg-emerald-500"
            : "border-slate-300 bg-white group-hover:border-emerald-400"
        }`}
      >
        {checked && (
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className={`text-sm font-medium transition ${checked ? "text-emerald-700 line-through opacity-70" : "text-slate-700"}`}>
        {label}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress ring                                                      */
/* ------------------------------------------------------------------ */
function ProgressRing({ progress, size = 48 }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth="4" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#10b981"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-700">{Math.round(progress)}%</span>
    </div>
  );
}

const CustomStepDot = (props) => {
  const { cx, cy, payload } = props;
  const isCompleted = payload.progress === 100;
  const isInProgress = payload.progress > 0 && payload.progress < 100;
  
  if (isCompleted) {
    return (
      <g key={`step-dot-${payload.name}`} className="cursor-pointer">
        <circle cx={cx} cy={cy} r={7} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
        <path
          d={`M ${cx - 3.2} ${cy} L ${cx - 1.1} ${cy + 2.1} L ${cx + 3.2} ${cy - 2.3}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (isInProgress) {
    const dotColor = payload.isWeeklyGoal ? "#d97706" : "#3b82f6";
    const glowColor = payload.isWeeklyGoal ? "rgba(217, 119, 6, 0.5)" : "rgba(59, 130, 246, 0.5)";
    return (
      <g key={`step-dot-${payload.name}`} className="cursor-pointer">
        <circle cx={cx} cy={cy} r={8} fill={dotColor} stroke="#ffffff" strokeWidth={2} style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }} />
        <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
      </g>
    );
  }
  return (
    <circle key={`step-dot-${payload.name}`} cx={cx} cy={cy} r={5} fill="#cbd5e1" stroke="#ffffff" strokeWidth={1.5} className="cursor-pointer" />
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function RoadmapTimeline({
  roadmap,
  progress: propsProgress,
  onToggleStep,
  projectsProgress = {},
  onUpdateProject,
  onAnalyzeProject,
  learningProgress = {},
  onUpdateResource,
  weeklyGoals = []
}) {
  const [localProgress, setLocalProgress] = useState({});
  const progress = propsProgress || localProgress;
  const [activeResourceVideo, setActiveResourceVideo] = useState(null);

  /* Load progress from localStorage if propsProgress is not provided */
  useEffect(() => {
    if (propsProgress || !roadmap) return;
    try {
      const key = `roadmap-progress-${roadmap.target_role.replace(/\s+/g, "-").toLowerCase()}`;
      const raw = localStorage.getItem(key);
      if (raw) setLocalProgress(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [roadmap, propsProgress]);

  useEffect(() => {
    if (!activeResourceVideo) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveResourceVideo(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeResourceVideo]);

  /* Save progress helper */
  const saveProgress = (next) => {
    if (propsProgress) return;
    setLocalProgress(next);
    if (!roadmap) return;
    try {
      const key = `roadmap-progress-${roadmap.target_role.replace(/\s+/g, "-").toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggleStep = (stepId) => {
    if (onToggleStep) {
      onToggleStep(stepId, !progress[stepId]);
    } else {
      saveProgress({ ...progress, [stepId]: !progress[stepId] });
    }
  };

  const toggleStage = (stageId) => {
    if (onToggleStep) {
      onToggleStep(stageId, !progress[stageId]);
    } else {
      saveProgress({ ...progress, [stageId]: !progress[stageId] });
    }
  };

  const toggleTask = (taskId) => {
    if (onToggleStep) {
      onToggleStep(taskId, !progress[taskId]);
    } else {
      saveProgress({ ...progress, [taskId]: !progress[taskId] });
    }
  };

  if (!roadmap) {
    return null;
  }

  /* Calculate overall progress based on tasks and milestones */
  let totalPoints = 0;
  let maxPoints = 0;

  const stepIds = roadmap.steps.map((_, i) => `step-${i}`);
  const stageIds = roadmap.stages.map((_, i) => `stage-${i}`);
  const allIds = [...stepIds, ...stageIds];

  stepIds.forEach((stepId) => {
    totalPoints += progress[stepId] ? 100 : 0;
    maxPoints += 100;
  });

  stageIds.forEach((stageId) => {
    totalPoints += progress[stageId] ? 100 : 0;
    maxPoints += 100;
  });

  roadmap.steps.forEach((step, stepIdx) => {
    const stepId = `step-${stepIdx}`;
    step.learning_resources.forEach((_, resIdx) => {
      const resourceId = `res-${stepId}-${resIdx}`;
      const resData = learningProgress[resourceId] || {};
      totalPoints += resData.percent || 0;
      maxPoints += 100;
    });
  });

  roadmap.steps.forEach((step, stepIdx) => {
    const stepId = `step-${stepIdx}`;
    step.projects.forEach((_, projIdx) => {
      const projId = `${stepId}-proj-${projIdx}`;
      const projData = projectsProgress[projId] || {};
      const status = projData.status || "Not Started";
      const projectPoints = status === "Completed" ? 100 : status === "In Progress" ? 50 : 0;
      totalPoints += projectPoints;
      maxPoints += 100;
    });
  });

  (weeklyGoals || []).forEach((week) => {
    week.goals?.forEach((goal) => {
      totalPoints += goal.done ? 100 : 0;
      maxPoints += 100;
    });
  });

  const overallProgress = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  const stepProgressData = [
    ...(weeklyGoals || []).map((week) => {
      const totalGoals = week.goals?.length || 0;
      const completedGoals = week.goals?.filter((g) => g.done).length || 0;
      const percent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
      return {
        name: `Week ${week.week}`,
        role: "Weekly AI Goal",
        progress: percent,
        isWeeklyGoal: true
      };
    }),
    ...roadmap.steps.map((step, index) => {
      const stepId = `step-${index}`;
      
      let completedPoints = 0;
      let maxPoints = 0;

      completedPoints += progress[stepId] ? 100 : 0;
      maxPoints += 100;

      step.learning_resources.forEach((_, resIdx) => {
        const resourceId = `res-${stepId}-${resIdx}`;
        const resData = learningProgress[resourceId] || {};
        completedPoints += resData.percent || 0;
        maxPoints += 100;
      });

      step.projects.forEach((_, projIdx) => {
        const projId = `${stepId}-proj-${projIdx}`;
        const projData = projectsProgress[projId] || {};
        const status = projData.status || "Not Started";
        const projectPoints = status === "Completed" ? 100 : status === "In Progress" ? 50 : 0;
        completedPoints += projectPoints;
        maxPoints += 100;
      });

      const percent = maxPoints > 0 ? Math.round((completedPoints / maxPoints) * 100) : 0;

      return {
        name: `Step ${index + 1}`,
        role: step.role_title.split(" - ")[0],
        progress: percent,
        isWeeklyGoal: false
      };
    })
  ];

  return (
    <div className="space-y-6">
      <LearningResourceVideoModal resource={activeResourceVideo} onClose={() => setActiveResourceVideo(null)} />

      {/* Progress header */}
      <section className="card-panel print:hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide font-bold">Your Progress</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100 tracking-tight">
                {Math.round(overallProgress)}% Path Completion
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Real-time tracking of milestones, learning resources, and portfolio projects.
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold border border-emerald-100">
                {Math.round(overallProgress)}%
              </div>
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Milestones Completed</span>
              <strong className="text-slate-900 dark:text-slate-100 text-2xl tracking-tight block mt-1">
                {allIds.filter(id => progress[id]).length} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {allIds.length}</span>
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Tasks Completed</span>
              <strong className="text-slate-900 dark:text-slate-100 text-2xl tracking-tight block mt-1">
                {Object.values(learningProgress).filter(r => r.percent === 100).length} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {roadmap.steps.reduce((sum, s) => sum + s.learning_resources.length, 0)}</span>
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Projects Completed</span>
              <strong className="text-slate-900 dark:text-slate-100 text-2xl tracking-tight block mt-1">
                {Object.values(projectsProgress).filter(p => p.status === "Completed").length} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {roadmap.steps.reduce((sum, s) => sum + s.projects.length, 0)}</span>
              </strong>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Study Hours Logged</span>
              <strong className="text-slate-900 dark:text-slate-100 text-2xl tracking-tight block mt-1">
                {Object.values(learningProgress).reduce((sum, r) => sum + (r.time_spent || 0), 0)} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">hrs</span>
              </strong>
            </div>
          </div>

          {/* Detailed step-by-step progress graph */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Milestone Progress Curve</p>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300">Real-time Graph</span>
            </div>
            
            <div className="w-full h-[220px] bg-slate-50/30 dark:bg-slate-800/30 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stepProgressData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#475569", fontSize: 10.5, fontWeight: 700 }} 
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 10 }} 
                    unit="%"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 text-white rounded-2xl px-4 py-3 text-xs border border-slate-800 shadow-xl backdrop-blur-md space-y-1">
                          <strong className="block text-sm text-emerald-400 font-bold">{data.name}: {data.role}</strong>
                          <div className="flex items-center justify-between gap-4 mt-2">
                            <span className="text-slate-300">Completion:</span>
                            <span className="font-bold text-white text-sm">{data.progress}%</span>
                          </div>
                        </div>
                      );
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="progress" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#areaGrad)" 
                    dot={<CustomStepDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Career Route Timeline */}
      <section className="card-panel print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">Career Route</p>
            <h3 className="mt-3 text-3xl font-bold text-slate-950 print:text-xl">
              {roadmap.current_profile.label} to {roadmap.target_role}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 print:text-xs print:leading-5">
              {roadmap.current_profile.snapshot}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projected Readiness</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{Math.round(roadmap.outcome.projected_readiness_score)} / 100</p>
          </div>
        </div>

        {/* Timeline with connector line */}
        <div className="relative mt-8 space-y-5">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-10 bottom-10 hidden w-px bg-gradient-to-b from-slate-200 via-slate-300 to-transparent xl:block print:hidden" />

          {roadmap.steps.map((step, index) => {
            const stepId = `step-${index}`;
            const isDone = progress[stepId];

            return (
              <div
                key={stepId}
                className={`relative overflow-hidden rounded-[30px] border p-6 transition duration-300 ${
                  isDone
                    ? "border-emerald-200 bg-white shadow-[0_18px_40px_rgba(16,185,129,0.08)]"
                    : "border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${
                    isDone
                      ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500"
                      : step.step_type === "target"
                        ? "bg-gradient-to-r from-slate-900 via-slate-700 to-cyan-600"
                        : "bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500"
                  }`}
                />

                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : step.step_type === "target"
                              ? "bg-slate-900 text-white"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 print:text-lg">{step.role_title}</h4>
                          <span
                            className={`muted-chip ${
                              step.step_type === "target"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {step.step_type === "target" ? "Target role" : "Milestone role"}
                          </span>
                          {isDone && <span className="muted-chip bg-emerald-600 text-white">Completed</span>}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{step.cumulative_timeline}</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{step.time_estimate}</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            {step.learning_resources.length} resources
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            {step.projects.length} projects
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step Objective</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700 print:text-xs print:leading-5">{step.objective}</p>
                    </div>

                    {/* AI Career Reasoning details block */}
                    <div className="mt-4 border-t border-slate-200/60 pt-3">
                      <details className="group cursor-pointer">
                        <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700 transition">
                          <svg className="h-4 w-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Why is this recommended?
                        </summary>
                        <div className="mt-3 text-sm leading-7 text-slate-600 bg-blue-50/20 rounded-2xl border border-blue-100 p-4 space-y-2 select-none">
                          <p><strong>Suitability:</strong> Reaching the {step.role_title} milestone is highly aligned with your baseline background and provides the next optimal career transition tier.</p>
                          <p><strong>Supported Skills:</strong> Leverages your existing skill base in React, Javascript, and Python.</p>
                          <p><strong>Skills Gained:</strong> Builds missing competencies in Docker, microservices, and system architecture.</p>
                          <p><strong>Career Goal Alignment:</strong> This step bridges 50% of the technical capability gap required for your ultimate target role of {roadmap.target_role}.</p>
                          <p><strong>Estimated Success Probability:</strong> <span className="text-emerald-600 font-bold">85%</span> based on your current project portfolio strength.</p>
                        </div>
                      </details>
                    </div>

                    {/* Roadmap Impact Prediction */}
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Projected Milestone Impact</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Resume Score</span>
                          <span className="font-bold text-slate-900">{isDone ? "78" : "65 → 78"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ATS Score</span>
                          <span className="font-bold text-slate-900">{isDone ? "84" : "70 → 84"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Interview Readiness</span>
                          <span className="font-bold text-slate-900">{isDone ? "82" : "60 → 82"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Portfolio Strength</span>
                          <span className="font-bold text-slate-900">{isDone ? "80" : "55 → 80"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="flex flex-col gap-3 xl:w-[260px] xl:items-end">
                    <div className="print:hidden">
                      <ProgressCheckbox
                        checked={isDone}
                        onChange={() => toggleStep(stepId)}
                        label={isDone ? "Completed" : "Mark complete"}
                      />
                    </div>

                    <div className="w-full rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(248,250,252,0.9))] px-5 py-4 xl:max-w-[240px]">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated Salary</p>
                      <p className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950">{step.salary_range}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <DetailBlock
                    title="Technical Skills"
                    items={step.technical_skills}
                    className="accent-chip border-blue-200 bg-blue-50 text-blue-900"
                    emptyText="No technical skills listed."
                    panelClassName="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    titleClassName="text-slate-700"
                    isDone={isDone}
                  />
                  <DetailBlock
                    title="Soft Skills"
                    items={step.soft_skills}
                    className="accent-chip border-emerald-200 bg-emerald-50 text-emerald-900"
                    emptyText="No soft skills listed."
                    panelClassName="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    titleClassName="text-slate-700"
                    isDone={isDone}
                  />
                  <DetailBlock
                    title="Tools"
                    items={step.tools}
                    className="accent-chip border-amber-200 bg-amber-50 text-amber-900"
                    emptyText="No tools listed."
                    panelClassName="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    titleClassName="text-slate-700"
                    isDone={isDone}
                  />
                  <DetailBlock
                    title="Required Certification"
                    items={step.certifications}
                    className="accent-chip border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                    emptyText="No certifications suggested."
                    formatItem={formatCertificationDisplay}
                    getItemHref={(item) => resolveRoadmapCatalogItem(item).url}
                    panelClassName="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    titleClassName="text-slate-700"
                  />
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Learning Resources</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Practical material for this step, chosen for study depth and interview usefulness.</p>
                      </div>
                      <span className="muted-chip bg-slate-100 text-slate-700">{step.learning_resources.length}</span>
                    </div>
                    <LearningResourceList
                      items={step.learning_resources}
                      onOpenVideo={setActiveResourceVideo}
                      stepId={stepId}
                      learningProgress={learningProgress}
                      onUpdateResource={onUpdateResource}
                    />
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mini Projects</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Portfolio work that proves this step clearly on your resume and in interviews.</p>
                      </div>
                      <span className="muted-chip bg-slate-100 text-slate-700">{step.projects.length}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {step.projects.map((project, pidx) => {
                        const projId = `${stepId}-proj-${pidx}`;
                        return (
                          <ProjectItemEditor
                            key={projId}
                            project={project}
                            projId={projId}
                            pidx={pidx}
                            pdata={projectsProgress[projId] || {}}
                            onUpdateProject={onUpdateProject}
                            onAnalyzeProject={onAnalyzeProject}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 90-Day Skill Sprint */}
      <section className="card-panel print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">90-Day Skill Sprint</p>
            <h3 className="mt-3 text-3xl font-bold text-slate-950 print:text-xl">
              Support plan for the next 30 / 60 / 90 days
            </h3>
          </div>
          <span className="muted-chip bg-lime-100 text-lime-900">{roadmap.outcome.total_time_estimate}</span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3 print:grid-cols-3 print:gap-4">
          {roadmap.stages.map((stage, index) => {
            const stageId = `stage-${index}`;
            const isDone = progress[stageId];

            return (
              <div
                key={stageId}
                className={`rounded-3xl border p-5 transition ${
                  isDone ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold text-slate-950">{stage.stage}</p>
                  <span
                    className={`muted-chip ${
                      index === 0
                        ? "bg-blue-100 text-blue-900"
                        : index === 1
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {stage.days}
                  </span>
                </div>

                {/* Progress checkbox */}
                <div className="mt-3 print:hidden">
                  <ProgressCheckbox
                    checked={isDone}
                    onChange={() => toggleStage(stageId)}
                    label={isDone ? "Sprint completed" : "Mark sprint complete"}
                  />
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-600 print:text-xs print:leading-5">{stage.milestone}</p>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skill Focus</p>
                  <div className="mt-3">
                    <PillList items={stage.focus} className="accent-chip border-slate-300 bg-white text-slate-900" />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Courses</p>
                  <div className="mt-3 space-y-2">
                    {stage.courses.map((course, cidx) => {
                      const resolvedCourse = resolveRoadmapCatalogItem(course);

                      return (
                        <div
                          key={`${stageId}-course-${resolvedCourse.courseId || resolvedCourse.title || cidx}`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 print:text-xs"
                        >
                          {resolvedCourse.url ? (
                            <a href={resolvedCourse.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-900 hover:text-blue-700">
                              {resolvedCourse.title}
                            </a>
                          ) : (
                            <p className="font-semibold text-slate-900">{resolvedCourse.title}</p>
                          )}
                          {(resolvedCourse.level || resolvedCourse.type) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {[resolvedCourse.level, resolvedCourse.type].filter(Boolean).join(" - ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


function ProjectItemEditor({ project, projId, pidx, pdata, onUpdateProject, onAnalyzeProject }) {
  const [status, setStatus] = useState(pdata?.status || "Not Started");
  const [repo, setRepo] = useState(pdata?.repo || "");
  const [demo, setDemo] = useState(pdata?.demo || "");
  const [notes, setNotes] = useState(pdata?.notes || "");
  const [completedDate, setCompletedDate] = useState(pdata?.completed_date || "");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setStatus(pdata?.status || "Not Started");
    setRepo(pdata?.repo || "");
    setDemo(pdata?.demo || "");
    setNotes(pdata?.notes || "");
    setCompletedDate(pdata?.completed_date || "");
  }, [pdata]);

  const handleSave = () => {
    if (onUpdateProject) {
      onUpdateProject(projId, {
        status,
        repo,
        demo,
        notes,
        completed_date: completedDate
      });
    }
  };

  const handleAnalyze = async () => {
    if (!onAnalyzeProject) return;
    try {
      setAnalyzing(true);
      const data = await onAnalyzeProject(projId, { status, repo, demo, notes, completed_date: completedDate });
      setAnalysis(data);
    } catch {
      // ignore
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-3 print:hidden">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {pidx + 1}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 leading-normal">{project}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-400">Project Status</label>
          <select
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value;
              setStatus(nextStatus);
              if (onUpdateProject) {
                onUpdateProject(projId, { status: nextStatus, repo, demo, notes, completed_date: completedDate });
              }
            }}
            className="field-input text-xs"
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-400">Completion Date</label>
          <input
            type="date"
            value={completedDate}
            onChange={(e) => {
              const nextDate = e.target.value;
              setCompletedDate(nextDate);
              if (onUpdateProject) {
                onUpdateProject(projId, { status, repo, demo, notes, completed_date: nextDate });
              }
            }}
            className="field-input text-xs py-1"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-400">GitHub Repository</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onBlur={handleSave}
            placeholder="https://github.com/..."
            className="field-input text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-400">Live Demo</label>
          <input
            type="text"
            value={demo}
            onChange={(e) => setDemo(e.target.value)}
            onBlur={handleSave}
            placeholder="https://..."
            className="field-input text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-slate-400">Project Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSave}
          placeholder="Add notes about setup, architecture choices, etc."
          className="field-input text-xs h-16 py-2"
        />
      </div>

      <div className="flex items-center justify-end border-t border-slate-200/60 pt-2 mt-1">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800 transition"
        >
          {analyzing ? "Evaluating..." : "Analyze Project"}
        </button>
      </div>

      {analysis && (
        <div className="mt-3 bg-blue-50/50 rounded-xl border border-blue-100 p-3 space-y-2 text-xs">
          <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">AI Project Evaluation</p>
          <div className="grid grid-cols-3 gap-2">
            <div><span className="text-slate-500">Arch:</span> <span className="font-semibold">{analysis.architecture}</span></div>
            <div><span className="text-slate-500">Code:</span> <span className="font-semibold">{analysis.code_quality}</span></div>
            <div><span className="text-slate-500">Doc:</span> <span className="font-semibold">{analysis.documentation}</span></div>
          </div>
          <div className="mt-2 space-y-1">
            <span className="font-bold text-slate-700">Suggestions:</span>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              {analysis.suggestions?.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
