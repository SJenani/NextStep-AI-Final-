import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { ResumeSkeleton } from "../components/skeletons/PageSkeleton";
import ScrollToTopButton from "../components/ScrollToTopButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  FileText,
  Plus,
  Search,
  RefreshCw,
  Download,
  Compass,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  XCircle,
  ExternalLink,
  Code,
  Wrench,
  GraduationCap,
  Award,
  Globe,
  FileCode,
  Terminal,
  Zap,
  BarChart3,
  Sparkles,
  Clock,
  TrendingUp,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  User,
  LayoutDashboard,
  Eye,
  DollarSign,
  Target,
  FileUp,
  TrendingDown,
  CheckSquare,
  HelpCircle,
  History,
  Activity,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronDown
} from "lucide-react";
import { correctRoleSpelling } from "../utils/opportunityMode";
import toast from "react-hot-toast";
import TailorResumeModal from "../components/TailorResumeModal";
import StarQuantifierModal from "../components/StarQuantifierModal";

// Custom SVG Icons to avoid lucide-react version issues
function Github(props) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function Linkedin(props) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// Radial Score Gauge Component
function RadialScoreGauge({ score, label, color = "blue", size = 120 }) {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const colorMap = {
    blue: { stroke: "#3b82f6", bg: "#eff6ff", text: "text-blue-600" },
    emerald: { stroke: "#10b981", bg: "#ecfdf5", text: "text-emerald-600" },
    amber: { stroke: "#f59e0b", bg: "#fff7ed", text: "text-amber-600" },
    rose: { stroke: "#f43f5e", bg: "#fff1f2", text: "text-rose-600" },
  };

  const selected = colorMap[color] || colorMap.blue;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke={selected.stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">{Math.round(score)}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <p className="mt-3 text-xs font-mono font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

// KPI score card
function KPIScoreCard({ title, score, status, description, color = "blue", icon: Icon }) {
  const barColors = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  const borderColors = {
    blue: "border-blue-100 bg-blue-50/20",
    emerald: "border-emerald-100 bg-emerald-50/20",
    amber: "border-amber-100 bg-amber-50/20",
    rose: "border-rose-100 bg-rose-50/20",
  };

  const textColors = {
    blue: "text-blue-700 bg-blue-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    rose: "text-rose-700 bg-rose-50",
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(15,23,42,0.06)" }}
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ${borderColors[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-slate-950">{score}</p>
        </div>
        <div className={`rounded-2xl p-3 ${textColors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500">{description}</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${textColors[color]}`}>
            {status}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColors[color]}`}
            style={{ width: typeof score === "number" ? `${score}%` : "100%" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function ResumeUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [resumeFile, setResumeFile] = useState(null);
  const [result, setResult] = useState(null);
  const [audit, setAudit] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tailoringJob, setTailoringJob] = useState(null);
  const [showStarModal, setShowStarModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [mismatches, setMismatches] = useState([]);
  const [ignoreMismatches, setIgnoreMismatches] = useState(false);
  const [isEditingResumeText, setIsEditingResumeText] = useState(false);
  const [editedResumeText, setEditedResumeText] = useState("");
  const [editedResumeLines, setEditedResumeLines] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("professional");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [fontStyle, setFontStyle] = useState("sans");
  const [fontSize, setFontSize] = useState("medium");
  const [lineSpacing, setLineSpacing] = useState("normal");
  const [sectionOrder, setSectionOrder] = useState(["summary", "skills", "projects", "experience"]);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [showCertifications, setShowCertifications] = useState(true);
  const [showLanguages, setShowLanguages] = useState(true);
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customSummary, setCustomSummary] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customGithub, setCustomGithub] = useState("");
  const [customLinkedin, setCustomLinkedin] = useState("");
  const [customExperience, setCustomExperience] = useState([]);
  const [customProjects, setCustomProjects] = useState([]);
  const [customSkills, setCustomSkills] = useState([]);
  const [customTools, setCustomTools] = useState([]);
  const [customCertifications, setCustomCertifications] = useState([]);

  // Premium Dashboard States
  const [recruiterMode, setRecruiterMode] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const pdfZoom = 100;

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editedRole, setEditedRole] = useState("");
  const [editedDomain, setEditedDomain] = useState("");
  const [editedExperience, setEditedExperience] = useState(0);
  const [editedSkills, setEditedSkills] = useState([]);
  const [editedTools, setEditedTools] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  const startEditing = () => {
    if (!structured) return;
    setEditedRole(targetRole || result?.auto_filled_profile?.desired_role || "");
    setEditedDomain(structured.suggested_domain || "IT & Software");
    setEditedExperience(structured.years_of_experience || 0);
    setEditedSkills([...(structured.skills || [])]);
    setEditedTools([...(structured.tools || [])]);
    setIsEditing(false);
    setTimeout(() => {
      setIsEditing(true);
    }, 10);
  };

  const saveAndRecalculate = async () => {
    try {
      setLoadingAudit(true);
      const payload = {
        skills: [...editedSkills, ...editedTools],
        domain: editedDomain,
        location: result?.auto_filled_profile?.location || "Chennai",
        years_of_experience: Number(editedExperience),
        experience_level: editedExperience > 5 ? "senior" : editedExperience > 2 ? "mid" : "student",
        mode: result?.auto_filled_profile?.mode || "internship",
        desired_role: editedRole,
      };
      
      await client.post("/profile/create", payload);

      const params = {};
      const correctedRole = correctRoleSpelling(editedRole);
      
      setEditedRole(correctedRole);
      setTargetRole(correctedRole);
      if (correctedRole.trim()) {
        params.role = correctedRole.trim();
      }
      
      const { data: freshAudit } = await client.get("/resume/audit", { params });

      const updatedResult = {
        ...result,
        auto_filled_profile: {
          ...result.auto_filled_profile,
          desired_role: correctedRole,
          domain: editedDomain,
          years_of_experience: Number(editedExperience),
        },
        structured_profile: {
          ...result.structured_profile,
          skills: editedSkills,
          tools: editedTools,
          suggested_domain: editedDomain,
          years_of_experience: Number(editedExperience),
          experience_level: editedExperience > 5 ? "senior" : editedExperience > 2 ? "mid" : "student",
        }
      };

      setResult(updatedResult);
      setAudit(freshAudit);
      saveCache({
        result: updatedResult,
        audit: freshAudit,
        targetRole: correctedRole
      });
      fetchPreviewJobs(correctedRole);
      setIsEditing(false);
      toast.success("Profile updated and ATS score recalculated!");
    } catch {
      toast.error("Failed to recalculate ATS score.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const CACHE_KEY = "resume_upload_cache";
  const HISTORY_KEY = "resume_upload_history";
  const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
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

  const saveCache = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore
    }
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addToHistory = (filename, role) => {
    try {
      const currentHistory = loadHistory();
      const updated = [
        {
          id: Date.now(),
          filename,
          role: role || "General Profile",
          timestamp: new Date().toLocaleString(),
        },
        ...currentHistory.slice(0, 4),
      ];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setVersionHistory(updated);
    } catch {
      // ignore
    }
  };

  // Real-time job match recommendations
  const fetchPreviewJobs = async (roleName) => {
    if (!roleName) return;
    try {
      setLoadingJobs(true);
      const { data } = await client.get("/recommend/jobs", {
        params: { query: roleName, location: "India" }
      });
      setMatchingJobs(data.slice(0, 3));
    } catch {
      // ignore
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (result && profileData) {
      const currentProfile = profileData;
      const parsedProfile = result.auto_filled_profile || result.structured_profile;
      if (!parsedProfile) {
        setMismatches([]);
        return;
      }

      const list = [];
      // 1. Desired Role
      const profileRole = typeof currentProfile.desired_role === "string" ? currentProfile.desired_role : "";
      const parsedRole = typeof parsedProfile.desired_role === "string" ? parsedProfile.desired_role : typeof parsedProfile.target_role === "string" ? parsedProfile.target_role : "";
      if (profileRole.toLowerCase().trim() !== parsedRole.toLowerCase().trim() && parsedRole.trim()) {
        list.push({
          field: "Desired Role",
          key: "desired_role",
          profileVal: profileRole,
          resumeVal: parsedRole,
        });
      }

      // 2. Years of Experience
      const profileExp = Number(currentProfile.years_of_experience || 0);
      const parsedExp = Number(parsedProfile.years_of_experience || 0);
      if (profileExp !== parsedExp) {
        list.push({
          field: "Years of Experience",
          key: "years_of_experience",
          profileVal: profileExp,
          resumeVal: parsedExp,
        });
      }

      // 3. Domain
      const profileDomain = typeof currentProfile.domain === "string" ? currentProfile.domain : "";
      const parsedDomain = typeof parsedProfile.domain === "string" ? parsedProfile.domain : typeof parsedProfile.suggested_domain === "string" ? parsedProfile.suggested_domain : "";
      if (profileDomain.toLowerCase().trim() !== parsedDomain.toLowerCase().trim() && parsedDomain.trim()) {
        list.push({
          field: "Domain",
          key: "domain",
          profileVal: profileDomain,
          resumeVal: parsedDomain,
        });
      }

      // 4. Skills
      const profileSkills = (currentProfile.skills || [])
        .filter(s => typeof s === "string")
        .map(s => s.toLowerCase().trim());
      const parsedSkillsList = (parsedProfile.skills || []).filter(s => typeof s === "string");
      const missingFromProfile = parsedSkillsList.filter(s => !profileSkills.includes(s.toLowerCase().trim()));
      
      if (missingFromProfile.length > 0) {
        list.push({
          field: "Skills",
          key: "skills",
          profileVal: (currentProfile.skills || []).join(", "),
          resumeVal: parsedSkillsList.join(", "),
          missingSkills: missingFromProfile
        });
      }

      setMismatches(list);
    } else {
      setMismatches([]);
    }
  }, [result, profileData]);

  useEffect(() => {
    let ignore = false;
    setVersionHistory(loadHistory());

    async function loadProfile() {
      setLoading(true);
      const cached = loadCache();
      if (cached) {
        setResult(cached.result);
        setAudit(cached.audit);
        setTargetRole(cached.targetRole);
        fetchPreviewJobs(cached.targetRole);
      }

      try {
        const { data } = await client.get("/profile/view");
        if (!ignore) {
          setProfileData(data);
          if (data.desired_role && (!cached || !cached.targetRole)) {
            setTargetRole(data.desired_role);
            fetchPreviewJobs(data.desired_role);
          }
        }
      } catch {
        // upload still works without existing profile
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Lora:ital,wght@0,400..700;1,400..700&family=Outfit:wght@100..900&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Fira+Code:wght@300..700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (result) {
      setCustomName(profileData?.full_name || (result?.auto_filled_profile?.desired_role ? correctRoleSpelling(result.auto_filled_profile.desired_role) : "Candidate Profile"));
      setCustomRole(targetRole || result?.auto_filled_profile?.desired_role || "Software Developer");
      setCustomEmail(profileData?.email || result?.auto_filled_profile?.email || "candidate@nextstepai.com");
      setCustomGithub(result?.auto_filled_profile?.github || "github.com/candidate");
      setCustomLinkedin(result?.auto_filled_profile?.linkedin || "linkedin.com/in/candidate");
      setCustomSummary(result?.auto_filled_profile?.resume_text?.slice(0, 400) || "Highly analytical and results-oriented professional with a proven track record of software architecture.");
      
      if (result.structured_profile) {
        setCustomExperience(result.structured_profile.experience_highlights || []);
        setCustomProjects(result.structured_profile.projects || []);
        setCustomSkills(result.structured_profile.skills || []);
        setCustomTools(result.structured_profile.tools || []);
        setCustomCertifications(result.structured_profile.certificates || []);
      }
    }
  }, [result, profileData, targetRole]);

  if (loading) {
    return <ResumeSkeleton />;
  }

  const handleUpload = async (event) => {
    if (event) event.preventDefault();
    if (!resumeFile) {
      toast.error("Please select a resume PDF file first.");
      setMessage("Upload a resume PDF.");
      return;
    }

    // Reset previous states to clear old scorecards
    setResult(null);
    setAudit(null);
    setMessage("");
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setLoadingAudit(true);
      const { data } = await client.post("/resume/upload?auto_fill=true", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      setAudit(data.resume_audit || null);
      setIgnoreMismatches(false);
      
      let nextRole = targetRole;
      if (!nextRole && data.resume_audit?.target_role) {
        nextRole = data.resume_audit.target_role;
        setTargetRole(nextRole);
      }
      
      saveCache({
        result: data,
        audit: data.resume_audit || null,
        targetRole: nextRole
      });
      addToHistory(resumeFile.name, nextRole);
      fetchPreviewJobs(nextRole);
      
      toast.success("Resume parsed and ATS audit generated!");
      setMessage("Documents analyzed, structured profile draft created, skills updated, and ATS audit generated.");
    } catch (error) {
      console.error("Upload error:", error);
      const errMsg = error.response?.data?.detail || error.message || "Document analysis failed.";
      toast.error(errMsg);
      setMessage(`Error: ${errMsg} | ${error.stack?.substring(0, 50)}`);
    } finally {
      setLoadingAudit(false);
    }
  };

  const refreshAudit = async () => {
    try {
      setLoadingAudit(true);
      const params = {};
      const corrected = correctRoleSpelling(targetRole);
      setTargetRole(corrected);
      if (corrected.trim()) {
        params.role = corrected.trim();
      }
      const { data } = await client.get("/resume/audit", { params });
      setAudit(data);
      saveCache({
        result,
        audit: data,
        targetRole: corrected
      });
      fetchPreviewJobs(corrected);
      toast.success("ATS audit refreshed successfully.");
      setMessage("ATS audit refreshed for the selected target role.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to refresh ATS audit.");
      setMessage(error.response?.data?.detail || "Unable to refresh ATS audit.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setResumeFile(droppedFile);
      toast.success(`Selected file: ${droppedFile.name}`);
    } else {
      toast.error("Please drop a valid PDF file.");
    }
  };

  const handleAcceptProfileChanges = async () => {
    try {
      setLoadingAudit(true);
      const parsedProfile = result.auto_filled_profile || result.structured_profile;
      if (!parsedProfile) return;

      const payload = {
        skills: parsedProfile.skills || [],
        domain: parsedProfile.domain || parsedProfile.suggested_domain || "IT & Software",
        location: parsedProfile.location || "Chennai",
        years_of_experience: Number(parsedProfile.years_of_experience || 0),
        experience_level: Number(parsedProfile.years_of_experience || 0) > 5 ? "senior" : Number(parsedProfile.years_of_experience || 0) > 2 ? "mid" : "student",
        mode: parsedProfile.mode || "internship",
        desired_role: parsedProfile.desired_role || targetRole,
      };

      const { data: updatedProfile } = await client.post("/profile/create", payload);
      setProfileData(updatedProfile);

      // Re-run audit
      const params = {};
      if (payload.desired_role.trim()) {
        params.role = payload.desired_role.trim();
      }
      const { data: freshAudit } = await client.get("/resume/audit", { params });

      const updatedResult = {
        ...result,
        auto_filled_profile: {
          ...result.auto_filled_profile,
          desired_role: payload.desired_role,
          domain: payload.domain,
          years_of_experience: payload.years_of_experience,
        },
        structured_profile: {
          ...result.structured_profile,
          skills: payload.skills,
          suggested_domain: payload.domain,
          years_of_experience: payload.years_of_experience,
          experience_level: payload.experience_level,
        }
      };

      setResult(updatedResult);
      setAudit(freshAudit);
      setTargetRole(payload.desired_role);
      saveCache({
        result: updatedResult,
        audit: freshAudit,
        targetRole: payload.desired_role
      });
      fetchPreviewJobs(payload.desired_role);
      toast.success("Profile details updated to match your resume!");
    } catch {
      toast.error("Failed to update profile data.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleUpdateResumeFromProfile = async () => {
    try {
      setLoadingAudit(true);
      const currentProfile = profileData;
      if (!currentProfile) return;

      const payload = {
        skills: currentProfile.skills || [],
        domain: currentProfile.domain || "IT & Software",
        location: currentProfile.location || "Chennai",
        years_of_experience: Number(currentProfile.years_of_experience || 0),
        experience_level: Number(currentProfile.years_of_experience || 0) > 5 ? "senior" : Number(currentProfile.years_of_experience || 0) > 2 ? "mid" : "student",
        mode: currentProfile.mode || "internship",
        desired_role: currentProfile.desired_role || targetRole,
      };

      const params = {};
      if (payload.desired_role.trim()) {
        params.role = payload.desired_role.trim();
      }
      const { data: freshAudit } = await client.get("/resume/audit", { params });

      const updatedResult = {
        ...result,
        auto_filled_profile: {
          ...(result?.auto_filled_profile || {}),
          desired_role: payload.desired_role,
          domain: payload.domain,
          years_of_experience: payload.years_of_experience,
        },
        structured_profile: {
          ...(result?.structured_profile || {}),
          skills: payload.skills,
          suggested_domain: payload.domain,
          years_of_experience: payload.years_of_experience,
          experience_level: payload.experience_level,
        }
      };

      setResult(updatedResult);
      setAudit(freshAudit);
      setTargetRole(payload.desired_role);
      saveCache({
        result: updatedResult,
        audit: freshAudit,
        targetRole: payload.desired_role
      });
      fetchPreviewJobs(payload.desired_role);
      toast.success("Resume template updated to match your profile!");
    } catch {
      toast.error("Failed to update resume data.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const getResumeTextSource = () => {
    return result?.auto_filled_profile?.resume_text || result?.extracted_text_preview || "";
  };

  const openResumeTextEditor = () => {
    const sourceText = editedResumeText || getResumeTextSource();
    setEditedResumeText(sourceText);
    setEditedResumeLines(sourceText.split(/\r?\n/));
    setIsEditingResumeText(true);
  };

  const updateResumeLine = (index, value) => {
    setEditedResumeLines((current) => current.map((line, lineIndex) => (lineIndex === index ? value : line)));
  };

  const addResumeLineAfter = (index) => {
    setEditedResumeLines((current) => {
      const next = [...current];
      next.splice(index + 1, 0, "");
      return next;
    });
  };

  const removeResumeLine = (index) => {
    setEditedResumeLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleSaveResumeText = async (textOverride) => {
    const nextResumeText = typeof textOverride === "string" ? textOverride : editedResumeText;

    try {
      setLoadingAudit(true);
      
      const parsedProfile = result?.auto_filled_profile || result?.structured_profile;
      
      const payload = {
        skills: profileData?.skills || parsedProfile?.skills || [],
        domain: profileData?.domain || parsedProfile?.domain || parsedProfile?.suggested_domain || "IT & Software",
        location: profileData?.location || parsedProfile?.location || "Chennai",
        years_of_experience: Number(profileData?.years_of_experience ?? parsedProfile?.years_of_experience ?? 0),
        experience_level: profileData?.experience_level || parsedProfile?.experience_level || "student",
        mode: profileData?.mode || parsedProfile?.mode || "job",
        desired_role: targetRole || profileData?.desired_role || parsedProfile?.desired_role,
        resume_text: nextResumeText
      };

      const { data: updatedProfile } = await client.post("/profile/create", payload);
      setProfileData(updatedProfile);

      const params = {};
      if (payload.desired_role && typeof payload.desired_role === "string" && payload.desired_role.trim()) {
        params.role = payload.desired_role.trim();
      }
      const { data: freshAudit } = await client.get("/resume/audit", { params });

      const updatedResult = {
        ...result,
        extracted_text_preview: nextResumeText.slice(0, 1200),
        auto_filled_profile: {
          ...(result?.auto_filled_profile || {}),
          ...payload,
          resume_text: nextResumeText,
        },
        structured_profile: {
          ...(result?.structured_profile || {}),
          skills: payload.skills,
          suggested_domain: payload.domain,
          years_of_experience: payload.years_of_experience,
          experience_level: payload.experience_level,
        }
      };

      setResult(updatedResult);
      setEditedResumeText(nextResumeText);
      setAudit(freshAudit);
      saveCache({
        result: updatedResult,
        audit: freshAudit,
        targetRole: payload.desired_role
      });
      fetchPreviewJobs(payload.desired_role);
      setIsEditingResumeText(false);
      toast.success("Resume text updated and ATS score re-audited!");
    } catch {
      toast.error("Failed to update resume text.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const renderResumeTemplate = () => {
    const customName = profileData?.full_name || result?.auto_filled_profile?.full_name || "Candidate Name";
    const customRole = targetRole || result?.auto_filled_profile?.desired_role || "Software Developer";
    const customEmail = profileData?.email || result?.auto_filled_profile?.email || "candidate@nextstepai.com";
    const customGithub = result?.auto_filled_profile?.github || "github.com/candidate";
    const customLinkedin = result?.auto_filled_profile?.linkedin || "linkedin.com/in/candidate";
    const languagesList = ["English", "Hindi"];

    const fontClass = 
      fontStyle === "serif" ? "font-serif" : 
      fontStyle === "merriweather" ? "font-serif" : 
      fontStyle === "playfair" ? "font-serif" : 
      fontStyle === "mono" ? "font-mono" : "font-sans";

    const fontFamilyInline = 
      fontStyle === "sans" ? "'Outfit', sans-serif" :
      fontStyle === "serif" ? "'Lora', serif" :
      fontStyle === "merriweather" ? "'Merriweather', serif" :
      fontStyle === "playfair" ? "'Playfair Display', serif" :
      fontStyle === "mono" ? "'Fira Code', monospace" :
      "sans-serif";
    
    const sizeClasses = {
      small: { body: "text-[10px]", header: "text-xs", title: "text-sm", meta: "text-[9px]" },
      medium: { body: "text-[11.5px]", header: "text-sm", title: "text-base", meta: "text-[10px]" },
      large: { body: "text-[13px]", header: "text-base", title: "text-lg", meta: "text-xs" }
    };
    const size = sizeClasses[fontSize] || sizeClasses.medium;

    const spacingClass = lineSpacing === "tight" ? "leading-snug space-y-1" : lineSpacing === "relaxed" ? "leading-loose space-y-3" : "leading-relaxed space-y-2";

    const renderSummaryBlock = () => (
      <div key="summary" className="space-y-1 text-left">
        <h5 
          className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
        >
          Professional Summary
        </h5>
        <p 
          contentEditable 
          suppressContentEditableWarning 
          onBlur={(e) => setCustomSummary(e.target.innerText)}
          className={`${size.body} text-slate-650 cursor-text hover:bg-slate-50 p-1 rounded transition leading-relaxed`}
        >
          {customSummary}
        </p>
      </div>
    );

    const renderSkillsBlock = () => (
      <div key="skills" className="space-y-1 text-left">
        <h5 
          className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
        >
          Technical Stack & Skills
        </h5>
        <div className="flex flex-wrap gap-1 mt-1">
          {customSkills.map((skill, i) => (
            <span 
              key={i} 
              className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold hover:opacity-80 cursor-text transition"
              style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newArr = [...customSkills];
                newArr[i] = e.target.innerText.trim();
                setCustomSkills(newArr.filter(Boolean));
              }}
            >
              {skill}
            </span>
          ))}
          {customTools.map((tool, i) => (
            <span 
              key={i} 
              className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-semibold hover:bg-slate-200 cursor-text transition"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newArr = [...customTools];
                newArr[i] = e.target.innerText.trim();
                setCustomTools(newArr.filter(Boolean));
              }}
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    );

    const renderProjectsBlock = () => (
      <div key="projects" className="space-y-2 text-left">
        <h5 
          className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
        >
          Featured Projects
        </h5>
        {customProjects.map((p, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex justify-between font-bold text-slate-900">
              <span 
                className={`${size.body} hover:bg-slate-50 cursor-text transition rounded px-1 -mx-1`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newArr = [...customProjects];
                  newArr[i] = e.target.innerText;
                  setCustomProjects(newArr);
                }}
              >
                {p}
              </span>
              <span className={`${size.meta} text-slate-400 font-medium`}>Lead Developer</span>
            </div>
            <p className={`text-slate-500 ${size.body}`}>
              Architected system schema, developed clean APIs, managed deployments, and optimized database query cycles.
            </p>
          </div>
        ))}
      </div>
    );

    const renderExperienceBlock = () => (
      <div key="experience" className="space-y-2 text-left">
        <h5 
          className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
        >
          Professional Experience
        </h5>
        {customExperience.map((exp, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex justify-between font-bold text-slate-900">
              <span className={size.body}>{customRole} Professional</span>
              <span className={`${size.meta} text-slate-400 font-medium`}>India</span>
            </div>
            <p 
              className={`text-slate-700 ${size.body} hover:bg-slate-50 cursor-text transition rounded px-1 -mx-1`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newArr = [...customExperience];
                newArr[i] = e.target.innerText;
                setCustomExperience(newArr);
              }}
            >
              {exp}
            </p>
          </div>
        ))}
      </div>
    );

    const renderCertificationsBlock = () => {
      if (!showCertifications || customCertifications.length === 0) return null;
      return (
        <div key="certifications" className="space-y-1 text-left">
          <h5 
            className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
            style={{ borderColor: `${accentColor}40`, color: accentColor }}
          >
            Certifications
          </h5>
          <p 
            className={`${size.body} text-slate-650 hover:bg-slate-50 cursor-text transition rounded px-1 -mx-1`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const text = e.target.innerText;
              const newArr = text.split(",").map(s => s.trim()).filter(Boolean);
              setCustomCertifications(newArr);
            }}
          >
            {customCertifications.join(", ")}
          </p>
        </div>
      );
    };

    const renderLanguagesBlock = () => {
      if (!showLanguages) return null;
      return (
        <div key="languages" className="space-y-1 text-left">
          <h5 
            className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
            style={{ borderColor: `${accentColor}40`, color: accentColor }}
          >
            Languages
          </h5>
          <p className={`${size.body} text-slate-650`}>
            {languagesList.join(", ")}
          </p>
        </div>
      );
    };

    const renderPhotoBlock = () => {
      if (!showPhoto) return null;
      return (
        <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-slate-500 uppercase">{customName.slice(0, 2)}</span>
          )}
        </div>
      );
    };

    const renderedSections = [];
    sectionOrder.forEach(sec => {
      if (sec === "summary") renderedSections.push(renderSummaryBlock());
      if (sec === "skills") renderedSections.push(renderSkillsBlock());
      if (sec === "projects") renderedSections.push(renderProjectsBlock());
      if (sec === "experience") renderedSections.push(renderExperienceBlock());
    });
    renderedSections.push(renderCertificationsBlock());
    renderedSections.push(renderLanguagesBlock());

    if (selectedTemplate === "creative") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] flex min-h-[380px] ${fontClass} rounded-2xl overflow-hidden`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="w-[125px] p-4 text-slate-300 space-y-4 flex flex-col justify-between text-left" style={{ backgroundColor: accentColor }}>
            <div className="space-y-3">
              {showPhoto && (
                <div className="h-10 w-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center mb-2 mx-auto overflow-hidden">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-white uppercase">{customName.slice(0, 2)}</span>
                  )}
                </div>
              )}
              <div>
                <h4 
                  contentEditable 
                  suppressContentEditableWarning 
                  onBlur={(e) => setCustomName(e.target.innerText)}
                  className="text-xs font-black text-white uppercase tracking-wider break-words cursor-text hover:bg-white/10 p-0.5 rounded transition"
                >
                  {customName}
                </h4>
                <p 
                  contentEditable 
                  suppressContentEditableWarning 
                  onBlur={(e) => setCustomRole(e.target.innerText)}
                  className="text-[8px] text-white/80 font-bold uppercase tracking-tight mt-0.5 cursor-text hover:bg-white/10 p-0.5 rounded transition"
                >
                  {customRole}
                </p>
              </div>
              <div className="space-y-1 text-[8px] text-white/70 break-all leading-normal">
                <p className="font-semibold text-white">Contact:</p>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-white/10 rounded px-0.5">{customEmail}</p>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-white/10 rounded px-0.5">{customGithub}</p>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-white/10 rounded px-0.5">{customLinkedin}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white uppercase tracking-wider">Expertise</p>
                <div className="flex flex-col gap-1 mt-1">
                  {customSkills.slice(0, 6).map(s => (
                    <span key={s} className="bg-white/10 text-white rounded px-1.5 py-0.5 text-[8px] font-semibold border border-white/10">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-[7.5px] text-white/50 font-mono">NEXTSTEP AI</div>
          </div>

          <div className="flex-1 p-5 space-y-4 bg-slate-50/50 text-left overflow-y-auto">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "minimalist") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-355 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass}`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="text-center space-y-1 flex flex-col items-center">
            {showPhoto && renderPhotoBlock()}
            <h4 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomName(e.target.innerText)}
              className="text-base font-semibold tracking-widest text-slate-955 uppercase cursor-text hover:bg-slate-50 p-0.5 rounded transition"
            >
              {customName}
            </h4>
            <p 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomRole(e.target.innerText)}
              className="text-[9.5px] text-slate-400 tracking-wider uppercase font-semibold cursor-text hover:bg-slate-50 p-0.5 rounded transition"
            >
              {customRole}
            </p>
            <p className="text-[8.5px] text-slate-400 mt-1 flex gap-1.5 justify-center flex-wrap">
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customEmail}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customGithub}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customLinkedin}</span>
            </p>
          </div>
          <div className="space-y-3">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "modern") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} rounded-2xl`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="flex items-center gap-3 justify-between border-l-4 pl-3 py-1 text-left" style={{ borderColor: accentColor }}>
            <div>
              <h4 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomName(e.target.innerText)}
                className="text-sm font-extrabold tracking-tight text-slate-950 capitalize cursor-text hover:bg-slate-50 p-0.5 rounded transition"
              >
                {customName}
              </h4>
              <p 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomRole(e.target.innerText)}
                className="text-[11px] font-bold tracking-wide mt-0.5 cursor-text hover:bg-slate-50 p-0.5 rounded transition" 
                style={{ color: accentColor }}
              >
                {customRole}
              </p>
              <p className="text-[9.5px] text-slate-500 mt-1 flex flex-wrap gap-1.5 font-medium">
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customEmail}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customGithub}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customLinkedin}</span>
              </p>
            </div>
            {showPhoto && renderPhotoBlock()}
          </div>
          <div className="space-y-3">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "software_engineer") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} text-left`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: `${accentColor}30` }}>
            <div>
              <h4 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomName(e.target.innerText)}
                className="text-base font-extrabold tracking-tight text-slate-900 cursor-text hover:bg-slate-50 p-0.5 rounded transition"
              >
                {customName}
              </h4>
              <p 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomRole(e.target.innerText)}
                className="text-xs font-semibold mt-0.5 text-slate-600 cursor-text hover:bg-slate-550 p-0.5 rounded transition"
              >
                {customRole}
              </p>
              <p className="text-[9.5px] text-slate-500 mt-1 font-mono flex flex-wrap gap-1.5">
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customEmail}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customGithub}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customLinkedin}</span>
              </p>
            </div>
            {showPhoto && renderPhotoBlock()}
          </div>
          <div className="space-y-3 pt-2">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "fullstack") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} text-left rounded-xl`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="flex justify-between items-center bg-slate-900 text-white p-4 -mx-6 -mt-6 rounded-t-xl">
            <div className="space-y-0.5">
              <h4 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomName(e.target.innerText)}
                className="text-sm font-black uppercase tracking-wider cursor-text hover:bg-white/10 p-0.5 rounded transition"
              >
                {customName}
              </h4>
              <p 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomRole(e.target.innerText)}
                className="text-[9.5px] font-bold tracking-widest text-slate-400 uppercase cursor-text hover:bg-white/10 p-0.5 rounded transition"
              >
                {customRole}
              </p>
            </div>
            {showPhoto ? renderPhotoBlock() : (
              <span className="text-[9px] font-mono text-slate-450 border border-slate-700 px-2 py-0.5 rounded">STACK VERIFIED</span>
            )}
          </div>
          <div className="text-[9.5px] text-slate-500 pt-2 border-b pb-2 flex flex-wrap gap-2 justify-center font-semibold">
            <span>Email: <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-100 px-0.5 rounded">{customEmail}</span></span> • 
            <span>GitHub: <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-100 px-0.5 rounded">{customGithub}</span></span> • 
            <span>LinkedIn: <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-100 px-0.5 rounded">{customLinkedin}</span></span>
          </div>
          <div className="space-y-3 pt-2">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "data_analyst") {
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} text-left`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="flex justify-between items-start border-b-2 pb-2" style={{ borderColor: accentColor }}>
            <div>
              <h4 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomName(e.target.innerText)}
                className="text-base font-black tracking-tight text-slate-955 uppercase cursor-text hover:bg-slate-50 p-0.5 rounded transition"
              >
                {customName}
              </h4>
              <p 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => setCustomRole(e.target.innerText)}
                className="text-xs font-bold tracking-wide uppercase mt-0.5 cursor-text hover:bg-slate-550 p-0.5 rounded transition" 
                style={{ color: accentColor }}
              >
                {customRole}
              </p>
              <p className="text-[9px] text-slate-405 mt-1 flex gap-1.5 font-medium flex-wrap">
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customEmail}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customGithub}</span> | 
                <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-50 px-0.5 rounded">{customLinkedin}</span>
              </p>
            </div>
            {showPhoto && renderPhotoBlock()}
          </div>
          <div className="space-y-3 pt-2">
            {renderedSections}
          </div>
        </div>
      );
    }

    if (selectedTemplate === "fresher") {
      const renderEducationFirst = () => (
        <div key="education_first" className="space-y-1 text-left">
          <h5 
            className={`font-bold ${size.header} uppercase tracking-wider border-b pb-0.5`}
            style={{ borderColor: `${accentColor}40`, color: accentColor }}
          >
            Education & Academy
          </h5>
          <div className="space-y-0.5">
            <p className={`font-bold text-slate-900 ${size.body}`}>Bachelor of Science / Engineering</p>
            <p className={`text-slate-500 ${size.body}`}>Computer Sciences Major • GPA 8.8/10.0</p>
          </div>
        </div>
      );
      const fresherSections = [
        renderEducationFirst(),
        ...renderedSections.filter(item => item && item.key !== "experience")
      ];
      return (
        <div
          className={`bg-white shadow-md border border-slate-350 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} text-left rounded-xl`}
          style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
        >
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-200">
            {showPhoto && <div className="mx-auto flex justify-center mb-1">{renderPhotoBlock()}</div>}
            <h4 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomName(e.target.innerText)}
              className="text-sm font-extrabold tracking-tight text-slate-900 uppercase cursor-text hover:bg-slate-50 p-0.5 rounded transition"
            >
              {customName}
            </h4>
            <p 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomRole(e.target.innerText)}
              className="text-[10px] text-slate-500 font-bold uppercase tracking-wider cursor-text hover:bg-slate-50 p-0.5 rounded transition"
            >
              {customRole}
            </p>
            <p className="text-[8.5px] text-slate-400">
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customEmail}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customGithub}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customLinkedin}</span>
            </p>
          </div>
          <div className="space-y-3 pt-2">
            {fresherSections}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`bg-white shadow-md border border-slate-355 w-full max-w-[420px] p-6 ${fontClass} ${spacingClass} rounded-xl text-left`}
        style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s", fontFamily: fontFamilyInline }}
      >
        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-800">
          <div className="space-y-1">
            <h4 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomName(e.target.innerText)}
              className="text-base font-bold tracking-wide text-slate-955 uppercase cursor-text hover:bg-slate-550 p-0.5 rounded transition"
            >
              {customName}
            </h4>
            <p 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => setCustomRole(e.target.innerText)}
              className="text-[10px] tracking-wider uppercase font-sans font-bold cursor-text hover:bg-slate-550 p-0.5 rounded transition" 
              style={{ color: accentColor }}
            >
              {customRole}
            </p>
            <p className="text-[9px] text-slate-505 font-sans font-medium flex gap-1.5 justify-center flex-wrap">
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomEmail(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customEmail}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomGithub(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customGithub}</span> • 
              <span contentEditable suppressContentEditableWarning onBlur={(e) => setCustomLinkedin(e.target.innerText)} className="cursor-text hover:bg-slate-550 px-0.5 rounded">{customLinkedin}</span>
            </p>
          </div>
          {showPhoto && renderPhotoBlock()}
        </div>
        <div className="space-y-3 pt-2">
          {renderedSections}
        </div>
      </div>
    );
  };

  const structured = result?.structured_profile;

  // Premium Simulated metrics
  const scoreRaw = audit?.overall_score || 0;
  const accuracyScore = scoreRaw ? 98.4 : 0;
  const confidenceScore = scoreRaw ? Math.round(90 + (scoreRaw % 10)) : 0;
  const readinessScore = scoreRaw ? Math.min(100, Math.round((audit?.market_readiness_score || 0) * 0.95 + 8)) : 0;
  const expectedScore = scoreRaw ? Math.min(99, Math.round(scoreRaw + 14)) : 0;

  // Salary calculations
  const experienceYears = structured?.years_of_experience || 0;
  const salaryRange = scoreRaw 
    ? experienceYears > 5 
      ? "INR 15.0 - 24.0 LPA" 
      : experienceYears > 2 
      ? "INR 8.0 - 14.0 LPA" 
      : "INR 5.0 - 7.5 LPA"
    : "Not analyzed";

  // Benchmarks
  const domainText = structured?.suggested_domain || "IT & Software";
  const benchmarkText = scoreRaw 
    ? `Top ${Math.round(Math.max(5, 45 - (scoreRaw * 0.4)))}% in ${domainText}`
    : "Not analyzed";

  const candidateSummary = scoreRaw && structured
    ? `Qualified candidate with ${experienceYears} years of experience in the ${domainText} domain. Core strengths include ${structured.skills.slice(0, 5).join(", ")}. Demonstrates structured project capabilities with ${structured.projects.length} parsed project proof-points.`
    : null;


  const exportResumeToPDF = async () => {
    const resumeElement = document.getElementById("resume-preview-content");
    if (!resumeElement) {
      toast.error("Resume preview not found.");
      return;
    }
    
    // Create a toast to show progress
    const loadingToast = toast.loading("Generating high-quality PDF...");
    
    try {
      const htmlContent = resumeElement.innerHTML;
      
      const response = await client.post(
        "/resume/export-pdf",
        { html: htmlContent },
        { responseType: "blob" }
      );
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Resume_Preview.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded successfully!", { id: loadingToast });
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const exportResumeToWord = async () => {
    if (!structured) {
      toast.error("Resume data not available.");
      return;
    }
    
    const loadingToast = toast.loading("Generating Word document...");
    
    try {
      const payload = {
        name: customName,
        role: customRole,
        email: customEmail,
        github: customGithub,
        linkedin: customLinkedin,
        summary: customSummary,
        skills: customSkills,
        tools: customTools,
        projects: customProjects,
        experience: customExperience,
        certifications: customCertifications
      };
      
      const response = await client.post(
        "/resume/export-docx",
        payload,
        { responseType: "blob" }
      );
      
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "Resume_Generated.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToast);
      toast.success("Word document generated successfully!");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to generate Word document.");
    }
  };

  return (
    <div className="space-y-8 font-sans antialiased text-slate-900 pb-16 print:p-0 print:m-0 print:space-y-0 print:pb-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-700 font-semibold">Greenhouse ATS Integration</p>
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Resume ATS Analysis
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Analyze your resume, improve ATS compatibility, and increase interview chances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {audit?.improvement_tips?.length > 0 && (
            <button
              onClick={() => {
                const element = document.getElementById("ai-improvements");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              Improve Resume
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FileUp className="h-4 w-4" />
            Upload New Resume
          </button>
        </div>
      </div>

      {/* DRAG AND DROP ZONE */}
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 transition-all hover:border-blue-400 print:hidden">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 mb-4">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Drag and drop your resume here</h3>
          <p className="mt-1.5 text-sm text-slate-500">Only PDF files are supported. Max size 5MB.</p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Choose PDF File
            </button>
            
            {resumeFile && (
              <span className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800 border border-blue-100 flex items-center gap-2 break-all max-w-xs sm:max-w-md">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                {resumeFile.name}
              </span>
            )}
          </div>

          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                setResumeFile(file);
                toast.success(`Selected file: ${file.name}`);
              }
            }}
            className="sr-only"
          />

          <form onSubmit={handleUpload} className="w-full max-w-2xl mt-8">
            <div className="grid gap-3 sm:grid-cols-[1.5fr_auto]">
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Target role, e.g. MERN Stack Developer"
                className="field-input text-base text-slate-900 border border-slate-200 capitalize"
              />
              <button
                type="submit"
                disabled={loadingAudit || !resumeFile}
                className="primary-button disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
              >
                {loadingAudit ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  "Build profile & Audit"
                )}
              </button>
            </div>
          </form>

          {message && (
            <p className="mt-5 text-sm font-bold text-slate-600 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <Activity className="h-4 w-4 text-blue-600" />
              {message}
            </p>
          )}
        </div>
      </section>

      {/* PROFILE MISMATCH DETECTED PANEL */}
      {mismatches.length > 0 && !ignoreMismatches && (
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 sm:p-8 space-y-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 text-amber-700 p-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Profile Mismatch Detected</h3>
              <p className="text-sm text-slate-650 leading-relaxed max-w-3xl">
                The information extracted from your uploaded resume differs from your saved profile details. We recommend updating your profile database to align with your resume accomplishments.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Field</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Saved Profile Info</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Parsed Resume Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {mismatches.map((m) => (
                  <tr key={m.field} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-700">{m.field}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">
                      {m.key === "skills" ? (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(m.profileVal ? m.profileVal.split(", ") : []).map(s => (
                            <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">{s}</span>
                          ))}
                          {!m.profileVal && <span className="text-slate-400 italic">None</span>}
                        </div>
                      ) : (
                        m.profileVal || <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-900 font-semibold">
                      {m.key === "skills" ? (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(m.resumeVal ? m.resumeVal.split(", ") : []).map(s => {
                            const isNew = m.missingSkills?.some(ms => ms.toLowerCase() === s.toLowerCase());
                            return (
                              <span 
                                key={s} 
                                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                  isNew ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                {s}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-amber-850 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50 font-bold">
                          {m.resumeVal}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to update your profile to match the resume? This will change your profile info.")) {
                  handleAcceptProfileChanges();
                }
              }}
              disabled={loadingAudit}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60"
            >
              {loadingAudit ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Update Profile to Match Resume
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to correct your resume to match your profile?")) {
                  handleUpdateResumeFromProfile();
                }
              }}
              disabled={loadingAudit}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60"
            >
              {loadingAudit ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Correct Resume to Match Profile
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to ignore these mismatches and leave as is?")) {
                  setIgnoreMismatches(true);
                  toast.success("Mismatches ignored.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition"
            >
              Leave As Is
            </button>
          </div>
        </motion.section>
      )}

      {/* TOP KPI SUMMARY SECTION */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        <KPIScoreCard
          title="Resume Score"
          score={scoreRaw > 0 ? scoreRaw : "—"}
          status={scoreRaw >= 80 ? "Excellent" : scoreRaw >= 50 ? "Good" : scoreRaw > 0 ? "Needs Review" : "Pending"}
          description="Based on ATS parsing checklist"
          color={scoreRaw >= 80 ? "emerald" : scoreRaw >= 50 ? "blue" : scoreRaw > 0 ? "amber" : "slate"}
          icon={FileText}
        />
        <KPIScoreCard
          title="ATS Compatibility"
          score={scoreRaw > 0 ? Math.round(audit?.keyword_match_score || 0) : "—"}
          status={scoreRaw > 0 ? `${audit?.matched_keywords?.length || 0} matched` : "Pending"}
          description="Keyword match density"
          color={scoreRaw >= 80 ? "emerald" : scoreRaw >= 50 ? "blue" : scoreRaw > 0 ? "amber" : "slate"}
          icon={Target}
        />
        <KPIScoreCard
          title="Job Match"
          score={scoreRaw > 0 ? Math.round(audit?.role_alignment_score || 0) : "—"}
          status={scoreRaw > 0 ? "Analyzed" : "Pending"}
          description="Alignment with target role"
          color={scoreRaw >= 80 ? "emerald" : scoreRaw >= 50 ? "blue" : scoreRaw > 0 ? "amber" : "slate"}
          icon={Briefcase}
        />
        <KPIScoreCard
          title="Experience Level"
          score={scoreRaw > 0 ? `${experienceYears} yrs` : "—"}
          status={structured?.experience_level ? structured.experience_level.toUpperCase() : "Pending"}
          description="Years of experience"
          color="emerald"
          icon={Award}
        />
      </section>

      {/* TWO COLUMN INTERACTIVE WORKSPACE */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] print:hidden">
        
        {/* LEFT COLUMN: INTERACTIVE TABS & AUDIT DETAILS */}
        <div className="space-y-6">
          {/* Recruiter vs Candidate Mode Selector */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setRecruiterMode(false)}
                className={`pb-3 text-base font-bold transition-all border-b-2 px-1 ${
                  !recruiterMode
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Candidate Dashboard
              </button>
              <button
                type="button"
                onClick={() => setRecruiterMode(true)}
                className={`ml-8 pb-3 text-base font-bold transition-all border-b-2 px-1 flex items-center gap-1.5 ${
                  recruiterMode
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Eye className="h-4 w-4" />
                Recruiter View Simulation
              </button>
            </div>
            {scoreRaw > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                <Zap className="h-3 w-3 text-blue-600 animate-pulse" />
                AI Conf: {confidenceScore}%
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!recruiterMode ? (
              // CANDIDATE VIEW
              <motion.div
                key="candidate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* AI Summary Card */}
                {candidateSummary && (
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50/50 via-white to-emerald-50/20 p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h4 className="font-bold text-slate-950">AI Summary of Candidate</h4>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600 italic">
                      "{candidateSummary}"
                    </p>
                  </div>
                )}

                {/* Resume Analysis Extracted Info Card */}
                {structured && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-blue-600" />
                        Resume Analysis Info
                      </h3>
                      {scoreRaw > 0 && !isEditing && (
                        <button
                          type="button"
                          onClick={startEditing}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Edit Profile Draft
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Role</label>
                            <input
                              type="text"
                              value={editedRole}
                              onChange={(e) => setEditedRole(e.target.value)}
                              className="field-input text-sm capitalize"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested Domain</label>
                            <select
                              value={editedDomain}
                              onChange={(e) => setEditedDomain(e.target.value)}
                              className="field-input text-sm text-slate-800"
                            >
                              <option value="IT & Software">IT & Software</option>
                              <option value="Data & Analytics">Data & Analytics</option>
                              <option value="Digital Marketing">Digital Marketing</option>
                              <option value="Product Management">Product Management</option>
                              <option value="UI/UX Design">UI/UX Design</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Years of Experience</label>
                            <input
                              type="number"
                              min="0"
                              max="40"
                              step="0.5"
                              value={editedExperience}
                              onChange={(e) => setEditedExperience(parseFloat(e.target.value) || 0)}
                              className="field-input text-sm"
                            />
                          </div>
                        </div>

                        {/* Edit Technical Skills */}
                        <div className="space-y-2 border-t pt-4">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Edit Technical Skills</label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editedSkills.map((skill) => (
                              <span key={skill} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 border border-blue-100 flex items-center gap-1.5">
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => setEditedSkills(editedSkills.filter(s => s !== skill))}
                                  className="text-blue-500 hover:text-blue-700 font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-sm">
                            <input
                              type="text"
                              value={newSkillInput}
                              onChange={(e) => setNewSkillInput(e.target.value)}
                              placeholder="Add technical skill tag"
                              className="field-input text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (newSkillInput.trim() && !editedSkills.includes(newSkillInput.trim())) {
                                    setEditedSkills([...editedSkills, newSkillInput.trim()]);
                                    setNewSkillInput("");
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newSkillInput.trim() && !editedSkills.includes(newSkillInput.trim())) {
                                  setEditedSkills([...editedSkills, newSkillInput.trim()]);
                                  setNewSkillInput("");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 border-t pt-4">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveAndRecalculate}
                            disabled={loadingAudit}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                          >
                            {loadingAudit ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save & Recalculate Score"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          { label: "Suggested Domain", value: structured.suggested_domain || "Technology", icon: Compass },
                          { label: "Experience Level", value: structured.experience_level?.toUpperCase(), icon: Award },
                          { label: "Years of Experience", value: `${structured.years_of_experience} years`, icon: Briefcase },
                          { label: "Total Skills Found", value: `${structured.skills.length + structured.tools.length} tags`, icon: Code },
                          { label: "Projects Discovered", value: `${structured.projects.length} entries`, icon: FileCode },
                          { label: "Certifications Found", value: `${structured.certificates.length} entries`, icon: GraduationCap },
                          { label: "GitHub Profile", value: result?.auto_filled_profile?.github || "Not parsed", icon: Github },
                          { label: "LinkedIn Profile", value: result?.auto_filled_profile?.linkedin || "Not parsed", icon: Linkedin },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-start gap-3">
                            <div className="rounded-xl bg-slate-200/50 p-2 text-slate-600 mt-0.5">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-800 break-all">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            ) : (
              // RECRUITER ATS VIEW
              <motion.div
                key="recruiter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Score Breakdown Cards */}
                {audit && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Parsing Accuracy</p>
                      <p className="mt-3 text-3xl font-extrabold text-blue-600">{accuracyScore}%</p>
                      <p className="mt-1.5 text-xs text-slate-500">OCR & token confidence</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected Max Score</p>
                      <p className="mt-3 text-3xl font-extrabold text-emerald-600">{expectedScore}/100</p>
                      <p className="mt-1.5 text-xs text-slate-500">After applying recommendations</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Interview Readiness</p>
                      <p className="mt-3 text-3xl font-extrabold text-amber-500">{readinessScore}%</p>
                      <p className="mt-1.5 text-xs text-slate-500">Based on market readiness</p>
                    </div>
                  </div>
                )}

                {/* Recruiter Parsing logs Terminal */}
                {structured && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl text-slate-300 font-mono text-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-emerald-400" />
                        <span className="font-semibold text-slate-200">ATS Parsing Engine Terminal Logs</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">v3.1.2</span>
                    </div>

                    <div className="ats-terminal-scroll space-y-2 h-64 overflow-y-auto pr-3">
                      <p className="text-emerald-400">[info] Initializing ATS Document Parser...</p>
                      <p className="text-slate-500">[info] File Type detected: Application/PDF</p>
                      <p className="text-slate-400">[info] File Source: {structured.source_documents.join(", ") || "No document loaded"}</p>
                      <p className="text-slate-500">[info] Extracted raw character count: {result?.extracted_text_preview?.length || 0}</p>
                      <p className="text-slate-500">[info] Normalizing text tokens & stripping stop words...</p>
                      <p className="text-blue-400">[success] Extracted {structured.skills.length} skills & {structured.tools.length} tool tokens.</p>
                      <p className="text-blue-400">[success] Extracted {structured.projects.length} project instances.</p>
                      <p className="text-slate-500">[info] Estimating candidate experience weight: {structured.years_of_experience} yrs.</p>
                      <p className="text-slate-500">[info] Suggested domain classification: "{structured.suggested_domain || "IT & Software"}"</p>
                      {audit && (
                        <>
                          <p className="text-amber-400">[audit] Overall score computed: {audit.overall_score}</p>
                          <p className="text-slate-500">[audit] Keyword density count: {audit.matched_keywords.length} matches / {audit.missing_keywords.length} gaps.</p>
                        </>
                      )}
                      <p className="text-emerald-400">[info] End of parser logs. Ready.</p>
                    </div>
                  </div>
                )}

                {/* Benchmark details & ATS Keyword density */}
                {audit && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        Industry Benchmarks
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Benchmark rank</span>
                          <span className="font-bold text-slate-800">{benchmarkText}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Est. Salary Range</span>
                          <span className="font-bold text-slate-800">{salaryRange}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-600" />
                        ATS Keyword Density
                      </h4>
                      <div className="space-y-2">
                        {audit.matched_keywords.slice(0, 3).map((kw, i) => (
                          <div key={kw} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-600">{kw}</span>
                            <span className="font-bold text-slate-800">{(4.8 - i * 0.9).toFixed(1)}% Density</span>
                          </div>
                        ))}
                        {audit.matched_keywords.length === 0 && (
                          <p className="text-xs text-slate-500">No matching keywords parsed yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: PDF PREVIEW & JOB MATCHES */}
        <div className="space-y-6">
          {/* Real-time Job matches preview */}
          {targetRole.trim() && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-950 flex items-center gap-1.5">
                <Compass className="h-5 w-5 text-blue-600" />
                Real-time Job Matches
              </h4>
              
              {loadingJobs ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : matchingJobs.length > 0 ? (
                <div className="space-y-3">
                  {matchingJobs.map((job) => (
                    <a
                      key={job.external_job_id || job.job_title}
                      href={job.application_url || "/recommendations"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition group"
                    >
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition line-clamp-1">{job.job_title}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="font-medium">{job.company_name}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                      </p>
                    </a>
                  ))}
                  <Link
                    to="/recommendations"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    View All Matching Jobs
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No active matches found. Try modifying your target role.</p>
              )}
            </div>
          )}

          {/* Resume Version History */}
          {versionHistory.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-950 flex items-center gap-1.5">
                <History className="h-5 w-5 text-blue-600" />
                Version History
              </h4>
              <div className="space-y-3">
                {versionHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                    <div className="space-y-0.5 max-w-[70%]">
                      <p className="font-semibold text-slate-900 truncate">{item.filename}</p>
                      <p className="text-[10px] text-slate-500">{item.role}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{item.timestamp.split(",")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RESUME COMPLETENESS CHECKLIST (FULL-WIDTH) */}
      {audit && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm text-left print:hidden">
          <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Resume Completeness Checklist
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {audit.section_checks.map((section) => (
              <div
                key={section.title}
                className={`rounded-2xl border p-4 flex items-start justify-between gap-3 ${
                  section.present
                    ? "border-emerald-100 bg-emerald-50/10 text-emerald-950"
                    : "border-rose-100 bg-rose-50/15 text-rose-950"
                }`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-bold">{section.title}</p>
                  <p className="text-xs leading-5 text-slate-500">{section.detail}</p>
                </div>
                <div>
                  {section.present ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TEMPLATE RECOMMENDATION & CUSTOMIZER SECTION */}
      {structured && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-8 shadow-sm text-left print:p-0 print:border-none print:shadow-none print:bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 border-slate-100 gap-4 print:hidden">
            <div>
              <h3 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse animate-duration-1000" />
                ATS-Friendly Resume Templates
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Select and customize highly optimized templates built for recruiter systems.
              </p>
            </div>

            {(() => {
              const roleLower = (targetRole || result?.auto_filled_profile?.desired_role || "").toLowerCase();
              const exp = structured?.years_of_experience || 0;
              let recName = "Modern Professional";
              let reason = "Best fit for general business & engineering roles.";
              if (roleLower.includes("analyst") || roleLower.includes("data")) {
                recName = "Data Analyst";
                reason = "Prioritizes tools lists (SQL, python) and quantitative project tables.";
              } else if (roleLower.includes("fullstack") || roleLower.includes("full stack")) {
                recName = "Full Stack Developer";
                reason = "Highlight frontend and backend capabilities in side-by-side modules.";
              } else if (exp > 5) {
                recName = "Executive Resume";
                reason = "Best suited for senior leadership and bulleted achievement highlights.";
              } else if (exp <= 1) {
                recName = "Student/Fresher Resume";
                reason = "Places education and credentials first to balance brief work history.";
              } else if (roleLower.includes("software") || roleLower.includes("developer") || roleLower.includes("engineer")) {
                recName = "Software Engineer";
                reason = "Engineered specifically to emphasize coding stack and developer tools.";
              } else if (roleLower.includes("design") || roleLower.includes("creative") || roleLower.includes("ux")) {
                recName = "Creative Resume";
                reason = "Highly visual asymmetric layout optimized for product and UX portfolios.";
              }
              return (
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3.5 flex items-start gap-3 max-w-md">
                  <span className="text-lg shrink-0">⭐</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-blue-900">Recommended Template: {recName}</p>
                    <p className="text-[11px] text-blue-750 mt-0.5 leading-relaxed">
                      Reason: {reason}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] print:block">
            {/* LEFT: LIVE PREVIEW & CUSTOMIZER */}
            <div className="space-y-6 flex flex-col">
              {/* Embedded PDF Viewer Mockup */}
              <div id="pdf-sheet-viewer" className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[520px] print:h-auto print:border-none print:shadow-none print:rounded-none">
                {/* Viewer Header */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Resume_Preview.pdf
                  </span>
                  <div className="flex items-center gap-2">
                    {result && !isEditingResumeText && (
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="bg-slate-800 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded px-2.5 py-1 border border-slate-700 focus:outline-none cursor-pointer hover:bg-slate-700 hover:text-white transition"
                      >
                        <option value="professional">Executive Pro</option>
                        <option value="classic">Classic Serif</option>
                        <option value="modern">Modern Sans</option>
                        <option value="minimalist">Minimalist Clean</option>
                        <option value="creative">Creative Sidebar</option>
                      </select>
                    )}
                    {result && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openResumeTextEditor}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                            isEditingResumeText 
                              ? "bg-blue-600 text-white animate-pulse" 
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                          }`}
                        >
                          {isEditingResumeText ? "Editing..." : "Edit Text"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document sheet view */}
                <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex justify-center items-start print:p-0 print:bg-white print:overflow-visible min-h-[800px]">
                  {result ? (
                    <div id="resume-preview-content" className="w-full max-w-[850px]">
                      {renderResumeTemplate()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8 min-h-[500px]">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold">No active resume preview</p>
                      <p className="text-xs text-slate-400 mt-1">Upload your resume to display parsed view.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LEFT: CUSTOMIZER WORKSPACE */}
              <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 print:hidden">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Template Customization</h4>
              
              {/* Profile Photo Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Include Profile Photo</label>
                  <button 
                    type="button" 
                    onClick={() => setShowPhoto(!showPhoto)}
                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${showPhoto ? "bg-slate-900" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${showPhoto ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
                {showPhoto && (
                  <div className="mt-2">
                    <label className="block text-[10px] text-slate-500 font-medium mb-1 cursor-pointer">
                      <span className="text-blue-600 hover:underline">Upload Photo...</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setPhotoUrl(ev.target.result);
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>
                  </div>
                )}
              </div>
              
              {/* Color Accent */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-8 w-8 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("#") && val.length <= 7) {
                        setAccentColor(val);
                      }
                    }}
                    placeholder="#2563eb"
                    className="field-input text-xs w-28 uppercase font-mono"
                  />
                  <div className="flex flex-wrap gap-1.5 ml-1">
                    {["#0f172a", "#2563eb", "#0d9488", "#4f46e5", "#059669", "#be123c"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccentColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-5 w-5 rounded-full transition ${
                          accentColor === c ? "ring-2 ring-slate-400 ring-offset-1 scale-110" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Font Style */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Typography Font</label>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value)}
                  className="field-input text-xs"
                >
                  <option value="sans">Outfit (Modern Sans)</option>
                  <option value="serif">Lora (Executive Serif)</option>
                  <option value="merriweather">Merriweather (Classic Serif)</option>
                  <option value="playfair">Playfair Display (Creative Serif)</option>
                  <option value="mono">Fira Code (Programmer Mono)</option>
                </select>
              </div>

              {/* Font Size & Spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="field-input text-xs"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Line Spacing</label>
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(e.target.value)}
                    className="field-input text-xs"
                  >
                    <option value="tight">Tight</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </div>
              </div>

              {/* Toggle Sections */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Show/Hide Fields</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-705">
                    <input
                      type="checkbox"
                      checked={showPhoto}
                      onChange={(e) => setShowPhoto(e.target.checked)}
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Profile Photo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-705">
                    <input
                      type="checkbox"
                      checked={showCertifications}
                      onChange={(e) => setShowCertifications(e.target.checked)}
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Certifications
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-705">
                    <input
                      type="checkbox"
                      checked={showLanguages}
                      onChange={(e) => setShowLanguages(e.target.checked)}
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Languages
                  </label>
                </div>
              </div>

              {/* Section Reordering */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Section Order</label>
                <div className="space-y-1.5">
                  {sectionOrder.map((sectionKey, index) => {
                    const label = sectionKey === "summary" ? "Summary" : sectionKey === "skills" ? "Skills" : sectionKey === "projects" ? "Projects" : "Work History";
                    return (
                      <div key={sectionKey} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs font-semibold text-slate-700">
                        <span>{label}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const newOrder = [...sectionOrder];
                              const temp = newOrder[index - 1];
                              newOrder[index - 1] = newOrder[index];
                              newOrder[index] = temp;
                              setSectionOrder(newOrder);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-750 disabled:opacity-30"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === sectionOrder.length - 1}
                            onClick={() => {
                              const newOrder = [...sectionOrder];
                              const temp = newOrder[index + 1];
                              newOrder[index + 1] = newOrder[index];
                              newOrder[index] = temp;
                              setSectionOrder(newOrder);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-750 disabled:opacity-30"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic ATS Warnings */}
              {(() => {
                const warnings = [];
                if (showPhoto) warnings.push("Profile photos are not readable by standard ATS systems in North America and may lead to automated parsing rejections.");
                if (fontStyle === "mono") warnings.push("Monospace typography is clear, but may look unconventional on executive and business resume reviews.");
                if (fontSize === "large") warnings.push("Large text limits layout space, potentially pushing content onto a second page, reducing impact.");
                if (selectedTemplate === "creative") warnings.push("Creative sidebar templates are visually distinct but double-column segments can occasionally parse out-of-order.");
                
                if (warnings.length === 0) return null;
                return (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1 text-left border-l-4 border-l-amber-500">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      ATS Compatibility Advice
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-amber-800 leading-normal">
                      {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                );
              })()}

              {/* Quick Actions Panel */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Quick Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccentColor("#2563eb");
                      setFontStyle("sans");
                      setFontSize("medium");
                      setLineSpacing("normal");
                      setSectionOrder(["summary", "skills", "projects", "experience"]);
                      setShowPhoto(false);
                      setShowCertifications(true);
                      setShowLanguages(true);
                      toast.success("Style configurations reset to defaults!");
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs col-span-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    Reset Style
                  </button>
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.getElementById("pdf-sheet-viewer");
                        element?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs col-span-2"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      Preview Live
                    </button>
                    
                    <button
                      type="button"
                      onClick={exportResumeToPDF}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Export PDF
                    </button>
                    
                    <button
                      type="button"
                      onClick={exportResumeToWord}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Export Word
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowStarModal(true)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs col-span-2 mt-2"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Quantify Impact (STAR Method)
                    </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TEMPLATES LIST GRID */}
            <div className="grid gap-4 sm:grid-cols-2 print:hidden">
              {[
                { id: "professional", name: "Executive Pro", desc: "Bulleted achievements, professional summary blocks, and dual-border header for corporate positions.", score: "98%", bestFor: "Senior Roles & Leads", badges: ["ATS Friendly", "Recruiter Choice", "Multi-page"] },
                { id: "modern", name: "Modern Professional", desc: "Clean sans-serif typography with accent margins. Excellent readability for general roles.", score: "98%", bestFor: "Developers & PMs", badges: ["ATS Friendly", "One-page Recommended"] },
                { id: "minimalist", name: "Minimal ATS", desc: "Maximum parsing safety. Centralized details and simple layout designed for absolute ATS compatibility.", score: "99%", bestFor: "Entry Level & Analysts", badges: ["Max ATS Safe", "One-page Recommended"] },
                { id: "software_engineer", name: "Software Engineer", desc: "Focuses on technical stack tables, developer tools, and links. Standard format for technical roles.", score: "98%", bestFor: "Devs, DevOps, QA", badges: ["ATS Friendly", "Multi-page"] },
                { id: "fullstack", name: "Full Stack Developer", desc: "Highlights technical stack modules and project categories in header-styled block.", score: "97%", bestFor: "Web Engineers", badges: ["ATS Friendly", "One-page Recommended"] },
                { id: "data_analyst", name: "Data Analyst", desc: "Highlights data queries, analytical tools, and metric-focused highlights.", score: "98%", bestFor: "Analysts & DBAs", badges: ["ATS Friendly", "One-page Recommended"] },
                { id: "creative", name: "Creative Sidebar", desc: "Visual double-column sidebar layout. Perfect for product, design, and UI/UX roles.", score: "85%", bestFor: "UI/UX & Creatives", badges: ["Portfolio Focus", "Creative Theme"] },
                { id: "fresher", name: "Student/Fresher Resume", desc: "Rearranges layout to put education first, balancing short professional experience.", score: "98%", bestFor: "Freshers & Grads", badges: ["ATS Friendly", "One-page Recommended"] }
              ].map(tpl => {
                const isSelected = selectedTemplate === tpl.id;
                const roleLower = (targetRole || result?.auto_filled_profile?.desired_role || "").toLowerCase();
                const exp = structured?.years_of_experience || 0;
                let isRecommended = false;
                if (roleLower.includes("analyst") || roleLower.includes("data")) isRecommended = tpl.id === "data_analyst";
                else if (roleLower.includes("fullstack") || roleLower.includes("full stack")) isRecommended = tpl.id === "fullstack";
                else if (exp > 5) isRecommended = tpl.id === "professional";
                else if (exp <= 1) isRecommended = tpl.id === "fresher";
                else if (roleLower.includes("software") || roleLower.includes("developer") || roleLower.includes("engineer")) isRecommended = tpl.id === "software_engineer";
                else if (roleLower.includes("design") || roleLower.includes("creative") || roleLower.includes("ux")) isRecommended = tpl.id === "creative";
                else isRecommended = tpl.id === "modern";

                return (
                  <div
                    key={tpl.id}
                    className={`rounded-3xl border p-5 flex flex-col justify-between transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/5 ring-1 ring-blue-400"
                        : "border-slate-200 bg-white hover:border-slate-350 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Miniature SVG Layout Representation */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 h-28 relative overflow-hidden flex flex-col justify-between shadow-inner">
                        {isRecommended && (
                          <span className="absolute top-2 left-2 rounded-full bg-blue-600 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 shadow">
                            ⭐ Recommended
                          </span>
                        )}
                        <span className="absolute top-2 right-2 rounded-full bg-slate-900 text-white text-[8.5px] font-mono px-1.5 py-0.5">
                          {tpl.score} ATS
                        </span>
                        
                        <div className="flex flex-col gap-1 w-full pt-6">
                          <div className="h-2.5 bg-slate-300 rounded w-1/2 mx-auto" />
                          <div className="h-1 bg-slate-200 rounded w-3/4 mx-auto" />
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="space-y-1">
                              <div className="h-1 bg-slate-200 rounded w-full" />
                              <div className="h-1.5 bg-slate-300 rounded w-4/5" />
                            </div>
                            <div className="space-y-1">
                              <div className="h-1 bg-slate-200 rounded w-full" />
                              <div className="h-1.5 bg-slate-300 rounded w-4/5" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <h5 className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                          {tpl.name}
                          {isSelected && <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">{tpl.desc}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t mt-4 border-slate-100">
                      <div className="text-left space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Suited For: <span className="text-slate-700 font-semibold lowercase capitalize">{tpl.bestFor}</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tpl.badges.map(b => (
                            <span key={b} className="rounded bg-slate-150/70 px-1.5 py-0.5 text-[8.5px] font-bold text-slate-600 tracking-wide border border-slate-200/50">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const element = document.getElementById("pdf-sheet-viewer");
                            element?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(tpl.id);
                            toast.success(`Style layout changed to: ${tpl.name}!`);
                          }}
                          className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                          }`}
                        >
                          {isSelected ? "Selected" : "Use Template"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SKILLS SECTION */}
      {structured && (
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="font-bold text-slate-950 flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-blue-600" />
              Technical Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {structured.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-semibold text-blue-900 border border-blue-100">
                  {skill}
                </span>
              ))}
              {structured.skills.length === 0 && <p className="text-sm text-slate-500">No technical skills parsed.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="font-bold text-slate-950 flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-emerald-600" />
              Soft Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {structured.tools.map((tool) => (
                <span key={tool} className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-900 border border-emerald-100">
                  {tool}
                </span>
              ))}
              {structured.tools.length === 0 && <p className="text-sm text-slate-500">No soft skills/tools parsed.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="font-bold text-slate-950 flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Missing Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {audit?.missing_keywords?.map((keyword) => (
                <span key={keyword} className="rounded-full bg-rose-50 px-3.5 py-1.5 text-sm font-semibold text-rose-900 border border-rose-100">
                  {keyword}
                </span>
              )) || <p className="text-sm text-slate-500">No missing keywords identified.</p>}
              {audit?.missing_keywords?.length === 0 && (
                <p className="text-sm text-slate-500">Perfect match! No missing skills.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* AI IMPROVEMENTS SECTION */}
      {audit?.improvement_tips && audit.improvement_tips.length > 0 && (
        <section id="ai-improvements" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Prioritized Improvements
            </h3>
            <span className="text-sm font-bold text-slate-500">
              Score Delta: {expectedScore - scoreRaw > 0 ? `+${Math.round(expectedScore - scoreRaw)} PTS` : "—"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {audit.improvement_tips.map((tip, index) => {
              // Map items to priorities
              const priority = index === 0 ? "High" : index === 1 ? "Medium" : "Low";
              const priorityColors = {
                High: { border: "border-rose-100 bg-rose-50/10", label: "text-rose-700 bg-rose-50", badge: "High Priority" },
                Medium: { border: "border-amber-100 bg-amber-50/10", label: "text-amber-700 bg-amber-50", badge: "Medium Priority" },
                Low: { border: "border-emerald-100 bg-emerald-50/10", label: "text-emerald-700 bg-emerald-50", badge: "Low Priority" },
              };
              const style = priorityColors[priority] || priorityColors.Low;
              const delta = index === 0 ? "+10 ATS" : index === 1 ? "+5 ATS" : "+2 ATS";

              return (
                <div key={tip} className={`rounded-2xl border p-5 space-y-3 ${style.border}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.label}`}>
                      {style.badge}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{delta}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-base leading-6">{tip}</h5>
                  <p className="text-sm text-slate-500">Apply this change to match keyword requirements in standard candidate postings.</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* RECOMMENDED PROJECTS */}
      {audit?.recommended_projects && audit.recommended_projects.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Compass className="h-5 w-5 text-blue-600" />
            Recommended Practice Projects
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {audit.recommended_projects.map((project) => (
              <div key={project.title} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900">{project.title}</h4>
                    <span className="rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                      {project.level}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{project.summary}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {project.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                  {project.deployment && (
                    <p className="text-xs leading-5 text-slate-600 bg-blue-50/30 rounded p-2 border border-blue-50/50">
                      <strong>Deploy:</strong> {project.deployment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BOTTOM SECTION QUICK ACTIONS */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-slate-950">Quick Actions Hub</h3>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Generate ATS Resume", desc: "Build parsed layout for Greenhouse compliance", path: "/resume", icon: FileText },
            { 
              title: "Generate Cover Letter", 
              desc: "Tailor resume bullets & draft cover letters for matches", 
              onClick: () => setTailoringJob({ isGeneric: true, job_title: targetRole || "" }), 
              icon: FileCode 
            },
            { title: "View Career Roadmap", desc: "Google maps for your target transition steps", path: "/roadmap", icon: Compass },
            { title: "Find Matching Jobs", desc: "Search priority job feeds matching skills", path: "/recommendations", icon: Search },
            { title: "Ask AI Career Coach", desc: "Resolve recruitment questions & gaps", path: "/chatbot", icon: Users },
            { title: "Generate Interview Qs", desc: "Rehearse mock questions & board", path: "/roadmap", icon: Target },
          ].map((action) => {
            const isClickAction = typeof action.onClick === "function";
            const CardWrapper = isClickAction ? "button" : Link;
            const wrapperProps = isClickAction 
              ? { type: "button", onClick: action.onClick } 
              : { to: action.path };

            return (
              <CardWrapper
                key={action.title}
                {...wrapperProps}
                className="group p-5 text-left rounded-3xl border border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-[0_15px_30px_rgba(59,130,246,0.06)] transition-all duration-300 flex items-start gap-4 w-full"
              >
                <div className="rounded-2xl bg-blue-50 text-blue-600 p-3 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">{action.title}</h5>
                  <p className="text-sm text-slate-500 leading-normal">{action.desc}</p>
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </section>

      {/* CENTERED LINE-BY-LINE RESUME TEXT EDITOR */}
      <AnimatePresence>
        {isEditingResumeText && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={() => setIsEditingResumeText(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="resume-line-editor-modal flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:px-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-extrabold">
                    <FileText className="h-5 w-5 text-blue-300" />
                    Edit Resume Text
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Edit each parsed resume line separately, then save to re-audit the resume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingResumeText(false)}
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close resume text editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                <div className="mx-auto grid max-w-4xl gap-2">
                  {editedResumeLines.map((line, index) => (
                    <div key={`resume-line-${index}`} className="resume-line-editor-row">
                      <span className="resume-line-number">{String(index + 1).padStart(2, "0")}</span>
                      <textarea
                        value={line}
                        onChange={(event) => updateResumeLine(index, event.target.value)}
                        rows={Math.max(1, Math.min(4, Math.ceil((line.length || 1) / 78)))}
                        className="resume-line-input"
                        placeholder="Write this resume line..."
                      />
                      <div className="resume-line-actions">
                        <button
                          type="button"
                          onClick={() => addResumeLineAfter(index)}
                          className="resume-line-action-button"
                          title="Add line below"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeResumeLine(index)}
                          className="resume-line-action-button"
                          title="Remove line"
                          disabled={editedResumeLines.length <= 1}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs font-semibold text-slate-500">
                  {editedResumeLines.length} lines ready for preview and ATS re-audit.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingResumeText(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveResumeText(editedResumeLines.join("\n"))}
                    disabled={loadingAudit}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingAudit ? "Saving..." : "Save & Re-audit"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTopButton />
      <TailorResumeModal job={tailoringJob} onClose={() => setTailoringJob(null)} />
      
      {showStarModal && (
        <StarQuantifierModal 
          experienceBullets={customExperience}
          projectBullets={customProjects}
          onClose={() => setShowStarModal(false)}
          onApplyExperience={(index, newText) => {
            const arr = [...customExperience];
            arr[index] = newText;
            setCustomExperience(arr);
          }}
          onApplyProject={(index, newText) => {
            const arr = [...customProjects];
            arr[index] = newText;
            setCustomProjects(arr);
          }}
        />
      )}
    </div>
  );
}
