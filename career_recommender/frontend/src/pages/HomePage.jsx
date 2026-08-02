import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemePanel from "../components/ThemePanel";

const featureCards = [
  "Real-time job and internship recommendations with AI ranking.",
  "Resume PDF analyzer with skill extraction and profile auto-fill.",
  "Skill gap dashboard with matched, missing, and trending skills.",
  "Personalized 30/60/90-day roadmap, projects, and interview prep.",
];

function profileStorageKey(user, key) {
  return `career_profile_${user?.id || user?.email || "local"}_${key}`;
}

export default function HomePage() {
  const auth = useAuth() || {};
  const { user, logout = () => {} } = auth;
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const navItems = [
    { label: "Dashboard", to: "/dashboard", match: "/dashboard" },
    { label: "Skill Gap", to: "/dashboard#skill-gap", match: "/dashboard#skill-gap" },
    { label: "Roadmap", to: "/roadmap", match: "/roadmap" },
    { label: "AI Mentor", to: "/chatbot", match: "/chatbot" },
  ];
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Guest";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AI";

  const isActiveItem = (item) => {
    const current = `${location.pathname}${location.hash}`;
    if (item.match.includes("#")) {
      return current === item.match;
    }
    return location.pathname === item.match && !location.hash;
  };

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const loadProfilePhoto = () => {
      setProfilePhoto(window.localStorage.getItem(profileStorageKey(user, "photo")) || "");
    };

    loadProfilePhoto();
    window.addEventListener("focus", loadProfilePhoto);
    window.addEventListener("storage", loadProfilePhoto);
    window.addEventListener("nextstep-profile-photo-updated", loadProfilePhoto);

    return () => {
      window.removeEventListener("focus", loadProfilePhoto);
      window.removeEventListener("storage", loadProfilePhoto);
      window.removeEventListener("nextstep-profile-photo-updated", loadProfilePhoto);
    };
  }, [user]);

  return (
    <main className="home-page">
      <div className="home-shell">
        <header className="home-header" aria-label="Primary navigation">
          <div className="home-header-inner">
            <Link to="/" className="home-brand-link" onClick={closeMenu}>
              <span className="home-logo-mark">
                <img src="/images/next-step-ai-logo.png" alt="" />
              </span>
              <span>
                <span className="home-brand-title">Next Step AI</span>
                <span className="home-brand-subtitle">
                  Smart guidance
                </span>
              </span>
            </Link>

            <nav className="home-nav-links" aria-label="Main menu">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={`home-nav-link ${isActiveItem(item) ? "active" : ""}`}
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="home-header-actions">
              <ThemePanel compact />
              {user ? (
                <>
                  <div className="home-user-chip" aria-label={`Signed in as ${displayName}`}>
                    <span className="home-user-avatar" aria-hidden="true">
                      {profilePhoto ? <img src={profilePhoto} alt="" /> : initials}
                    </span>
                    <span className="home-user-name">{displayName}</span>
                  </div>
                  <button type="button" onClick={() => {
                    if (window.confirm("Are you sure you want to log out?")) {
                      logout();
                    }
                  }} className="home-logout-button">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="home-login-link">
                    Login
                  </Link>
                  <Link to="/signup" className="home-logout-button home-signup-button">
                    Create account
                  </Link>
                </>
              )}
              <button
                type="button"
                className="home-menu-button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-controls="home-mobile-menu"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <nav
            id="home-mobile-menu"
            className={`home-mobile-menu ${isMenuOpen ? "open" : ""}`}
            aria-label="Mobile menu"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={`home-mobile-link ${isActiveItem(item) ? "active" : ""}`}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            {!user && (
              <div className="home-mobile-auth">
                <Link to="/login" className="home-login-link" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/signup" className="home-logout-button home-signup-button" onClick={closeMenu}>
                  Create account
                </Link>
              </div>
            )}
          </nav>
        </header>

        <section id="how-it-works" className="home-hero scroll-mt-8">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="home-eyebrow">Next Step AI</p>
              <h1>
                Navigate careers with live job data, skill intelligence, and personalized guidance.
              </h1>
              <p>
                This assistant helps students and job seekers discover real opportunities, understand exactly what skills are missing, and move from confusion to a focused action plan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="primary-button">
                  Launch your career workspace
                </Link>
                <Link to="/login" className="secondary-button">
                  Sign in
                </Link>
              </div>
            </div>
            <div className="home-hero-media">
              <div className="home-image-frame">
                <img
                  src="/images/career-hero-illustration.png"
                  alt="Illustration of an AI career assistant guiding a career path"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="home-momentum-panel">
                <p>Built for momentum</p>
                <div className="mt-6 grid gap-4">
                  {featureCards.map((feature) => (
                    <div key={feature} className="home-momentum-item">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="home-feature-grid scroll-mt-8">
          {[
            { tag: "Job Matching", title: "AI Ranking", body: "TF-IDF and cosine similarity score each job to surface the strongest matches first." },
            { tag: "Evaluation", title: "Readiness Score", body: "Skill match, experience fit, domain alignment, and relevance combine into a 0-100 score." },
            { tag: "Guidance", title: "OpenAI Mentor", body: "Ask the mentor what to learn next, which role to target, and how to prepare for interviews." },
          ].map((item) => (
            <article key={item.title} className="home-feature-card">
              <p>{item.tag}</p>
              <h2>{item.title}</h2>
              <span>{item.body}</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
