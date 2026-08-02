import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client, { getApiErrorMessage } from "../api/client";
import { 
  X, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  FileCheck,
  AlertCircle,
  Download,
  Bot
} from "lucide-react";
import CareerRoadmap from "./CareerRoadmap";

export default function TailorResumeModal({ job, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("bullets");
  const [isMissingResume, setIsMissingResume] = useState(false);
  const [copiedBullets, setCopiedBullets] = useState({});
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [minTargetWords, setMinTargetWords] = useState(200);
  const [maxTargetWords, setMaxTargetWords] = useState(400);
  const [loadingStep, setLoadingStep] = useState(0);

  // Custom Form States for Generic/Workstation mode
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  
  const wordCount = result?.cover_letter ? result.cover_letter.trim().split(/\s+/).length : 0;

  const loadingSteps = [
    "Analyzing resume format and style...",
    "Scanning job description requirements...",
    "Identifying keyword gaps and priority skills...",
    "Rewriting accomplishments for optimal ATS score...",
    "Drafting customized cover letter...",
    "Polishing suggestions and calculating readiness..."
  ];

  // Initialize form or run auto-tailor on mount
  useEffect(() => {
    if (!job) return;

    if (job.isGeneric) {
      setCustomTitle(job.job_title || "");
      setCustomCompany(job.company_name || "");
      setCustomDesc(job.job_description || "");
      setFormSubmitted(false);
      setResult(null);
      setError(null);
    } else {
      setFormSubmitted(true);
      runTailoring(
        job.job_title || job.title || "Target Role",
        job.company_name || job.company || "Target Company",
        job.job_summary || job.job_description || job.description || ""
      );
    }
  }, [job]);

  const runTailoring = async (title, company, description) => {
    setLoading(true);
    setError(null);
    setIsMissingResume(false);
    setCopiedBullets({});
    setCopiedCoverLetter(false);
    setLoadingStep(0);

    // Animate loading text
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      if (!description.trim()) {
        throw new Error("Job description is empty. Cannot tailor resume without job requirements.");
      }

      const { data } = await client.post("/resume/tailor", {
        job_title: title,
        company_name: company,
        job_description: description
      });

      setResult(data);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      if (err.response?.status === 400 && msg.toLowerCase().includes("resume")) {
        setIsMissingResume(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      clearInterval(interval);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!customDesc.trim()) {
      setError("Job description is required.");
      return;
    }
    setFormSubmitted(true);
    runTailoring(customTitle, customCompany, customDesc);
  };

  if (!job) return null;

  const jobTitle = job.job_title || job.title || "Target Role";
  const companyName = job.company_name || job.company || "Target Company";

  const handleCopyBullet = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedBullets((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setCopiedBullets((prev) => ({ ...prev, [index]: false }));
    }, 2000);
  };

  const handleCopyCoverLetter = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCoverLetter(true);
    setTimeout(() => {
      setCopiedCoverLetter(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col rounded-[32px] border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sm:px-8">
          <div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-blue-600">
              <Sparkles className="h-3.5 w-3.5 fill-blue-100 text-blue-600" />
              AI Resume Tailor
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-slate-950">
              {formSubmitted ? (
                <>
                  {customTitle || job.job_title || job.title} at <span className="text-slate-700">{customCompany || job.company_name || job.company || "Target Company"}</span>
                </>
              ) : (
                "Resume Tailoring Workstation"
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* Setup Form for custom input (only shown if generic and not submitted yet) */}
          {job.isGeneric && !formSubmitted && (
            <form onSubmit={handleFormSubmit} className="space-y-5 max-w-3xl mx-auto py-4">
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-950">Tailor Resume for a Custom Job</h4>
                <p className="text-sm text-slate-500 leading-normal">
                  Paste the details of any external job posting below. We'll cross-reference it with your uploaded resume to suggest optimized ATS keywords, accomplishments, and draft a cover letter.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="modal-job-title">
                    Target Job Title *
                  </label>
                  <input
                    id="modal-job-title"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Backend Developer Intern"
                    className="field-input rounded-xl text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="modal-company">
                    Company Name
                  </label>
                  <input
                    id="modal-company"
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="field-input rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="modal-desc">
                  Job Description *
                  <span className="normal-case font-medium text-slate-400 ml-1">(Paste requirements & duties here)</span>
                </label>
                <textarea
                  id="modal-desc"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Paste the full job description or requirements here..."
                  className="field-input rounded-xl text-sm min-h-[200px] leading-relaxed resize-y"
                  required
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-3">
                <Link
                  to="/recommendations"
                  onClick={onClose}
                  className="secondary-button border-blue-200 text-blue-700 bg-blue-55 hover:bg-blue-50 rounded-xl px-5 py-2.5 font-bold text-sm inline-flex items-center justify-center gap-1.5"
                >
                  Or choose a recommended job
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="secondary-button rounded-xl px-5 py-2.5 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button rounded-xl px-5 py-2.5 font-bold text-sm inline-flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze & Tailor
                </button>
              </div>
            </form>
          )}

          {/* Loading View */}
          {loading && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center py-12">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-[3px] border-slate-100 border-t-blue-600 animate-spin" />
                <Sparkles className="absolute h-6 w-6 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900 transition-all duration-300">
                  {loadingSteps[loadingStep]}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Using your uploaded resume text
                </p>
              </div>
            </div>
          )}

          {/* Missing Resume Screen */}
          {isMissingResume && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center py-12">
              <div className="rounded-full bg-orange-50 p-4 border border-orange-100">
                <AlertTriangle className="h-10 w-10 text-orange-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-950">Resume Required</h4>
                <p className="text-sm leading-6 text-slate-600">
                  We couldn't find a resume attached to your profile. Please upload a PDF resume first so the AI can extract your background and tailor it to this job description.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="secondary-button rounded-xl px-5 py-2.5"
                >
                  Cancel
                </button>
                <Link
                  to="/resume"
                  className="primary-button rounded-xl px-5 py-2.5 inline-flex items-center gap-1.5"
                >
                  Upload Resume
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Optimization Error Screen */}
          {error && !loading && !isMissingResume && formSubmitted && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 max-w-md mx-auto text-center py-12">
              <div className="rounded-full bg-rose-50 p-4 border border-rose-100">
                <AlertTriangle className="h-10 w-10 text-rose-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-950">Optimization Failed</h4>
                <p className="text-sm leading-6 text-slate-600">{error}</p>
              </div>
              <div className="flex gap-3">
                {job.isGeneric && (
                  <button
                    type="button"
                    onClick={() => setFormSubmitted(false)}
                    className="secondary-button rounded-xl px-5 py-2.5 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Modify Form
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="primary-button rounded-xl px-5 py-2.5"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* Success Content View */}
          {result && !loading && formSubmitted && (
            <div className="space-y-6 animate-fadeIn">
              {/* ATS Scores */}
              <div className="grid gap-4 md:grid-cols-3">
                
                {/* Score Card Before */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Original ATS Match</span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-600">{result.ats_score_before}%</span>
                    <span className="text-xs text-slate-400 font-medium">score</span>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${result.ats_score_before}%` }} />
                  </div>
                </div>

                {/* Score Card After */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700">Tailored ATS Match</span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-blue-700">{result.ats_score_after}%</span>
                    <span className="text-xs text-blue-500 font-medium">estimated</span>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${result.ats_score_after}%` }} />
                  </div>
                </div>

                {/* Strategy Summary */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between md:col-span-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tailoring Strategy</span>
                  <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-3">
                    {result.tailored_summary}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                    <FileCheck className="h-3.5 w-3.5" />
                    Keywords optimized
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("bullets")}
                  className={`pb-3 text-sm font-bold tracking-tight border-b-2 px-1 transition-all ${
                    activeTab === "bullets"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Optimized Bullets ({result.tailored_bullets?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cover")}
                  className={`ml-8 pb-3 text-sm font-bold tracking-tight border-b-2 px-1 transition-all ${
                    activeTab === "cover"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Custom Cover Letter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("keywords")}
                  className={`ml-8 pb-3 text-sm font-bold tracking-tight border-b-2 px-1 transition-all ${
                    activeTab === "keywords"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Skill Roadmap
                </button>
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                {activeTab === "bullets" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Swap these bullet points in your current resume to emphasize missing technical skills and better match the employer's screening parser:
                    </p>
                    <div className="grid gap-4">
                      {result.tailored_bullets?.map((bullet, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                          <div className="grid md:grid-cols-2 border-b border-slate-100">
                            {/* Original */}
                            <div className="p-4 bg-slate-50/70 border-r border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original Bullet</span>
                              <p className="mt-1.5 text-sm text-slate-600 leading-6">{bullet.original}</p>
                            </div>
                            {/* Suggested */}
                            <div className="p-4 bg-blue-50/10 relative group">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">AI-Optimized Version</span>
                              <p className="mt-1.5 text-sm text-slate-900 font-medium leading-6 pr-8">{bullet.suggested}</p>
                              <button
                                type="button"
                                onClick={() => handleCopyBullet(bullet.suggested, index)}
                                className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-slate-300 hover:text-slate-900 shadow-sm transition"
                                title="Copy suggested bullet"
                              >
                                {copiedBullets[index] ? (
                                  <Check className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-start gap-2">
                            <span className="mt-0.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">Why</span>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{bullet.justification}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "cover" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                          A personalized cover letter generated specifically for {customTitle || jobTitle} at {customCompany || companyName}:
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyCoverLetter(result.cover_letter)}
                          className="secondary-button rounded-xl px-4 py-2 inline-flex items-center gap-1.5 font-semibold text-sm"
                        >
                          {copiedCoverLetter ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-600" />
                              Copied Letter
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Cover Letter
                            </>
                          )}
                        </button>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-7 shadow-inner h-[42vh] overflow-y-auto">
                        {result.cover_letter}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Optimization stats */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 shadow-sm">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Optimization stats</h4>
                          <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="text-2xl font-extrabold text-slate-900">{wordCount}</span>
                            <span className="text-xs text-slate-500 font-semibold">words</span>
                            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              wordCount >= minTargetWords && wordCount <= maxTargetWords
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {wordCount >= minTargetWords && wordCount <= maxTargetWords ? "Within Target" : "Review Length"}
                            </span>
                          </div>
                          
                          {/* Custom Target Length Inputs */}
                          <div className="mt-4 pt-3 border-t border-slate-250/60 space-y-2">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block">Custom Target Range</span>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase block" htmlFor="min-target-input">Min Words</label>
                                <input 
                                  id="min-target-input"
                                  type="number" 
                                  value={minTargetWords} 
                                  onChange={(e) => setMinTargetWords(Math.max(1, Number(e.target.value)))}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase block" htmlFor="max-target-input">Max Words</label>
                                <input 
                                  id="max-target-input"
                                  type="number" 
                                  value={maxTargetWords} 
                                  onChange={(e) => setMaxTargetWords(Math.max(1, Number(e.target.value)))}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3.5 space-y-2.5">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recruiter best practices</h5>
                          <ul className="text-xs text-slate-650 space-y-2 list-disc list-inside">
                            <li><strong className="text-slate-800">Customize Para 2:</strong> Personalize the projects paragraph with a direct link to your live code portfolio.</li>
                            <li><strong className="text-slate-800">Align Missing Skills:</strong> Highlight the gaps you are actively working on in your roadmap.</li>
                            <li><strong className="text-slate-800">Keep it Brief:</strong> Make sure paragraphs do not exceed 4-5 sentences.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Custom Template Paragraph */}
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 space-y-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <Sparkles className="h-4 w-4 fill-blue-100" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Custom paragraph template</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Swap in this highly targeted paragraph to show deep research about the employer:
                        </p>
                        <div className="relative rounded-xl border border-blue-100 bg-white p-3 font-mono text-[11px] text-slate-700 leading-relaxed shadow-sm group">
                          {`"I've been closely tracking ${customCompany || companyName}'s recent scaling challenges and technical goals. I would love to bring my expertise in ${result.original_skills_found?.[0] || 'core technologies'} to help your team optimize system performance and deploy new customer-facing assets."`}
                          <button
                            type="button"
                            onClick={() => {
                              const text = `I've been closely tracking ${customCompany || companyName}'s recent scaling challenges and technical goals. I would love to bring my expertise in ${result.original_skills_found?.[0] || 'core technologies'} to help your team optimize system performance and deploy new customer-facing assets.`;
                              navigator.clipboard.writeText(text);
                              setCopiedTemplate(true);
                              setTimeout(() => setCopiedTemplate(false), 2000);
                            }}
                            className="absolute right-2 top-2 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:border-slate-300 hover:text-slate-900 shadow-sm transition opacity-0 group-hover:opacity-100"
                            title="Copy custom paragraph"
                          >
                            {copiedTemplate ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          Hover to copy this template paragraph.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "keywords" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Career Roadmap</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Interactive visual map showing your path from current skills to your dream job requirements.
                      </p>
                    </div>
                    
                    <CareerRoadmap 
                      originalSkills={result.original_skills_found || []}
                      missingSkills={result.missing_skills_found || []}
                      targetRole={job.title || job.customTitle || "Target Role"}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8 flex justify-end gap-3 shrink-0">
          {job.isGeneric && result && !loading && (
            <button
              type="button"
              onClick={() => setFormSubmitted(false)}
              className="secondary-button rounded-xl px-5 py-2.5 font-semibold text-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Tailor Another Job
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="secondary-button rounded-xl px-5 py-2.5 font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
