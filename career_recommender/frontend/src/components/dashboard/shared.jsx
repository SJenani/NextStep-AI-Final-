import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { clamp } from "./utils";

/* ------------------------------------------------------------------ */
/*  AnimatedNumber - counts up when value changes                      */
/* ------------------------------------------------------------------ */

export function AnimatedNumber({ value, suffix = "", duration = 850 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const target = Number(value) || 0;
    const from = Number(displayValue) || 0;

    const animate = (time) => {
      const progress = clamp((time - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    frameRef.current = frame;
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressRing - circular progress indicator with animated fill      */
/* ------------------------------------------------------------------ */

export function ProgressRing({ value, label, tone = "" }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(value) / 100) * circumference;
  const toneClass = tone ? `dashboard-ring-fill-${tone}` : "";

  return (
    <div className="dashboard-ring" aria-label={`${label}: ${Math.round(value)}%`}>
      <svg viewBox="0 0 140 140" role="img">
        <circle className="dashboard-ring-track" cx="70" cy="70" r={radius} />
        <circle
          className={`dashboard-ring-fill ${toneClass}`}
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="dashboard-ring-content">
        <strong>
          <AnimatedNumber value={Math.round(value)} suffix="%" />
        </strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressBar - horizontal progress bar with tone                    */
/* ------------------------------------------------------------------ */

export function ProgressBar({ value, tone = "blue", showLabel = false }) {
  const clamped = clamp(value);
  return (
    <div className="dashboard-progress" aria-label={`${Math.round(value)}%`}>
      <span className={`dashboard-progress-fill dashboard-progress-${tone}`} style={{ width: `${clamped}%` }} />
      {showLabel ? <em className="dashboard-progress-label">{Math.round(clamped)}%</em> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionHeading - reusable section title with action children       */
/* ------------------------------------------------------------------ */

export function SectionHeading({ icon: Icon, title, children, compact = false }) {
  return (
    <div className={`dashboard-section-heading${compact ? " compact" : ""}`}>
      <span>{Icon ? <Icon size={18} /> : null} {title}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState - beautiful empty placeholder                           */
/* ------------------------------------------------------------------ */

export function EmptyState({ title, message, icon: Icon = Sparkles }) {
  return (
    <div className="dashboard-empty">
      <Icon size={24} />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashboardCard - base glassmorphism card wrapper                    */
/* ------------------------------------------------------------------ */

export function DashboardCard({ children, className = "", as: Tag = "section" }) {
  return <Tag className={`dashboard-card ${className}`}>{children}</Tag>;
}

/* ------------------------------------------------------------------ */
/*  MetricCard - small labeled value card                              */
/* ------------------------------------------------------------------ */

export function MetricCard({ label, value, suffix = "", icon: Icon, tone = "blue" }) {
  return (
    <article className={`dashboard-metric-card dashboard-metric-${tone}`}>
      <Icon size={19} />
      <span>{label}</span>
      <strong><AnimatedNumber value={value} suffix={suffix} /></strong>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard - animated counter stat for the Career Statistics grid    */
/* ------------------------------------------------------------------ */

export function StatCard({ label, value, suffix = "", icon: Icon, tone = "blue" }) {
  return (
    <article className={`dashboard-stat-card dashboard-stat-${tone}`}>
      <Icon size={18} />
      <span>{label}</span>
      <strong><AnimatedNumber value={value} suffix={suffix} /></strong>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge - small pill element                                         */
/* ------------------------------------------------------------------ */

export function Badge({ children, tone = "blue" }) {
  return <span className={`dashboard-badge-pill dashboard-badge-${tone}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/*  ChartTooltip wrapper - consistent tooltip styling for Recharts     */
/* ------------------------------------------------------------------ */

export function ChartTooltip({ title, rows, footer }) {
  if (!title && !rows?.length) return null;
  return (
    <div className="dashboard-chart-tooltip">
      {title ? <strong>{title}</strong> : null}
      {rows?.map((row, index) => (
        <span key={`${title}-row-${index}`}>{row}</span>
      ))}
      {footer ? <em>{footer}</em> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VisualPanel - chart card wrapper                                   */
/* ------------------------------------------------------------------ */

export function VisualPanel({ title, children, className = "" }) {
  return (
    <article className={`dashboard-visual-card ${className}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}