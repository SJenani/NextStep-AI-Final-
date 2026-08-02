import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { BookmarkSkeleton } from "../components/skeletons/PageSkeleton";
import TailorResumeModal from "../components/TailorResumeModal";

const statuses = [
  { value: "saved", label: "Saved", color: "slate" },
  { value: "applied", label: "Applied", color: "blue" },
  { value: "interview scheduled", label: "Interview", color: "violet" },
  { value: "rejected", label: "Rejected", color: "rose" },
  { value: "selected", label: "Selected", color: "emerald" },
];

const statusOrder = statuses.map((status) => status.value);

const statusStyles = {
  saved: "border-slate-200 bg-slate-50 text-slate-700",
  applied: "border-blue-200 bg-blue-50 text-blue-700",
  "interview scheduled": "border-violet-200 bg-violet-50 text-violet-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function getStatusMeta(value) {
  return statuses.find((status) => status.value === value) || statuses[0];
}

function formatScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function ProgressStat({ label, value, tone = "bg-blue-600" }) {
  const score = formatScore(value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className="text-sm font-extrabold text-slate-950">{score}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Icon({ name }) {
  const common = "h-4 w-4";
  const icons = {
    company: (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 21V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15" />
        <path d="M16 9h2a2 2 0 0 1 2 2v10" />
        <path d="M8 8h4M8 12h4M8 16h4M4 21h16" />
      </svg>
    ),
    location: (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2v4M16 2v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </svg>
    ),
    link: (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function MetaItem({ icon, children }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export default function BookmarkTrackerPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [tailoringJob, setTailoringJob] = useState(null);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/bookmark/list");
      setBookmarks(data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to load saved jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const stats = useMemo(() => {
    const total = bookmarks.length;
    const active = bookmarks.filter((bookmark) =>
      ["applied", "interview scheduled", "selected"].includes(bookmark.status)
    ).length;
    const averageScore = total
      ? Math.round(bookmarks.reduce((sum, item) => sum + Number(item.ai_score || 0), 0) / total)
      : 0;
    const bestMatch = bookmarks.reduce(
      (best, item) => (Number(item.ai_score || 0) > Number(best?.ai_score || -1) ? item : best),
      null
    );

    return { total, active, averageScore, bestMatch };
  }, [bookmarks]);

  const statusCounts = useMemo(() => {
    return bookmarks.reduce(
      (counts, bookmark) => {
        counts[bookmark.status] = (counts[bookmark.status] || 0) + 1;
        counts.all += 1;
        return counts;
      },
      { all: 0 }
    );
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    const visible =
      filter === "all" ? bookmarks : bookmarks.filter((bookmark) => bookmark.status === filter);

    return [...visible].sort((a, b) => {
      const statusDelta = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (statusDelta !== 0) return statusDelta;
      return Number(b.ai_score || 0) - Number(a.ai_score || 0);
    });
  }, [bookmarks, filter]);

  if (loading) {
    return <BookmarkSkeleton />;
  }

  const updateStatus = async (bookmarkId, status) => {
    setUpdatingId(bookmarkId);
    try {
      await client.post("/tracker/update-status", { bookmark_id: bookmarkId, status });
      setBookmarks((current) =>
        current.map((bookmark) =>
          bookmark.id === bookmarkId ? { ...bookmark, status } : bookmark
        )
      );
      setMessage("Tracker updated.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Unable to update tracker.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-tide">
              Application tracker
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950">
              Bookmark tracker
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Keep saved roles organized, compare fit, and move each application forward.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Saved" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Avg match" value={`${stats.averageScore}%`} />
          </div>
        </div>

        {stats.bestMatch && (
          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Strongest match: <span className="text-slate-950">{stats.bestMatch.job_title}</span>
            </p>
            <span className="text-sm font-extrabold text-blue-700">
              {formatScore(stats.bestMatch.ai_score)}%
            </span>
          </div>
        )}

        {message && (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
            {message}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              filter === "all"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            All <span className="ml-1 opacity-70">{statusCounts.all}</span>
          </button>
          {statuses.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => setFilter(status.value)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                filter === status.value
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {status.label}{" "}
              <span className="ml-1 opacity-70">{statusCounts[status.value] || 0}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredBookmarks.map((bookmark) => {
            const statusMeta = getStatusMeta(bookmark.status);
            const hasApplyLink = /^https?:/i.test(bookmark.apply_link || "");

            return (
              <article
                key={bookmark.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
              >
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="min-w-0 p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] ${statusStyles[bookmark.status] || statusStyles.saved}`}
                      >
                        {statusMeta.label}
                      </span>
                      {bookmark.is_potential_scam && (
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-rose-700">
                          Warning
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-extrabold leading-tight text-slate-950 md:text-3xl">
                      {bookmark.job_title}
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaItem icon={<Icon name="company" />}>
                        {bookmark.company_name || "Unknown company"}
                      </MetaItem>
                      <MetaItem icon={<Icon name="location" />}>
                        {bookmark.location || "Remote"}
                      </MetaItem>
                      <MetaItem icon={<Icon name="calendar" />}>
                        {bookmark.employment_type || "Role type not specified"}
                      </MetaItem>
                      <MetaItem icon={<Icon name="calendar" />}>
                        {bookmark.posted_date ? `Posted ${bookmark.posted_date}` : "Date unavailable"}
                      </MetaItem>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0">
                    <div className="grid gap-4">
                      <ProgressStat label="AI match" value={bookmark.ai_score} tone="bg-blue-600" />
                      <ProgressStat
                        label="Readiness"
                        value={bookmark.readiness_score}
                        tone="bg-teal-600"
                      />

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-1">
                        <label className="sr-only" htmlFor={`status-${bookmark.id}`}>
                          Application stage
                        </label>
                        <select
                          id={`status-${bookmark.id}`}
                          value={bookmark.status}
                          disabled={updatingId === bookmark.id}
                          onChange={(event) => updateStatus(bookmark.id, event.target.value)}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {statuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>

                        {hasApplyLink ? (
                          <a
                            href={bookmark.apply_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800"
                          >
                            <Icon name="link" />
                            Open
                          </a>
                        ) : (
                          <span className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500">
                            No link
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setTailoringJob({
                            job_title: bookmark.job_title,
                            company_name: bookmark.company_name,
                            job_description: bookmark.description || ""
                          })}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 text-sm font-extrabold hover:bg-blue-100 transition"
                        >
                          Tailor Resume
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {bookmark.is_potential_scam && (
                  <div className="border-t border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800 md:px-6">
                    <p className="font-bold">Potential scam warning</p>
                    <p className="mt-1">{bookmark.scam_reasons.join(" ")}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!filteredBookmarks.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <p className="text-lg font-bold text-slate-950">
              {bookmarks.length ? "No jobs in this stage yet." : "No saved jobs yet."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Save roles from Recommendations to compare match scores and keep each application
              moving through the tracker.
            </p>
          </div>
        )}
      </section>
      <TailorResumeModal job={tailoringJob} onClose={() => setTailoringJob(null)} />
    </div>
  );
}
