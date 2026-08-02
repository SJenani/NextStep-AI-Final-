import { useEffect, useMemo, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Check } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ProfileSkeleton } from "../components/skeletons/PageSkeleton";
import { getOpportunityModeMismatch, correctRoleSpelling } from "../utils/opportunityMode";
import toast from "react-hot-toast";

const emptyForm = {
  skills: "",
  domain: "",
  location: "",
  years_of_experience: "",
  experience_level: "",
  mode: "",
  desired_role: "",
};

function splitSkills(value) {
  return String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initialsFromName(name) {
  const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function computeCompletion(form) {
  const checks = [
    { label: "Target role", done: Boolean(form.desired_role?.trim()) },
    { label: "Core skills", done: splitSkills(form.skills).length >= 3 },
    { label: "Domain", done: Boolean(form.domain?.trim()) },
    { label: "Location", done: Boolean(form.location?.trim()) },
    { label: "Experience", done: form.years_of_experience !== "" && Number(form.years_of_experience) >= 0 },
    { label: "Career mode", done: Boolean(form.mode) },
  ];
  const completeCount = checks.filter((item) => item.done).length;
  return {
    checks,
    completeCount,
    score: Math.round((completeCount / checks.length) * 100),
  };
}

function storageKey(user, key) {
  return `career_profile_${user?.id || user?.email || "local"}_${key}`;
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function ProfileMetric({ label, value, note, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600">{note}</p>
    </div>
  );
}

function QuickAction({ to, label, note }) {
  return (
    <NavLink
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
    >
      <span className="font-semibold text-slate-950 group-hover:text-blue-800">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-slate-600">{note}</span>
    </NavLink>
  );
}

const ChevronDownIcon = () => (
  <svg
    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

function CustomSelect({ value, onChange, options, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || (value ? { label: value, value } : null);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="field-input flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
          {options.map((option) => (
            <div
              key={option.value}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                option.value === value
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComboBox({ value, onChange, options, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        onChange(inputValue);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, onChange]);

  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes((inputValue || "").toLowerCase()));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          className="field-input pr-10"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        <ChevronDownIcon />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                  option.value === value
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
                onClick={() => {
                  setInputValue(option.value);
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div
              className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={() => {
                onChange(inputValue);
                setIsOpen(false);
              }}
            >
              Use "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth() || {};
  const [form, setForm] = useState(emptyForm);
  const [alertEmail, setAlertEmail] = useState(user?.email || "");
  const [frequency, setFrequency] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await client.get("/profile/view");
        setForm({
          skills: (data.skills || []).join(", "),
          domain: data.domain || "",
          location: data.location || "",
          years_of_experience: data.years_of_experience ?? "",
          experience_level: data.experience_level || "",
          mode: data.mode || "",
          desired_role: data.desired_role || "",
        });
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error("Unable to load profile.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    setProfilePhoto(localStorage.getItem(storageKey(user, "photo")) || "");
  }, [user]);

  const skills = useMemo(() => splitSkills(form.skills), [form.skills]);
  const completion = useMemo(() => computeCompletion(form), [form]);
  const modeMismatchMessage = getOpportunityModeMismatch(form.mode, form.desired_role);
  const targetLabel = titleCase(form.desired_role?.trim() || `${form.domain || "Career"} ${form.mode || "path"}`);

  if (loading) {
    return <ProfileSkeleton />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const correctedRole = correctRoleSpelling(form.desired_role);
    const updatedForm = { ...form, desired_role: correctedRole };
    setForm(updatedForm);
    try {
      await client.post("/profile/create", updatedForm);
      toast.success("Profile saved successfully.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async (event) => {
    event.preventDefault();
    try {
      const { data } = await client.get("/notifications/subscribe", {
        params: { email: alertEmail, frequency },
      });
      toast.success(data.message || "Notification subscription saved.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to save notification preferences.");
    }
  };

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for your profile picture.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextPhoto = String(reader.result || "");
      setProfilePhoto(nextPhoto);
      localStorage.setItem(storageKey(user, "photo"), nextPhoto);
      window.dispatchEvent(new Event("nextstep-profile-photo-updated"));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.07)]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">My Profile</p>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <label className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-slate-900 text-2xl font-bold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initialsFromName(user?.full_name)
                )}
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 px-2 py-1 text-center text-[11px] font-semibold opacity-0 transition group-hover:opacity-100">
                  Change
                </span>
                <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="sr-only" />
              </label>
              <div>
                <h2 className="font-display text-4xl font-bold tracking-[-0.04em] text-slate-950">
                  {user?.full_name || "Career profile"}
                </h2>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Targeting <span className="font-semibold text-slate-950">{targetLabel}</span> in{" "}
                  <span className="font-semibold text-slate-950">{form.location || "your preferred location"}</span>.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="muted-chip bg-blue-100 text-blue-900">{titleCase(form.mode)} focus</span>
              <span className="muted-chip bg-emerald-100 text-emerald-900">{titleCase(form.experience_level)}</span>
              <span className="muted-chip bg-slate-100 text-slate-700">{form.domain || "Domain not set"}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Profile Completion</p>
                <p className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950">{completion.score}%</p>
              </div>
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * completion.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${completion.score}%` }} />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {completion.checks.map((check) => (
                <div key={check.label} className={`profile-check-item ${check.done ? "complete" : ""}`}>
                  <span className="profile-check-icon">
                    {check.done ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric label="Skills" value={skills.length} note="Signals used for job matching" tone="blue" />
        <ProfileMetric label="Experience" value={`${form.years_of_experience || 0} yr`} note={titleCase(form.experience_level)} tone="emerald" />
        <ProfileMetric label="Mode" value={titleCase(form.mode)} note="Search and roadmap preference" tone="amber" />
        <ProfileMetric label="Location" value={form.location || "Remote"} note="Used to rank nearby jobs first" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <form onSubmit={handleSubmit} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">Profile Details</p>
              <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950">Tell the assistant what you are aiming for</h3>
            </div>
            <button type="submit" className="primary-button" disabled={saving || Boolean(modeMismatchMessage)}>
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <Field label="Desired role" className="lg:col-span-2">
              <input
                className="field-input capitalize"
                value={form.desired_role}
                onChange={(e) => setForm({ ...form, desired_role: e.target.value })}
                onBlur={(e) => setForm({ ...form, desired_role: correctRoleSpelling(e.target.value) })}
                placeholder="Backend Developer, Data Analyst, Marketing Associate"
              />
            </Field>

            <Field label="Domain">
              <CustomSelect
                value={form.domain}
                onChange={(val) => setForm({ ...form, domain: val })}
                placeholder="Select a domain"
                options={[
                  { value: "IT & Software", label: "IT & Software" },
                  { value: "Data & Analytics", label: "Data & Analytics" },
                  { value: "Design & UX", label: "Design & UX" },
                  { value: "Marketing", label: "Marketing" },
                  { value: "Sales", label: "Sales" },
                  { value: "Finance", label: "Finance" },
                  { value: "Engineering", label: "Engineering" },
                  { value: "HR & Ops", label: "HR & Ops" },
                  ...(form.domain &&
                  ![
                    "IT & Software", "Data & Analytics", "Design & UX", "Marketing", "Sales", "Finance", "Engineering", "HR & Ops"
                  ].includes(form.domain)
                    ? [{ value: form.domain, label: form.domain }]
                    : []),
                ]}
              />
            </Field>

            <Field label="Location">
              <input
                className="field-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Chennai, Bangalore, Remote"
              />
            </Field>

            <Field label="Years of experience">
              <input
                type="number"
                min="0"
                step="0.5"
                className="field-input"
                value={form.years_of_experience}
                onChange={(e) => setForm({ ...form, years_of_experience: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="0"
              />
            </Field>

            <Field label="Experience level">
              <CustomSelect
                value={form.experience_level}
                onChange={(val) => setForm({ ...form, experience_level: val })}
                placeholder="Select experience level"
                options={[
                  { value: "student", label: "Student" },
                  { value: "fresher", label: "Fresher" },
                  { value: "entry", label: "Entry" },
                  { value: "mid", label: "Mid" },
                  { value: "senior", label: "Senior" },
                  { value: "lead", label: "Lead" },
                ]}
              />
            </Field>

            <Field label="Mode">
              <CustomSelect
                value={form.mode}
                onChange={(val) => setForm({ ...form, mode: val })}
                placeholder="Select mode"
                options={[
                  { value: "job", label: "Job" },
                  { value: "internship", label: "Internship" },
                ]}
              />
            </Field>

            <Field label="Skills" className="lg:col-span-2">
              <textarea
                className="field-input min-h-32"
                placeholder="Python, React, SQL, FastAPI"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
            </Field>
          </div>

          {modeMismatchMessage && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {modeMismatchMessage}
            </div>
          )}
        </form>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Skill Signals</p>
            <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-slate-950">Current stack</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? (
                skills.slice(0, 18).map((skill) => (
                  <span key={skill} className="accent-chip">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">Add at least three skills so recommendations can rank roles more accurately.</p>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-coral">Next Actions</p>
            <div className="mt-4 grid gap-3">
              <QuickAction to="/resume" label="Build from resume" note="Extract skills, projects, and experience automatically." />
              <QuickAction to="/dashboard" label="View matches" note="Review current skill gaps and role signals for this profile." />
              <QuickAction to="/dashboard" label="View skill gaps" note="Check the exact skills holding your score back." />
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-coral">Notifications</p>
        <h3 className="mt-3 text-2xl font-bold text-slate-900">Subscribe to matching job alerts</h3>
        <form onSubmit={handleSubscribe} className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <input
            type="email"
            className="field-input"
            placeholder="you@example.com"
            value={alertEmail}
            onChange={(event) => setAlertEmail(event.target.value)}
            required
          />
          <div className="relative w-full">
            <CustomSelect
              value={frequency}
              onChange={setFrequency}
              placeholder="Select frequency"
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
              ]}
            />
          </div>
          <button type="submit" className="primary-button">Save alerts</button>
        </form>
      </section>
    </div>
  );
}
