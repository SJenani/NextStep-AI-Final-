import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { validateRealEmail } from "../utils/authValidation";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showReplaceFlow, setShowReplaceFlow] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (showReplaceFlow) {
      setShowReplaceFlow(false);
      setCurrentPassword("");
    }
    if (message) {
      setMessage("");
    }
  };

  const validatePassword = (password) => {
    if (password.length < 6) return "Password must be at least 6 characters long.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) {
      return "Password must include at least one special character (e.g., @ # $ % & * !).";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    const emailError = validateRealEmail(form.email);
    if (emailError) {
      setMessage(emailError);
      return;
    }
    const pwdError = validatePassword(form.password);
    if (pwdError) {
      setMessage(pwdError);
      return;
    }
    try {
      const { data } = await client.post("/auth/signup", form);
      login(data);
      navigate("/dashboard");
    } catch (error) {
      const detail = getApiErrorMessage(error, "Unable to create account.");
      setShowReplaceFlow(detail === "Email already registered.");
      setMessage(
        detail === "Email already registered."
          ? "This email is already registered. If it is your account, enter the current password below to delete the old account and create a fresh one with the new password."
          : detail,
      );
    }
  };

  const handleReplaceAccount = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !currentPassword.trim()) {
      setMessage("Enter full name, email, new password, and the current password to replace this account.");
      return;
    }

    const emailError = validateRealEmail(form.email);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    const pwdError = validatePassword(form.password);
    if (pwdError) {
      setMessage(pwdError);
      return;
    }

    setMessage("");
    try {
      const { data } = await client.post("/auth/replace-account", {
        full_name: form.full_name,
        email: form.email,
        current_password: currentPassword,
        new_password: form.password,
      });
      login(data);
      navigate("/dashboard");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Unable to replace account."));
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-6 py-10">
      <section className="w-full max-w-5xl card-panel">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">Create account</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-slate-950">Start your AI-guided job search</h2>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="field-label">Full name</label>
                <input
                  className="field-input"
                  value={form.full_name}
                  onChange={(e) => updateForm("full_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field-input"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="field-input pr-10"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {message && <p className="text-sm font-semibold text-rose-600">{message}</p>}
              <button type="submit" className="primary-button">Create account</button>
            </form>
            <p className="mt-5 text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-tide underline underline-offset-4">
                Sign in
              </Link>
              .
            </p>
            {showReplaceFlow && (
              <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6">
                <h3 className="font-display text-2xl font-semibold text-slate-950">Replace existing account</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  This will permanently remove the old account for this email, including saved profile data, bookmarks,
                  alerts, and interview recordings, then create a new account with the details above.
                </p>
                <div className="mt-5">
                  <label className="field-label">Current password for this email</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className="field-input pr-10"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required={showReplaceFlow}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReplaceAccount}
                  className="secondary-button mt-5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!currentPassword.trim()}
                >
                  Delete old account and create this one
                </button>
              </div>
            )}
          </div>
          <img
            src="/images/auth-people.png"
            alt=""
            aria-hidden="true"
            className="mx-auto hidden max-h-[430px] w-full max-w-[300px] select-none object-contain lg:block"
          />
        </div>
      </section>
    </main>
  );
}
