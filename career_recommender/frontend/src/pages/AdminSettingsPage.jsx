import { useState } from "react";
import { Lock, Save, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import client from "../api/client";

export default function AdminSettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !adminPassword.trim()) {
      setStatus("error");
      setMessage("Both fields are required.");
      return;
    }

    setStatus("loading");
    try {
      const response = await client.post("/admin/config/openai", {
        api_key: apiKey.trim(),
        admin_password: adminPassword.trim()
      });
      
      setStatus("success");
      setMessage(response.data.message || "API key updated successfully!");
      setApiKey(""); // Clear it for security
      setAdminPassword(""); // Clear it for security
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.response?.data?.detail || "Failed to update API key.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <div className="bg-slate-900 px-6 py-8 text-center sm:px-12 dark:bg-slate-950">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/30">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Configuration</h1>
          <p className="mt-2 text-sm text-slate-400">Secret admin panel for environment variables.</p>
        </div>
        
        <div className="px-6 py-8 sm:px-12">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Admin Password
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="password"
                  id="admin-password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (status !== 'idle') setStatus('idle');
                  }}
                  className="block w-full rounded-xl border-0 py-3 pl-10 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-slate-900 dark:text-white dark:ring-slate-700 dark:focus:ring-blue-500"
                  placeholder="Enter admin password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="api-key" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                OpenAI API Key
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="password"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (status !== 'idle') setStatus('idle');
                  }}
                  className="block w-full rounded-xl border-0 py-3 pl-10 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-slate-900 dark:text-white dark:ring-slate-700 dark:focus:ring-blue-500"
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !apiKey.trim() || !adminPassword.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              <Save className="h-4 w-4" />
              {status === "loading" ? "Saving Configuration..." : "Save Configuration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
