import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { validateRealEmail } from "../utils/authValidation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const emailError = validateRealEmail(form.email);
    if (emailError) {
      setMessage(emailError);
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.append("username", form.email);
      params.append("password", form.password);
      const { data } = await client.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      login(data);
      navigate("/dashboard");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Unable to login."));
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-6 py-10">
      <section className="w-full max-w-4xl card-panel">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide">Welcome back</p>
      <h2 className="mt-3 font-display text-4xl font-bold text-slate-950">Sign in to your career cockpit</h2>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="field-label">Email</label>
          <input type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} className="field-input pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
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
        <button type="submit" className="primary-button">Sign in</button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        New here? Use the{" "}
        <Link to="/signup" className="font-semibold text-tide underline underline-offset-4">
          signup page
        </Link>{" "}
        to create an account with a real email address.
      </p>
      </section>
    </main>
  );
}
