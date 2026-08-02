import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, ArrowRight, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

export default function StarQuantifierModal({ 
  experienceBullets = [], 
  projectBullets = [], 
  onClose, 
  onApplyExperience, 
  onApplyProject 
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [applied, setApplied] = useState({});

  useEffect(() => {
    async function runAudit() {
      const allBullets = [...experienceBullets, ...projectBullets].filter(b => b && b.trim().length > 0);
      
      if (allBullets.length === 0) {
        setResults([]); // Empty results
        return;
      }
      
      setLoading(true);
      try {
        const response = await client.post('/resume/star-audit', {
          bullets: allBullets
        });
        
        setResults(response.data.audits || []);
      } catch (err) {
        toast.error("Failed to quantify impact. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    runAudit();
  }, [experienceBullets, projectBullets]);

  const handleApply = (original, rewrite, index) => {
    // Find where this bullet came from
    const expIdx = experienceBullets.indexOf(original);
    if (expIdx !== -1) {
      onApplyExperience(expIdx, rewrite);
    } else {
      const projIdx = projectBullets.indexOf(original);
      if (projIdx !== -1) {
        onApplyProject(projIdx, rewrite);
      }
    }
    
    setApplied(prev => ({ ...prev, [index]: true }));
    toast.success("Applied quantified rewrite!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/30">
              <TrendingUp className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">STAR Impact Quantifier</h2>
              <p className="text-xs text-slate-400">AI is scanning your resume for weak bullets and injecting measurable impact.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Running STAR Audit on your bullets...</p>
            </div>
          ) : results && results.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-4 rounded-full mb-2">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Bullets Found</h3>
              <p className="text-sm text-slate-500 max-w-md">
                We couldn't find any experience or project bullet points on your current resume to quantify. Please add some experience or generate a resume first!
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {results && results.map((audit, index) => (
                <div 
                  key={index} 
                  className={`rounded-2xl border bg-white overflow-hidden shadow-sm transition-all duration-300 ${audit.is_weak ? 'border-rose-200 hover:border-rose-300 hover:shadow-md' : 'border-emerald-200 opacity-70'}`}
                >
                  <div className="grid md:grid-cols-2">
                    {/* Left: Original */}
                    <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        {audit.is_weak ? (
                          <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-200">Weak Impact</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200">Strong Bullet</span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${audit.is_weak ? 'text-slate-600' : 'text-slate-500'}`}>{audit.original}</p>
                      
                      {audit.is_weak && audit.critique && (
                        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-rose-700 font-medium">{audit.critique}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Suggested */}
                    <div className="p-5 relative group flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-200 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          STAR Rewrite
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed pr-10 flex-1">
                        {audit.suggested_rewrite}
                      </p>
                      
                      {audit.is_weak && (
                        <button
                          onClick={() => handleApply(audit.original, audit.suggested_rewrite, index)}
                          disabled={applied[index]}
                          className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            applied[index] 
                              ? 'bg-emerald-500 text-white shadow-inner' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {applied[index] ? (
                            <>
                              <Check className="h-4 w-4" /> Applied
                            </>
                          ) : (
                            <>
                              Apply Rewrite <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
