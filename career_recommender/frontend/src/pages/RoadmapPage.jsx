import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import RoadmapTimeline from "../components/RoadmapTimeline";
import ScrollToTopButton from "../components/ScrollToTopButton";
import { correctRoleSpelling } from "../utils/opportunityMode";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
function buildAbsoluteMediaUrl(path) {
  if (!path) {
    return "";
  }
  return /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildRecordingEntry(recording) {
  return {
    id: recording.id,
    url: buildAbsoluteMediaUrl(recording.file_url),
    contentType: recording.content_type || "audio/webm",
    originalFilename: recording.original_filename,
    fileSize: recording.file_size || 0,
    questionText: recording.question_text,
    status: "saved",
    error: "",
  };
}

function revokeRecordingUrl(recording) {
  if (recording?.url && recording.url.startsWith("blob:")) {
    URL.revokeObjectURL(recording.url);
  }
}

function formatRecordingStatus(recording) {
  if (!recording) {
    return "";
  }
  if (recording.status === "uploading") {
    return "Saving your recording...";
  }
  if (recording.status === "deleting") {
    return "Removing saved recording...";
  }
  if (recording.status === "error") {
    return recording.error || "Saving failed. You can still play the local preview.";
  }
  return "Saved to your interview practice library.";
}

function RecordingPlayback({ recording, onDeleteRecording, compact = false }) {
  if (!recording) {
    return null;
  }

  const isBusy = recording.status === "uploading" || recording.status === "deleting";
  const statusTone =
    recording.status === "error"
      ? "text-rose-600"
      : recording.status === "saved"
        ? "text-emerald-700"
        : "text-slate-500";

  return (
    <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${statusTone}`}>{formatRecordingStatus(recording)}</p>
        <button
          type="button"
          onClick={onDeleteRecording}
          disabled={isBusy}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {recording.status === "saved" ? "Delete saved audio" : "Discard preview"}
        </button>
      </div>
      <audio controls className="w-full">
        <source src={recording.url} type={recording.contentType || "audio/webm"} />
      </audio>
    </div>
  );
}

import { SkeletonCard, SkeletonTimeline } from "../components/skeletons/PageSkeleton";

function EmptyState({ onCreateProfile }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] px-6 py-16 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-50">
        <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
          />
        </svg>
      </div>
      <h3 className="mt-6 text-3xl font-bold tracking-[-0.03em] text-slate-950">Create your profile first</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
        To generate a personalized career roadmap, we need to know your skills, experience level, and target role.
        Set up your profile and we will build a step-by-step path for you.
      </p>
      <button onClick={onCreateProfile} className="primary-button mt-8">
        Go to Profile
      </button>
    </div>
  );
}

function SummaryCard({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: {
      panel: "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] text-slate-900",
      eyebrow: "text-slate-500",
      metric: "text-slate-950",
      detail: "text-slate-600",
      accent: "bg-slate-400",
    },
    blue: {
      panel: "border-blue-200 bg-[linear-gradient(180deg,#ffffff,#eff6ff)] text-slate-900",
      eyebrow: "text-blue-700",
      metric: "text-slate-950",
      detail: "text-slate-600",
      accent: "bg-blue-500",
    },
    emerald: {
      panel: "border-emerald-200 bg-[linear-gradient(180deg,#ffffff,#ecfdf5)] text-slate-900",
      eyebrow: "text-emerald-700",
      metric: "text-slate-950",
      detail: "text-slate-600",
      accent: "bg-emerald-500",
    },
    amber: {
      panel: "border-amber-200 bg-[linear-gradient(180deg,#ffffff,#fff7ed)] text-slate-900",
      eyebrow: "text-amber-700",
      metric: "text-slate-950",
      detail: "text-slate-600",
      accent: "bg-amber-500",
    },
  };
  const selected = tones[tone] || tones.slate;

  return (
    <article className={`overflow-hidden rounded-[24px] border p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] ${selected.panel}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${selected.eyebrow}`}>{label}</p>
      <p className={`mt-3 text-[2.2rem] font-bold tracking-[-0.05em] ${selected.metric}`}>{value}</p>
      {detail && <p className={`mt-2 text-sm leading-6 capitalize ${selected.detail}`}>{detail}</p>}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-[54%] rounded-full ${selected.accent}`} />
      </div>
    </article>
  );
}

function ActionBar({ onPrint, onCopy, onExport }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onPrint}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
          />
        </svg>
        Print PDF
      </button>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
          />
        </svg>
        {copied ? "Copied!" : "Copy Summary"}
      </button>
      {onExport && (
        <button
          onClick={() => onExport("markdown")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50"
        >
          Export MD
        </button>
      )}
    </div>
  );
}

function RecommendedProjectsSection({ projects, targetRole }) {
  const [completed, setCompleted] = useState({});
  const [customProjects, setCustomProjects] = useState([]);
  const [newProject, setNewProject] = useState("");

  const storageKey = `roadmap-projects-${(targetRole || "default").replace(/\s+/g, "-").toLowerCase()}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCompleted(parsed.completed || {});
        setCustomProjects(parsed.custom || []);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const save = (nextCompleted, nextCustom) => {
    setCompleted(nextCompleted);
    setCustomProjects(nextCustom);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ completed: nextCompleted, custom: nextCustom }));
    } catch {
      /* ignore quota errors */
    }
  };

  const toggle = (id) => {
    save({ ...completed, [id]: !completed[id] }, customProjects);
  };

  const addCustom = (event) => {
    event.preventDefault();
    if (!newProject.trim()) {
      return;
    }
    const id = `custom-${Date.now()}`;
    save(completed, [...customProjects, { id, text: newProject.trim() }]);
    setNewProject("");
  };

  const removeCustom = (id) => {
    save(completed, customProjects.filter((project) => project.id !== id));
  };

  const allProjects = projects.map((text, index) => ({ id: `proj-${index}`, text, builtIn: true }));
  const all = [...allProjects, ...customProjects];
  const doneCount = all.filter((project) => completed[project.id]).length;
  const progress = all.length ? Math.round((doneCount / all.length) * 100) : 0;

  return (
    <section className="card-panel print:border-0 print:shadow-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-coral">Recommended Projects</p>
          <p className="mt-1 text-sm text-slate-500">
            {doneCount} of {all.length} completed | {progress}% done
          </p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 print:hidden">
          <div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
        {all.map((project) => {
          const isDone = completed[project.id];
          return (
            <div
              key={project.id}
              className={`group relative rounded-3xl border p-5 transition ${
                isDone ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <label className="absolute right-4 top-4 cursor-pointer print:hidden">
                <input type="checkbox" className="sr-only" checked={isDone} onChange={() => toggle(project.id)} />
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition ${
                    isDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white group-hover:border-emerald-400"
                  }`}
                >
                  {isDone && (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </label>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isDone ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>

              <p className={`mt-3 text-sm leading-7 ${isDone ? "text-emerald-800 line-through opacity-70" : "text-slate-700"}`}>
                {project.text}
              </p>

              {!project.builtIn && (
                <button
                  onClick={() => removeCustom(project.id)}
                  className="absolute bottom-4 right-4 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 print:hidden"
                  title="Remove project"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {project.builtIn && (
                <span className="absolute bottom-4 right-4 text-xs font-medium text-slate-400">AI Suggested</span>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={addCustom} className="mt-5 flex gap-3 print:hidden">
        <input
          type="text"
          value={newProject}
          onChange={(event) => setNewProject(event.target.value)}
          placeholder="Add your own project idea..."
          className="field-input flex-1"
        />
        <button type="submit" className="secondary-button">
          Add Project
        </button>
      </form>
    </section>
  );
}

const TECHNICAL_FOCUS_AREAS = [
  "Project depth",
  "Trade-offs",
  "System design",
  "Debugging",
  "Metrics",
  "Scalability",
  "Execution",
  "Ownership",
];

const HR_FOCUS_AREAS = [
  "Motivation",
  "Pressure handling",
  "Self-awareness",
  "Role fit",
  "Collaboration",
  "Growth mindset",
  "Communication",
  "Career intent",
];

const TECHNICAL_CUES = [
  "Start with project context and your responsibility.",
  "Explain the technical decision, then one trade-off.",
  "End with impact, metric, or what changed after your work.",
];

const HR_CUES = [
  "Keep the story tight and specific to one situation.",
  "Show what you did, not what the team did in general.",
  "Close with reflection so it sounds thoughtful, not scripted.",
];

const TECHNICAL_RUBRICS = [
  { label: "Clarity", tip: "Explain the problem and your role in one clean setup." },
  { label: "Depth", tip: "Show the technical reasoning, not just the final answer." },
  { label: "Trade-offs", tip: "Mention one choice you made and what it cost or saved." },
  { label: "Impact", tip: "Close with outcome, metric, lesson, or improvement." },
];

const HR_RUBRICS = [
  { label: "Story", tip: "Use one real example instead of a general statement." },
  { label: "Ownership", tip: "Focus on what you specifically did." },
  { label: "Reflection", tip: "Explain what you learned or changed afterward." },
  { label: "Fit", tip: "Connect the story back to the role you want." },
];

const ANSWER_RATING_LABELS = {
  1: "Needs full rewrite",
  2: "Weak answer",
  3: "Usable but uneven",
  4: "Strong answer",
  5: "Interview ready",
};

function formatTimer(seconds) {
  const safe = Math.max(0, seconds);
  const mins = String(Math.floor(safe / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildPracticeSummary(type, note, rating, practiced) {
  const cleanNote = String(note || "").trim();
  const noteWords = cleanNote ? cleanNote.split(/\s+/).length : 0;
  const answerType = type === "technical" ? "technical explanation" : "behavioral story";

  if (!cleanNote) {
    return practiced
      ? `You marked this as practiced, but it still needs a clearer ${answerType} outline.`
      : `No notes yet. Add a concise ${answerType} with actions, trade-offs, and outcomes before your next mock round.`;
  }

  const coverage =
    noteWords >= 45 ? "detailed" :
    noteWords >= 18 ? "developing" :
    "light";

  const confidence =
    rating >= 4 ? "high confidence" :
    rating === 3 ? "moderate confidence" :
    rating > 0 ? "low confidence" :
    "unrated confidence";

  const nextMove =
    rating >= 4
      ? "Keep tightening delivery, measurable impact, and closing reflection."
      : "Strengthen the structure, sharper examples, and the final outcome statement.";

  return `Your ${answerType} looks ${coverage} with ${confidence}. ${nextMove}`;
}

function MockInterviewFocusOverlay({
  prompt,
  targetRole,
  timerSeconds,
  timerDuration,
  timerRunning,
  onToggleTimer,
  onResetTimer,
  onTimerPreset,
  note,
  onNoteChange,
  rating,
  onRatingChange,
  practiced,
  onTogglePracticed,
  recorderSupported,
  recordingKey,
  onStartRecording,
  onStopRecording,
  recording,
  onDeleteRecording,
  speechSupported,
  onReadAloud,
  onStopReadAloud,
  speakingKey,
  onClose,
}) {
  if (!prompt) {
    return null;
  }

  const promptKey = `${prompt.type}-${prompt.index}`;
  const summary = buildPracticeSummary(prompt.type, note, rating, practiced);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm print:hidden">
      <div className="relative w-full max-w-5xl rounded-[32px] overflow-hidden border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.3)]">
        <div className="max-h-[90vh] w-full overflow-y-auto">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-night p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-200">Focus Mode</p>
              <h3 className="mt-3 text-3xl font-bold capitalize">{targetRole}</h3>
              <p className="mt-2 text-sm font-semibold text-blue-100">
                {prompt.type === "technical" ? "Technical question" : "HR question"} {prompt.index + 1}
              </p>
              <p className="mt-4 text-base leading-8 text-slate-100">{prompt.question}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mock timer</p>
                  <p className="mt-3 text-5xl font-bold tracking-tight text-slate-950">{formatTimer(timerSeconds)}</p>
                  <p className="mt-2 text-sm text-slate-500">Current round: {Math.round(timerDuration / 60)} minutes</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${timerRunning ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
                  {timerRunning ? "Running" : "Paused"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[120, 300, 600].map((seconds) => (
                  <button
                    key={`focus-preset-${seconds}`}
                    type="button"
                    onClick={() => onTimerPreset(seconds)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      timerDuration === seconds ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                    }`}
                  >
                    {seconds / 60} min
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleTimer}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {timerRunning ? "Pause timer" : "Start timer"}
                </button>
                <button
                  type="button"
                  onClick={onResetTimer}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Self-rating</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={rating || 3}
                  onChange={(event) => onRatingChange(Number(event.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="min-w-[120px] rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-slate-200">
                  <p className="text-2xl font-bold text-slate-950">{rating || 3}/5</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {ANSWER_RATING_LABELS[rating || 3]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onTogglePracticed}
                className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  practiced ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {practiced ? "Practiced" : "Mark as practiced"}
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Voice practice</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() =>
                      speakingKey === promptKey ? onStopReadAloud() : onReadAloud(prompt.type, prompt.index, prompt.question)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    {speakingKey === promptKey ? "Stop voice" : "Read question aloud"}
                  </button>
                )}
                {recorderSupported && (
                  <button
                    type="button"
                    onClick={() =>
                      recordingKey === promptKey ? onStopRecording() : onStartRecording(prompt.type, prompt.index)
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      recordingKey === promptKey ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {recordingKey === promptKey ? "Stop recording" : "Record answer"}
                  </button>
                )}
              </div>
              {!recorderSupported && (
                <p className="mt-3 text-sm text-slate-500">Voice recording is not available in this browser.</p>
              )}
              <RecordingPlayback recording={recording} onDeleteRecording={onDeleteRecording} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <label htmlFor={`focus-note-${promptKey}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Your answer notes
              </label>
              <textarea
                id={`focus-note-${promptKey}`}
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Write your opening line, key example, metric, and closing reflection..."
                className="field-input mt-3 min-h-56 resize-y"
              />
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Auto summary</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{summary}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function InterviewQuestionColumn({
  type,
  eyebrow,
  title,
  description,
  icon,
  iconClassName,
  chipClassName,
  panelClassName,
  itemClassName,
  numberClassName,
  questionItems,
  focusAreas,
  frameworkTitle,
  frameworkSteps,
  rubricItems,
  expandedMap,
  practicedMap,
  notesMap,
  ratingsMap,
  recordingsMap,
  onToggleExpand,
  onTogglePracticed,
  onStartMock,
  onUpdateNote,
  onUpdateRating,
  onReadAloud,
  onStopReadAloud,
  onStartRecording,
  onStopRecording,
  speechSupported,
  recorderSupported,
  speakingKey,
  recordingKey,
  onDeleteRecording,
}) {
  const answerCues = type === "technical" ? TECHNICAL_CUES : HR_CUES;

  return (
    <div className={`card-panel flex flex-col overflow-hidden print:border-0 print:shadow-none print:p-0 ${panelClassName}`}>
      <div className="flex h-full flex-col rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>{icon}</div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">{title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${chipClassName}`}>
            {questionItems.length} prompts
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-800/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{frameworkTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {frameworkSteps.map((step) => (
              <span key={step} className="accent-chip border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-300">
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {questionItems.length ? questionItems.map(({ question, index, displayIndex }) => {
            const promptKey = `${type}-${index}`;
            const isExpanded = Boolean(expandedMap[promptKey]);
            const isPracticed = Boolean(practicedMap[promptKey]);
            const ratingValue = ratingsMap[promptKey] || 3;
            const noteValue = notesMap[promptKey] || "";
            const noteWordCount = noteValue.trim() ? noteValue.trim().split(/\s+/).length : 0;
            const recording = recordingsMap[promptKey];
            const isSpeaking = speakingKey === promptKey;
            const isRecording = recordingKey === promptKey;
            const summary = buildPracticeSummary(type, noteValue, ratingValue, isPracticed);

            return (
              <div key={`${title}-${index}`} className={`rounded-2xl border dark:border-slate-800 p-4 transition hover:shadow-sm ${itemClassName} ${isExpanded ? "ring-1 ring-slate-200 dark:ring-slate-700" : ""}`}>
                <button
                  type="button"
                  onClick={() => onToggleExpand(type, index)}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${numberClassName}`}>
                    {String(displayIndex).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {focusAreas[index] || "Interview focus"}
                      </span>
                      {isPracticed && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900">
                          Practiced
                        </span>
                      )}
                      {ratingsMap[promptKey] && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                          Rated {ratingsMap[promptKey]}/5
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-7 text-slate-800 dark:text-slate-200">{question}</p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700">
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-5">
                    <div className="space-y-5">
                      <div className="rounded-[26px] border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/60 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-slate-900/50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Answer blueprint</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                              Use this structure to keep the answer tight, credible, and easy to follow.
                            </p>
                          </div>
                          <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isPracticed ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
                            {isPracticed ? "Practiced" : "In progress"}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {answerCues.map((cue, i) => (
                            <div
                              key={`${type}-${index}-${cue}`}
                              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm shadow-slate-100/70 dark:shadow-none"
                            >
                              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${numberClassName}`}>
                                {i + 1}
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{cue}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                        <div className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Scorecard</p>
                              <p className="mt-2 text-sm leading-6 text-slate-200">
                                Rate the draft, then check whether it covers the signals interviewers look for.
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold tracking-tight">{ratingValue}<span className="text-base text-slate-400">/5</span></p>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">{ANSWER_RATING_LABELS[ratingValue]}</p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="1"
                              value={ratingValue}
                              onChange={(event) => onUpdateRating(type, index, Number(event.target.value))}
                              className="w-full accent-amber-300"
                            />
                            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                              <span>Needs work</span>
                              <span>Interview ready</span>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2">
                            {rubricItems.map((item) => (
                              <div key={`${type}-${index}-${item.label}`} className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${type === "technical" ? "bg-sky-300" : "bg-emerald-300"}`} />
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{item.label}</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-200">{item.tip}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Practice deck</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                Run a mock, listen back, and keep this answer crisp before you move to the next prompt.
                              </p>
                            </div>
                            {isRecording && (
                              <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                                Recording live
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => onTogglePracticed(type, index)}
                              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                isPracticed
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                              }`}
                            >
                              {isPracticed ? "Practiced" : "Mark as practiced"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onStartMock(type, index, question)}
                              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              Start mock round
                            </button>
                            {speechSupported && (
                              <button
                                type="button"
                                onClick={() => (isSpeaking ? onStopReadAloud() : onReadAloud(type, index, question))}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                              >
                                {isSpeaking ? "Stop read aloud" : "Read aloud"}
                              </button>
                            )}
                            {recorderSupported && (
                              <button
                                type="button"
                                onClick={() => (isRecording ? onStopRecording() : onStartRecording(type, index))}
                                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                  isRecording
                                    ? "bg-rose-600 text-white hover:bg-rose-500"
                                    : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {isRecording ? "Stop recording" : "Record answer"}
                              </button>
                            )}
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Voice recording</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              Save one take here so you can compare your pacing and clarity.
                            </p>

                            {recording ? (
                              <RecordingPlayback
                                recording={recording}
                                onDeleteRecording={() => onDeleteRecording(promptKey)}
                                compact
                              />
                            ) : (
                              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                                No saved take yet. Use the recording control when you want to rehearse out loud.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <label htmlFor={`${type}-note-${index}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Response workspace
                            </label>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Capture the story, metrics, trade-offs, and the closing line you want to rehearse.
                            </p>
                          </div>
                          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {noteWordCount ? `${noteWordCount} words` : "No notes yet"}
                          </div>
                        </div>

                        <textarea
                          id={`${type}-note-${index}`}
                          value={noteValue}
                          onChange={(event) => onUpdateNote(type, index, event.target.value)}
                          placeholder="Write your answer points, examples, and metrics here..."
                          rows={6}
                          className="field-input mt-4 min-h-[180px] resize-y border-slate-200 bg-slate-50/60 leading-6"
                        />

                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Auto summary</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{summary}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Focus</p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">{focusAreas[index] || "Interview focus"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Readiness</p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">{ANSWER_RATING_LABELS[ratingValue]}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500">
              No questions match the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function InterviewResourcesPanel({
  interviewPack,
  targetRole,
  activePrompt,
  practicedCount,
  totalQuestions,
  timerDuration,
  timerSeconds,
  timerRunning,
  onTimerPreset,
  onToggleTimer,
  onResetTimer,
  onClearPrompt,
  onReadActivePrompt,
  onStopReadAloud,
  speechSupported,
  speakingKey,
  hasNotes,
  onRandomPrompt,
  onExportNotes,
  currentFilterLabel,
}) {
  return (
    <div className="card-panel flex flex-col overflow-hidden border-slate-200 bg-gradient-to-b from-amber-50 via-white to-white print:border-0 print:shadow-none print:p-0">
      <div className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm h-full">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Preparation Resources</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 capitalize">{targetRole || interviewPack.job_role}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Use this panel as your fast revision stack before mock interviews, HR rounds, and technical screening calls.
              </p>
            </div>
          </div>
          <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] bg-amber-100 text-amber-900">
            {interviewPack.coding_practice_links.length} links
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRandomPrompt}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Random mock prompt
          </button>
          <button
            type="button"
            onClick={onExportNotes}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Export notes
          </button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            Filter: {currentFilterLabel}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mock interview timer</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{formatTimer(timerSeconds)}</p>
                <p className="mt-1 text-sm text-slate-500">Current round: {Math.round(timerDuration / 60)} min</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${timerRunning ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
                {timerRunning ? "Running" : "Paused"}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[120, 300, 600].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => onTimerPreset(seconds)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    timerDuration === seconds ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  {seconds / 60} min
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleTimer}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {timerRunning ? "Pause timer" : "Start timer"}
              </button>
              <button
                type="button"
                onClick={onResetTimer}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Practice progress</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">{practicedCount}</p>
                <p className="mt-1 text-sm text-slate-500">of {totalQuestions} questions practiced</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                {totalQuestions ? Math.round((practicedCount / totalQuestions) * 100) : 0}% complete
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${totalQuestions ? (practicedCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active mock prompt</p>
              <p className="mt-1 text-sm font-semibold text-amber-700">
                {activePrompt ? `${activePrompt.type === "technical" ? "Technical" : "HR"} question ${activePrompt.index + 1}` : "No prompt selected yet"}
              </p>
            </div>
            {activePrompt && (
              <button
                type="button"
                onClick={onClearPrompt}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm leading-6 text-slate-700">
              {activePrompt ? activePrompt.question : "Open any question card and choose \"Start mock round\" to pin a prompt here while you practice."}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {speechSupported && activePrompt && (
              <button
                type="button"
                onClick={() =>
                  speakingKey === `${activePrompt.type}-${activePrompt.index}` ? onStopReadAloud() : onReadActivePrompt()
                }
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {speakingKey === `${activePrompt.type}-${activePrompt.index}` ? "⏹ Stop voice" : "🔊 Read active prompt"}
              </button>
            )}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              {hasNotes ? "📝 Notes saved" : "No notes saved yet"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {interviewPack.preparation_tips.map((tip, index) => (
            <div key={`prep-tip-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-700">
                {index + 1}
              </div>
              <p className="text-sm leading-5 text-slate-700">{tip}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Practice links</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {interviewPack.coding_practice_links.map((link, index) => {
              const host = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
              return (
                <a
                  key={`practice-link-${index}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50"
                >
                  <span>{host}</span>
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5H19.5M19.5 4.5V10.5M19.5 4.5L10.5 13.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5H5.625A1.875 1.875 0 003.75 9.375v9A1.875 1.875 0 005.625 20.25h9A1.875 1.875 0 0016.5 18.375V17.25" />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Technical answer style</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              Lead with context, explain the technical decision, call out one trade-off, and finish with the result.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">HR answer style</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              Use STAR, keep the story tight, and end with reflection so the answer sounds thoughtful.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterviewPrepSection({ interviewPack, targetRole }) {
  const resolvedTargetRole = targetRole || interviewPack.job_role || "default";
  const storageKey = `interview-prep-${resolvedTargetRole.replace(/\s+/g, "-").toLowerCase()}`;
  const totalQuestions = interviewPack.technical_questions.length + interviewPack.hr_questions.length;
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const recordingTargetRef = useRef(null);
  const [expandedMap, setExpandedMap] = useState({
    "technical-0": true,
    "hr-0": true,
  });
  const [practicedMap, setPracticedMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [ratingsMap, setRatingsMap] = useState({});
  const [recordingsMap, setRecordingsMap] = useState({});
  const [activePrompt, setActivePrompt] = useState(null);
  const [timerDuration, setTimerDuration] = useState(300);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [interviewFilter, setInterviewFilter] = useState("all");
  const [speakingKey, setSpeakingKey] = useState("");
  const [recordingKey, setRecordingKey] = useState("");
  const [mockFocusOpen, setMockFocusOpen] = useState(false);
  const recordingsRef = useRef({});

  // Practice Analytics States
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const { data } = await client.get("/roadmap/analytics");
      setAnalytics(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [resolvedTargetRole]);

  useEffect(() => {
    recordingsRef.current = recordingsMap;
  }, [recordingsMap]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setExpandedMap({ "technical-0": true, "hr-0": true });
        setPracticedMap({});
        setNotesMap({});
        setRatingsMap({});
        setActivePrompt(null);
        setTimerDuration(300);
        setTimerSeconds(300);
        setTimerRunning(false);
        setInterviewFilter("all");
        setSpeakingKey("");
        setRecordingKey("");
        setMockFocusOpen(false);
        return;
      }
      const parsed = JSON.parse(raw);
      setExpandedMap(parsed.expandedMap || { "technical-0": true, "hr-0": true });
      setPracticedMap(parsed.practicedMap || {});
      setNotesMap(parsed.notesMap || {});
      setRatingsMap(parsed.ratingsMap || {});
      setActivePrompt(parsed.activePrompt || null);
      setTimerDuration(parsed.timerDuration || 300);
      setTimerSeconds(parsed.timerSeconds || parsed.timerDuration || 300);
      setTimerRunning(false);
      setInterviewFilter("all");
      setSpeakingKey("");
      setRecordingKey("");
      setMockFocusOpen(false);
    } catch {
      setExpandedMap({ "technical-0": true, "hr-0": true });
      setPracticedMap({});
      setNotesMap({});
      setRatingsMap({});
      setActivePrompt(null);
      setTimerDuration(300);
      setTimerSeconds(300);
      setTimerRunning(false);
      setInterviewFilter("all");
      setSpeakingKey("");
      setRecordingKey("");
      setMockFocusOpen(false);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          expandedMap,
          practicedMap,
          notesMap,
          ratingsMap,
          activePrompt,
          timerDuration,
          timerSeconds,
        })
      );
    } catch {
      /* ignore */
    }
  }, [activePrompt, expandedMap, notesMap, practicedMap, ratingsMap, storageKey, timerDuration, timerSeconds]);

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(recordingsRef.current).forEach((recording) => revokeRecordingUrl(recording));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSavedRecordings = async () => {
      try {
        const { data } = await client.get("/interview/recordings", {
          params: { target_role: resolvedTargetRole },
        });
        if (cancelled) {
          return;
        }

        const nextRecordings = (data.recordings || []).reduce((accumulator, recording) => {
          accumulator[recording.question_key] = buildRecordingEntry(recording);
          return accumulator;
        }, {});

        setRecordingsMap((current) => {
          Object.values(current).forEach((recording) => revokeRecordingUrl(recording));
          return nextRecordings;
        });
      } catch {
        if (!cancelled) {
          setRecordingsMap((current) => current);
        }
      }
    };

    loadSavedRecordings();

    return () => {
      cancelled = true;
    };
  }, [resolvedTargetRole]);

  const toggleExpand = (type, index) => {
    const key = `${type}-${index}`;
    setExpandedMap((current) => ({ ...current, [key]: !current[key] }));
  };

  const togglePracticed = async (type, index) => {
    const key = `${type}-${index}`;
    const nextVal = !practicedMap[key];
    setPracticedMap((current) => ({ ...current, [key]: nextVal }));

    if (nextVal) {
      try {
        const ratingVal = ratingsMap[key] || 4;
        await client.post("/roadmap/save-practice", {
          technical_score: type === "technical" ? ratingVal * 20 : 0,
          hr_score: type === "hr" ? ratingVal * 20 : 0,
          confidence_score: 85,
          response_time: 12.5,
          questions_count: 1,
          correct_count: ratingVal >= 3 ? 1 : 0
        });
        fetchAnalytics();
      } catch {}
    }
  };

  const updateNote = (type, index, value) => {
    const key = `${type}-${index}`;
    setNotesMap((current) => ({ ...current, [key]: value }));
  };

  const updateRating = async (type, index, value) => {
    const key = `${type}-${index}`;
    setRatingsMap((current) => ({ ...current, [key]: value }));

    try {
      await client.post("/roadmap/save-practice", {
        technical_score: type === "technical" ? value * 20 : 0,
        hr_score: type === "hr" ? value * 20 : 0,
        confidence_score: 85,
        response_time: 12.5,
        questions_count: 1,
        correct_count: value >= 3 ? 1 : 0
      });
      fetchAnalytics();
    } catch {}
  };

  const startMock = (type, index, question) => {
    const duration = type === "technical" ? 420 : 240;
    setActivePrompt({ type, index, question });
    setExpandedMap((current) => ({ ...current, [`${type}-${index}`]: true }));
    setTimerDuration(duration);
    setTimerSeconds(duration);
    setTimerRunning(false);
    setMockFocusOpen(true);
  };

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const recorderSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const stopReadAloud = () => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setSpeakingKey("");
  };

  const readAloud = (type, index, question) => {
    if (!speechSupported) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingKey("");
    utterance.onerror = () => setSpeakingKey("");
    setSpeakingKey(`${type}-${index}`);
    window.speechSynthesis.speak(utterance);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteRecording = async (key) => {
    const currentRecording = recordingsRef.current[key];
    if (!currentRecording) {
      return;
    }

    if (!currentRecording.id) {
      setRecordingsMap((current) => {
        const next = { ...current };
        revokeRecordingUrl(next[key]);
        delete next[key];
        return next;
      });
      return;
    }

    setRecordingsMap((current) => ({
      ...current,
      [key]: {
        ...current[key],
        status: "deleting",
        error: "",
      },
    }));

    try {
      await client.delete(`/interview/recordings/${currentRecording.id}`);
      setRecordingsMap((current) => {
        const next = { ...current };
        revokeRecordingUrl(next[key]);
        delete next[key];
        return next;
      });
    } catch (error) {
      const detail = error?.response?.data?.detail || "Could not delete this recording right now.";
      setRecordingsMap((current) => ({
        ...current,
        [key]: {
          ...current[key],
          status: "error",
          error: detail,
        },
      }));
    }
  };

  const uploadRecording = async ({ key, type, index, question, blob }) => {
    const previewUrl = URL.createObjectURL(blob);

    setRecordingsMap((current) => {
      const next = { ...current };
      revokeRecordingUrl(next[key]);
      next[key] = {
        ...(current[key] || {}),
        url: previewUrl,
        contentType: blob.type || "audio/webm",
        questionText: question,
        status: "uploading",
        error: "",
      };
      return next;
    });

    try {
      const extension = blob.type === "audio/mp4" ? "m4a" : "webm";
      const file = new File([blob], `${key}.${extension}`, { type: blob.type || "audio/webm" });
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("target_role", resolvedTargetRole);
      formData.append("question_key", key);
      formData.append("question_type", type);
      formData.append("question_index", String(index));
      formData.append("question_text", question);

      const { data } = await client.post("/interview/recordings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRecordingsMap((current) => {
        const next = { ...current };
        revokeRecordingUrl(next[key]);
        next[key] = buildRecordingEntry(data);
        return next;
      });
    } catch (error) {
      const detail = error?.response?.data?.detail || "Saving failed. You can still play the local preview.";
      setRecordingsMap((current) => ({
        ...current,
        [key]: {
          ...(current[key] || {}),
          url: previewUrl,
          contentType: blob.type || "audio/webm",
          questionText: question,
          status: "error",
          error: detail,
        },
      }));
    }
  };

  const startRecording = async (type, index) => {
    if (!recorderSupported) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const key = `${type}-${index}`;
      const questionList = type === "technical" ? interviewPack.technical_questions : interviewPack.hr_questions;
      const question = questionList[index] || "";
      recordingTargetRef.current = key;
      mediaChunksRef.current = [];

      const recorder = new MediaRecorder(mediaStreamRef.current);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const targetKey = recordingTargetRef.current;
        if (targetKey && mediaChunksRef.current.length) {
          const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          uploadRecording({ key: targetKey, type, index, question, blob });
        }
        mediaChunksRef.current = [];
        recordingTargetRef.current = null;
        setRecordingKey("");
      };
      recorder.start();
      setRecordingKey(key);
    } catch {
      setRecordingKey("");
    }
  };

  const practicedCount = Object.values(practicedMap).filter(Boolean).length;
  const hasNotes = Object.values(notesMap).some((note) => String(note || "").trim());

  const buildQuestionItems = (questions, type) =>
    questions
      .map((question, index) => ({ question, index, displayIndex: index + 1, type }))
      .filter((item) => {
        if (interviewFilter === "technical") {
          return type === "technical";
        }
        if (interviewFilter === "hr") {
          return type === "hr";
        }
        if (interviewFilter === "unpracticed") {
          return !practicedMap[`${type}-${item.index}`];
        }
        return true;
      });

  const technicalItems = buildQuestionItems(interviewPack.technical_questions, "technical");
  const hrItems = buildQuestionItems(interviewPack.hr_questions, "hr");
  const visiblePromptPool = [...technicalItems, ...hrItems];
  const fullPromptPool = [
    ...interviewPack.technical_questions.map((question, index) => ({ question, index, displayIndex: index + 1, type: "technical" })),
    ...interviewPack.hr_questions.map((question, index) => ({ question, index, displayIndex: index + 1, type: "hr" })),
  ];

  const exportNotes = () => {
    const noteEntries = Object.entries(notesMap).filter(([, note]) => String(note || "").trim());
    if (!noteEntries.length) {
      return;
    }

    const questionsByType = {
      technical: interviewPack.technical_questions,
      hr: interviewPack.hr_questions,
    };

    const content = [
      `Interview Notes - ${targetRole || interviewPack.job_role}`,
      "",
      ...noteEntries.flatMap(([key, note]) => {
        const [type, rawIndex] = key.split("-");
        const index = Number(rawIndex);
        const question = questionsByType[type]?.[index] || "Question unavailable";
        const rating = ratingsMap[key] || 0;
        const summary = buildPracticeSummary(type, note, rating, practicedMap[key]);
        return [
          `${type === "technical" ? "Technical" : "HR"} Question ${index + 1}`,
          question,
          `Rating: ${rating ? `${rating}/5 - ${ANSWER_RATING_LABELS[rating]}` : "Not rated yet"}`,
          `Summary: ${summary}`,
          "",
          String(note).trim(),
          "",
          "-----",
          "",
        ];
      }),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(targetRole || interviewPack.job_role || "interview-notes").replace(/\s+/g, "-").toLowerCase()}-notes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chooseRandomPrompt = () => {
    const pool = visiblePromptPool.length ? visiblePromptPool : fullPromptPool;
    if (!pool.length) {
      return;
    }
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    startMock(randomItem.type, randomItem.index, randomItem.question);
  };

  const filterLabelMap = {
    all: "All prompts",
    unpracticed: "Unpracticed",
    technical: "Technical only",
    hr: "HR only",
  };

  const activePromptKey = activePrompt ? `${activePrompt.type}-${activePrompt.index}` : "";

  return (
    <section className="space-y-6 print:space-y-4">
      {/* PRACTICE ANALYTICS PANEL */}
      <div className="card-panel overflow-hidden border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] print:hidden text-slate-800">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-600">Practice Analytics Dashboard</p>
        <h3 className="mt-3 text-2xl font-bold text-slate-950">Your Rehearsal Performance</h3>
        
        <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Technical Score</span>
            <span className="block mt-2 text-2xl font-bold text-slate-900">{analytics?.technical_score ? `${Math.round(analytics.technical_score)}%` : "0%"}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">HR Score</span>
            <span className="block mt-2 text-2xl font-bold text-slate-900">{analytics?.hr_score ? `${Math.round(analytics.hr_score)}%` : "0%"}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Confidence Level</span>
            <span className="block mt-2 text-2xl font-bold text-slate-900">{analytics?.confidence_score ? `${Math.round(analytics.confidence_score)}%` : "0%"}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs text-slate-500 uppercase font-semibold">Avg Response Time</span>
            <span className="block mt-2 text-2xl font-bold text-slate-900">{analytics?.response_time ? `${analytics.response_time.toFixed(1)}s` : "0.0s"}</span>
          </div>
        </div>

        {/* Practice History chart */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Practice History Trend</p>
          <div className="h-32 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200">
            {analytics?.history?.length > 0 ? (
              analytics.history.map((session, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-8 bg-blue-500 hover:bg-blue-600 rounded-t transition-all duration-300" style={{ height: `${Math.max(10, session.technical_score || session.hr_score || 50)}%` }} />
                  <span className="text-[9px] text-slate-400 font-mono">Session {idx + 1}</span>
                </div>
              ))
            ) : (
              [60, 68, 75, 82, 88].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-8 bg-slate-300/80 rounded-t" style={{ height: `${val}%` }} />
                  <span className="text-[9px] text-slate-400 font-mono">Mock {idx + 1}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card-panel overflow-hidden border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-night text-white print:border-0 print:shadow-none print:p-0">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.42),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.28),transparent_24%)] p-6">
          <div className="rounded-[30px] border border-white/10 bg-black/10 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-200">Interview Prep Board</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl capitalize">{targetRole || interviewPack.job_role}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-100">
                A cleaner prep experience for technical and HR rounds. Review the likely prompts, rehearse with a structure,
                and use the resource stack on the right before applying or scheduling mocks.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Technical</p>
                <p className="mt-2 text-2xl font-bold">{interviewPack.technical_questions.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">HR</p>
                <p className="mt-2 text-2xl font-bold">{interviewPack.hr_questions.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Resources</p>
                <p className="mt-2 text-2xl font-bold">{interviewPack.coding_practice_links.length}</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {[
          { id: "all", label: "All prompts" },
          { id: "unpracticed", label: "Unpracticed" },
          { id: "technical", label: "Technical only" },
          { id: "hr", label: "HR only" },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setInterviewFilter(option.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              interviewFilter === option.id
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <InterviewQuestionColumn
          eyebrow="Technical Questions"
          title="Prove how you build and think"
          description="These prompts are strongest when you answer with concrete project evidence, design choices, and debugging judgment."
          iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          chipClassName="bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300"
          panelClassName="bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-900/50 dark:via-slate-900/50 dark:to-slate-900/50"
          itemClassName="border-blue-100 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          numberClassName="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
          questionItems={technicalItems}
          focusAreas={TECHNICAL_FOCUS_AREAS}
          frameworkTitle="Best answer structure"
          frameworkSteps={["Problem", "Approach", "Trade-off", "Impact"]}
          rubricItems={TECHNICAL_RUBRICS}
          type="technical"
          expandedMap={expandedMap}
          practicedMap={practicedMap}
          notesMap={notesMap}
          ratingsMap={ratingsMap}
          recordingsMap={recordingsMap}
          onToggleExpand={toggleExpand}
          onTogglePracticed={togglePracticed}
          onStartMock={startMock}
          onUpdateNote={updateNote}
          onUpdateRating={updateRating}
          onReadAloud={readAloud}
          onStopReadAloud={stopReadAloud}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          speechSupported={speechSupported}
          recorderSupported={recorderSupported}
          speakingKey={speakingKey}
          recordingKey={recordingKey}
          onDeleteRecording={deleteRecording}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.621-.504-1.125-1.125-1.125H6.75A2.25 2.25 0 004.5 7.212v9.576a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V10.5m-5.25-4.413L19.5 10.5m0 0h-3.75m3.75 0V6.75" />
            </svg>
          }
        />

        <InterviewQuestionColumn
          eyebrow="HR Questions"
          title="Show maturity and role fit"
          description="These are better when they sound calm, specific, and reflective. Focus on motivation, collaboration, and how you learn."
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          chipClassName="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300"
          panelClassName="bg-gradient-to-b from-emerald-50 via-white to-white dark:from-slate-900/50 dark:via-slate-900/50 dark:to-slate-900/50"
          itemClassName="border-emerald-100 bg-white hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          numberClassName="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          questionItems={hrItems}
          focusAreas={HR_FOCUS_AREAS}
          frameworkTitle="Best answer structure"
          frameworkSteps={["Situation", "Action", "Result", "Reflection"]}
          rubricItems={HR_RUBRICS}
          type="hr"
          expandedMap={expandedMap}
          practicedMap={practicedMap}
          notesMap={notesMap}
          ratingsMap={ratingsMap}
          recordingsMap={recordingsMap}
          onToggleExpand={toggleExpand}
          onTogglePracticed={togglePracticed}
          onStartMock={startMock}
          onUpdateNote={updateNote}
          onUpdateRating={updateRating}
          onReadAloud={readAloud}
          onStopReadAloud={stopReadAloud}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          speechSupported={speechSupported}
          recorderSupported={recorderSupported}
          speakingKey={speakingKey}
          recordingKey={recordingKey}
          onDeleteRecording={deleteRecording}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.5 19.125a7.5 7.5 0 0115 0" />
            </svg>
          }
        />

        <InterviewResourcesPanel
          interviewPack={interviewPack}
          targetRole={targetRole}
          activePrompt={activePrompt}
          practicedCount={practicedCount}
          totalQuestions={totalQuestions}
          timerDuration={timerDuration}
          timerSeconds={timerSeconds}
          timerRunning={timerRunning}
          onTimerPreset={(seconds) => {
            setTimerDuration(seconds);
            setTimerSeconds(seconds);
            setTimerRunning(false);
          }}
          onToggleTimer={() => setTimerRunning((current) => !current)}
          onResetTimer={() => {
            setTimerSeconds(timerDuration);
            setTimerRunning(false);
          }}
          onClearPrompt={() => setActivePrompt(null)}
          onReadActivePrompt={() => activePrompt && readAloud(activePrompt.type, activePrompt.index, activePrompt.question)}
          onStopReadAloud={stopReadAloud}
          speechSupported={speechSupported}
          speakingKey={speakingKey}
          hasNotes={hasNotes}
          onRandomPrompt={chooseRandomPrompt}
          onExportNotes={exportNotes}
          currentFilterLabel={filterLabelMap[interviewFilter] || "All prompts"}
        />
      </div>

      {mockFocusOpen && activePrompt && (
        <MockInterviewFocusOverlay
          prompt={activePrompt}
          targetRole={targetRole || interviewPack.job_role}
          timerSeconds={timerSeconds}
          timerDuration={timerDuration}
          timerRunning={timerRunning}
          onToggleTimer={() => setTimerRunning((current) => !current)}
          onResetTimer={() => {
            setTimerSeconds(timerDuration);
            setTimerRunning(false);
          }}
          onTimerPreset={(seconds) => {
            setTimerDuration(seconds);
            setTimerSeconds(seconds);
            setTimerRunning(false);
          }}
          note={notesMap[activePromptKey] || ""}
          onNoteChange={(value) => updateNote(activePrompt.type, activePrompt.index, value)}
          rating={ratingsMap[activePromptKey] || 3}
          onRatingChange={(value) => updateRating(activePrompt.type, activePrompt.index, value)}
          practiced={Boolean(practicedMap[activePromptKey])}
          onTogglePracticed={() => togglePracticed(activePrompt.type, activePrompt.index)}
          recorderSupported={recorderSupported}
          recordingKey={recordingKey}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          recording={recordingsMap[activePromptKey]}
          onDeleteRecording={() => deleteRecording(activePromptKey)}
          speechSupported={speechSupported}
          onReadAloud={readAloud}
          onStopReadAloud={stopReadAloud}
          speakingKey={speakingKey}
          onClose={() => setMockFocusOpen(false)}
        />
      )}
    </section>
  );
}

export default function RoadmapPage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const [roadmap, setRoadmap] = useState(null);
  const [interviewPack, setInterviewPack] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Enhancement States
  const [progressData, setProgressData] = useState(null);
  const [mentorSuggestion, setMentorSuggestion] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [exporting, setExporting] = useState(false);

  const fetchProgress = async () => {
    try {
      const { data } = await client.get("/roadmap/progress");
      setProgressData(data);
    } catch {
      // ignore
    }
  };

  const fetchMentorSuggestion = async () => {
    try {
      const { data } = await client.get("/roadmap/mentor-suggestion");
      setMentorSuggestion(data);
    } catch {
      // ignore
    }
  };

  const fetchAchievements = async () => {
    try {
      const { data } = await client.get("/roadmap/achievements");
      setAchievements(data.badges || []);
    } catch {
      // ignore
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data } = await client.get("/roadmap/company-recommendations");
      setCompanies(data || []);
    } catch {
      // ignore
    }
  };

  const handleToggleMilestone = async (stepId, completed) => {
    try {
      const { data } = await client.post("/roadmap/update-milestone", { step_id: stepId, completed });
      setProgressData(data);
      fetchAchievements();
    } catch {
      // ignore
    }
  };

  const handleUpdateProject = async (projectId, projectPayload) => {
    try {
      const { data } = await client.post("/roadmap/update-project", {
        project_id: projectId,
        status: projectPayload.status,
        repo: projectPayload.repo,
        demo: projectPayload.demo,
        notes: projectPayload.notes,
        completed_date: projectPayload.completed_date
      });
      setProgressData(data);
      fetchAchievements();
    } catch {
      // ignore
    }
  };

  const handleUpdateResource = async (resourceId, resourcePayload) => {
    try {
      const { data } = await client.post("/roadmap/update-resource", {
        resource_id: resourceId,
        started_date: resourcePayload.started_date,
        completed_date: resourcePayload.completed_date,
        time_spent: resourcePayload.time_spent,
        percent: resourcePayload.percent
      });
      setProgressData(data);
      fetchAchievements();
    } catch {
      // ignore
    }
  };

  const handleAnalyzeProject = async (projectId, projectPayload) => {
    const { data } = await client.post("/roadmap/analyze-project", {
      project_id: projectId,
      status: projectPayload.status,
      repo: projectPayload.repo,
      demo: projectPayload.demo,
      notes: projectPayload.notes,
      completed_date: projectPayload.completed_date
    });
    return data;
  };

  const handleToggleWeeklyGoal = async (weekIdx, goalId) => {
    if (!progressData) return;
    const updatedWeeklyGoals = progressData.weekly_goals.map((w, wIdx) => {
      if (wIdx === weekIdx) {
        return {
          ...w,
          goals: w.goals.map(g => g.id === goalId ? { ...g, done: !g.done } : g)
        };
      }
      return w;
    });
    setProgressData({ ...progressData, weekly_goals: updatedWeeklyGoals });
    try {
      await client.post("/roadmap/update-weekly-goals", updatedWeeklyGoals);
    } catch {
      // ignore
    }
  };

  const handleExportRoadmap = async (format) => {
    try {
      setExporting(true);
      const { data } = await client.post("/roadmap/export", { format });
      const blob = new Blob([data.content], { type: format === "csv" ? "text/csv" : "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roadmap-export-${targetRole.replace(/\s+/g, "-").toLowerCase()}.${format === "checklist" ? "txt" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  const CACHE_KEY = "career_roadmap_cache";
  const CACHE_TTL_MS = 1000 * 60 * 30;

  const loadCachedRoadmap = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CACHE_TTL_MS) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const saveCachedRoadmap = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      /* ignore quota errors */
    }
  };

  const loadRoadmap = async (roleOverride = targetRole) => {
    try {
      setLoading(true);
      setMessage("");

      const normalizedRole = (roleOverride || "").trim();
      const params = normalizedRole ? { role: normalizedRole } : {};

      const roadmapResponse = await client.get("/roadmap/generate", { params });
      setRoadmap(roadmapResponse.data);
      saveCachedRoadmap(roadmapResponse.data);

      fetchProgress();
      fetchMentorSuggestion();
      fetchAchievements();
      fetchCompanies();

      try {
        const interviewResponse = await client.get("/interview/questions", { params });
        setInterviewPack(interviewResponse.data);
      } catch {
        setInterviewPack(null);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to generate roadmap.");
      setRoadmap(null);
      setInterviewPack(null);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      try {
        const { data } = await client.get("/profile/view");
        if (ignore) {
          return;
        }

        const role = data.desired_role || "";
        setTargetRole(role);
        setNeedsProfile(false);

        fetchProgress();
        fetchMentorSuggestion();
        fetchAchievements();
        fetchCompanies();

        const cached = loadCachedRoadmap();
        if (cached && !role) {
          setRoadmap(cached);
          setInitialLoading(false);
          loadRoadmap(role);
          return;
        }

        await loadRoadmap(role);
      } catch (error) {
        if (!ignore) {
          setInitialLoading(false);
          if (error.response?.status === 404) {
            setNeedsProfile(true);
          } else {
            setMessage(error.response?.data?.detail || "Unable to load profile context for roadmap.");
          }
        }
      }
    }

    bootstrap();
    return () => {
      ignore = true;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!roadmap) {
      return;
    }

    const text = [
      `Career Roadmap: ${roadmap.current_profile.label} -> ${roadmap.target_role}`,
      "",
      `Summary: ${roadmap.summary}`,
      "",
      `Total Time: ${roadmap.outcome.total_time_estimate}`,
      `Current Readiness: ${Math.round(roadmap.outcome.current_readiness_score)}/100`,
      `Projected Readiness: ${Math.round(roadmap.outcome.projected_readiness_score)}/100`,
      `Expected Salary: ${roadmap.outcome.expected_salary_range}`,
      "",
      "Steps:",
      ...roadmap.steps.map((step, index) => `${index + 1}. ${step.role_title} (${step.time_estimate}) - ${step.objective}`),
      "",
      "90-Day Sprint:",
      ...roadmap.stages.map((stage) => `${stage.stage} (${stage.days}): ${stage.milestone}`),
      "",
      "Recommended Projects:",
      ...roadmap.recommended_projects.map((project) => `- ${project}`),
    ].join("\n");

navigator.clipboard.writeText(text);
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="card-panel">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-12 w-full animate-pulse rounded bg-slate-200" />
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTimeline />
      </div>
    );
  }

if (needsProfile) {
    return (
      <div className="space-y-6">
        <EmptyState onCreateProfile={() => navigate("/profile")} />
      </div>
    );
  }

return (
    <div ref={pageRef} className="space-y-6 print:space-y-4">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)] print:border-0 print:shadow-none">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-4xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">Career Path Generator</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-950 print:text-2xl">
              A career route, not just a course list
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 print:text-xs print:leading-5">
              This view works like Google Maps for jobs: it starts from your current profile, suggests realistic stepping-stone roles,
              and shows the skills, tools, projects, time, and readiness needed to reach the target role.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 print:text-xs print:leading-5">
              Use it to decide what role bridge makes sense next, what proof to build, and how long the transition should realistically take.
            </p>
          </div>

          <div
            className="rounded-[28px] border border-slate-200 p-6 text-white shadow-[0_24px_55px_rgba(15,23,42,0.16)] print:hidden"
            style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 1), rgba(30, 41, 59, 0.94))" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Path controls</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const correctedRole = correctRoleSpelling(targetRole);
                setTargetRole(correctedRole);
                loadRoadmap(correctedRole);
              }}
              className="mt-4 grid gap-3"
            >
              <div>
                <label htmlFor="target-role" className="sr-only">
                  Target role
                </label>
                <input
                  id="target-role"
                  type="text"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  onBlur={(event) => setTargetRole(correctRoleSpelling(event.target.value))}
                  placeholder="Target role, e.g. Product Support Engineer"
                  className="field-input capitalize"
                  aria-label="Target role"
                />
              </div>
              <button type="submit" disabled={loading} className="primary-button border-white bg-white text-slate-950 hover:bg-slate-100">
                {loading ? "Generating path..." : "Generate path"}
              </button>
            </form>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
              <p>The roadmap adapts to the target role you enter here.</p>
              <p>Refresh when you want to compare a safer bridge role versus a direct target jump.</p>
            </div>
          </div>
        </div>

        {roadmap && <p className="mt-5 text-sm leading-7 text-slate-600 print:text-xs print:leading-5">{roadmap.summary}</p>}
        {message && <p className="mt-4 text-sm font-semibold text-slate-600">{message}</p>}
      </section>

      {roadmap && (
        <div className="flex items-center justify-between print:hidden">
          <ActionBar onPrint={handlePrint} onCopy={handleCopy} onExport={handleExportRoadmap} />
          <span className="text-xs text-slate-400">Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      )}

      {roadmap && (
        <section className="grid gap-4 xl:grid-cols-4 print:grid-cols-2">
          <SummaryCard label="Current Profile" value={roadmap.current_profile.label} detail={roadmap.current_profile.snapshot} tone="blue" />
          <SummaryCard
            label="Total Route Time"
            value={roadmap.outcome.total_time_estimate}
            detail={`Target role: ${roadmap.target_role}`}
            tone="amber"
          />
          <SummaryCard
            label="Projected Readiness"
            value={`${Math.round(roadmap.outcome.projected_readiness_score)} / 100`}
            detail={roadmap.outcome.readiness_label}
            tone="emerald"
          />
          <SummaryCard
            label="Target Salary"
            value={roadmap.outcome.expected_salary_range}
            detail={roadmap.outcome.salary_region}
            tone="slate"
          />
        </section>
      )}

      {roadmap && (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] print:block">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] print:border-0 print:shadow-none print:p-0">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-coral">Route Options</p>
            <div className="mt-4 space-y-3">
              {roadmap.route_options.map((option, index) => (
                <div key={`route-${index}`} className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-slate-950">{option.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="muted-chip bg-slate-900 text-white">{option.duration}</span>
                      {option.recommended && <span className="muted-chip bg-emerald-100 text-emerald-900">Recommended</span>}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{option.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] print:border-0 print:shadow-none print:p-0">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-600">End-State Outcome</p>
            <div className="mt-4 rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,1))] p-5">
              <p className="text-sm leading-7 text-slate-700">{roadmap.outcome.readiness_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {roadmap.outcome.final_skills.map((skill, index) => (
                  <span key={`final-skill-${index}`} className="accent-chip border-emerald-200 bg-white text-emerald-900">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Readiness</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{Math.round(roadmap.outcome.current_readiness_score)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Priority Gaps</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roadmap.current_profile.priority_gaps.map((skill, index) => (
                    <span key={`gap-${index}`} className="accent-chip border-rose-200 bg-rose-50 text-rose-900">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DAILY MENTOR & ACHIEVEMENTS */}
      {roadmap && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* Daily AI Mentor Card */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] flex flex-col justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-600">Daily AI Mentor Advice</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">Today's Guidance Suggestion</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600 italic">
                "{mentorSuggestion?.suggestion || "Maintain standard engineering practices and build your clean code portfolio milestones to impress hiring teams."}"
              </p>
            </div>
            <div className="mt-6 text-xs text-slate-400">
              Generated: {mentorSuggestion?.date || new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Achievements Card */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-600">Achievements & Badges</p>
            <h3 className="mt-3 text-xl font-bold text-slate-950">Your Unlocked Badges</h3>
            
            <div className="mt-4 flex flex-wrap gap-2.5">
              {achievements.length > 0 ? (
                achievements.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-100"
                  >
                    <svg className="h-3.5 w-3.5 text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a7 7 0 007-7V4H5v4a7 7 0 007 7zm0 0v4m-3 0h6m-9-6a3 3 0 01-3-3V5h3v2a3 3 0 003 3m6-5v2a3 3 0 003 3 3 3 0 003-3V5h-3z" />
                    </svg>
                    {badge}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">Unlock your first badge by completing milestones or projects!</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SMART NOTIFICATIONS & WEEKLY GOALS */}
      {roadmap && progressData && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* Weekly Goals */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-600">Weekly AI Goals</p>
            <h3 className="mt-3 text-xl font-bold text-slate-950">Week 1 & 2 Tasks</h3>
            
            <div className="mt-4 space-y-4">
              {progressData.weekly_goals?.map((week, wIdx) => (
                <div key={week.week} className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 border-b pb-1 mb-2">Week {week.week}</h4>
                  <div className="space-y-2">
                    {week.goals?.map((goal) => (
                      <label key={goal.id} className="flex items-start gap-2.5 cursor-pointer text-sm leading-6 text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={goal.done}
                          onChange={() => handleToggleWeeklyGoal(wIdx, goal.id)}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className={goal.done ? "line-through text-slate-400" : "text-slate-700"}>{goal.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Notifications & Alerts */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-500">Smart Notifications</p>
            <h3 className="mt-3 text-xl font-bold text-slate-950">Action Needed</h3>
            
            <div className="mt-4 space-y-3 text-sm">
              {progressData?.weekly_goals?.some(w => w.goals?.some(g => !g.done)) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span><strong>Weekly Goals:</strong> Some weekly task goals remain incomplete. Try to complete them this week.</span>
                </div>
              )}
              {Object.keys(progressData?.projects || {}).length === 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 flex items-start gap-3">
                  <svg className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Practice Projects:</strong> Start working on your mini projects to validate your skills.</span>
                </div>
              )}
              {(!progressData?.last_active_date || (Date.now() - new Date(progressData.last_active_date).getTime() > 1000 * 60 * 60 * 24 * 3)) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span><strong>Streak Overdue:</strong> No timeline activity recorded for 3 days. Complete a milestone to maintain your streak!</span>
                </div>
              )}
              {progressData?.completed_milestones?.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 flex items-start gap-3">
                  <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Success Tracker:</strong> You have unlocked progress towards matching hiring positions!</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* COMPANY READINESS RECOMMENDATIONS */}
      {roadmap && companies.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] print:hidden">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">Company Readiness Match</p>
          <h3 className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-100">Recommended Hiring Positions</h3>
          
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {companies.map((comp) => (
              <div key={comp.company_name} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-5 space-y-3">
                <div className="flex items-center justify-between border-b dark:border-slate-700 pb-2 mb-2">
                  <span className="font-bold text-xl text-slate-900 dark:text-slate-100">{comp.company_name}</span>
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-300 px-3 py-1.5 text-xs font-bold">
                    {comp.match_percentage}% Match
                  </span>
                </div>
                
                <div className="space-y-1.5 text-sm">
                  <div><span className="text-slate-500 dark:text-slate-400 font-semibold">Expected Salary:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{comp.expected_salary}</span></div>
                  <div><span className="text-slate-500 dark:text-slate-400 font-semibold">Hiring Trend:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{comp.hiring_trend}</span></div>
                  <div><span className="text-slate-500 dark:text-slate-400 font-semibold">Learning Priority:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{comp.learning_priority}</span></div>
                </div>

                <div className="space-y-3 border-t dark:border-slate-700 pt-3 mt-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Required Skills Met</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {comp.required_skills?.map(s => (
                        <span key={s} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-full px-2.5 py-1 text-xs font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Missing Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {comp.missing_skills?.map(s => (
                        <span key={s} className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 rounded-full px-2.5 py-1 text-xs font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <RoadmapTimeline
        roadmap={roadmap}
        progress={progressData?.completed_milestones ? Object.fromEntries(progressData.completed_milestones.map(m => [m, true])) : {}}
        onToggleStep={handleToggleMilestone}
        projectsProgress={progressData?.projects || {}}
        onUpdateProject={handleUpdateProject}
        onAnalyzeProject={handleAnalyzeProject}
        learningProgress={progressData?.learning_resources || {}}
        onUpdateResource={handleUpdateResource}
        weeklyGoals={progressData?.weekly_goals || []}
      />

      {roadmap && <RecommendedProjectsSection projects={roadmap.recommended_projects} targetRole={roadmap.target_role} />}

      {roadmap?.deployment_checklist?.length > 0 && (
        <section className="card-panel print:border-0 print:shadow-none print:p-0">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-600">Execution Checklist</p>
          <div className="mt-4 grid gap-3">
            {roadmap.deployment_checklist.map((step, index) => (
              <div key={`check-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-slate-700">
                <span className="mr-2 font-semibold text-amber-700">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </section>
      )}

      {interviewPack && <InterviewPrepSection interviewPack={interviewPack} targetRole={roadmap?.target_role || targetRole} />}
      
      <ScrollToTopButton />
    </div>
  );
}
