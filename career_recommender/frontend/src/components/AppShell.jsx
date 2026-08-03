import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Bot,
  Bookmark,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Map,
  Menu,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemePanel from "./ThemePanel";
import GlobalSearch from "./GlobalSearch";

const publicNavItems = [{ label: "Dashboard", to: "/", Icon: LayoutDashboard }];
const privateNavItems = [
  { label: "Dashboard", to: "/dashboard", Icon: LayoutDashboard },
  { label: "Profile", to: "/profile", Icon: User },
  { label: "Recommendations", to: "/recommendations", Icon: Sparkles },
  { label: "Skill Gap", to: "/skill-gap", Icon: Lightbulb },
  { label: "Roadmap", to: "/roadmap", Icon: Map },
  { label: "Resume", to: "/resume", Icon: FileText },
  { label: "Bookmarks", to: "/bookmarks", Icon: Bookmark },
  { label: "AI Mentor", to: "/chatbot", Icon: Bot },
];

function profileStorageKey(user, key) {
  return `career_profile_${user?.id || user?.email || "local"}_${key}`;
}

export default function AppShell({ children }) {
  const { user, logout = () => {} } = useAuth() || {};
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("nextstep-sidebar-collapsed") === "true";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const profileRef = useRef(null);
  const navItems = user ? privateNavItems : publicNavItems;
  const shellWidthClass = user ? "mx-auto w-full max-w-none px-3 sm:px-5 lg:px-6 pb-2" : "mx-auto w-full max-w-7xl px-3 sm:px-5 lg:px-6 pb-2";
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Guest";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AI";
  const currentPageTitle = useMemo(() => {
    const item = navItems.find((navItem) => {
      return location.pathname === navItem.to;
    });
    return item?.label || "Dashboard";
  }, [location.pathname, navItems]);
  const isNavItemActive = (to) => {
    return location.pathname === to;
  };

  useEffect(() => {
    window.localStorage.setItem("nextstep-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`shell-layout ${isSidebarCollapsed ? "is-collapsed" : "is-expanded"} ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
      {isMobileMenuOpen && (
        <div 
          className="shell-mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)} 
          aria-hidden="true" 
        />
      )}
      <aside className="shell-sidebar print:hidden" aria-label="Primary navigation">
        <div className="shell-sidebar-brand-row">
          <NavLink to="/" className="shell-sidebar-brand" title={isSidebarCollapsed ? "Next Step AI" : undefined}>
            <span className="shell-logo-mark" aria-hidden="true">
              <img src="/images/next-step-ai-logo.png" alt="" />
            </span>
            <span className="shell-sidebar-brand-copy">
              <span className="shell-brand-kicker">Next Step AI</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="shell-sidebar-toggle hidden md:flex"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={isSidebarCollapsed ? "Open navigation" : "Close navigation"}
            aria-pressed={!isSidebarCollapsed}
            title={isSidebarCollapsed ? "Open navigation" : "Close navigation"}
          >
            <span className="shell-sidebar-toggle-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <button 
            type="button" 
            className="shell-mobile-close md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <nav className="shell-sidebar-nav" aria-label="Main menu">
          {navItems.map(({ label, to, Icon }) => (
            <NavLink
              key={`${label}-${to}`}
              to={to}
              title={isSidebarCollapsed ? label : undefined}
              className={`shell-sidebar-link ${isNavItemActive(to) ? "active" : ""}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="shell-sidebar-label">{label}</span>
              <span className="shell-sidebar-tooltip" role="tooltip">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-sidebar-footer">
          {user ? (
            <div className="shell-profile-menu" ref={profileRef}>
              <button
                type="button"
                className="shell-profile-trigger"
                onClick={() => setIsProfileOpen((open) => !open)}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
                title={isSidebarCollapsed ? displayName : undefined}
              >
                <span className="shell-user-avatar" aria-hidden="true">
                  {profilePhoto ? <img src={profilePhoto} alt="" /> : initials}
                </span>
                <span className="shell-user-name">{displayName}</span>
                <ChevronDown className="h-4 w-4 shell-profile-chevron" aria-hidden="true" />
              </button>
              <div className={`shell-profile-dropdown ${isProfileOpen ? "open" : ""}`} role="menu">
                <div className="shell-profile-summary">
                  <span className="shell-user-avatar" aria-hidden="true">
                    {profilePhoto ? <img src={profilePhoto} alt="" /> : initials}
                  </span>
                  <span>
                    <strong>{displayName}</strong>
                    <small>{user.email}</small>
                  </span>
                </div>
                <NavLink to="/profile" className="shell-dropdown-item" role="menuitem" onClick={() => setIsProfileOpen(false)}>
                  <User className="h-4 w-4" aria-hidden="true" />
                  Profile
                </NavLink>
                <button type="button" className="shell-dropdown-item danger" onClick={() => {
                  if (window.confirm("Are you sure you want to log out?")) {
                    logout();
                  }
                }} role="menuitem">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <NavLink to="/login" className="shell-login-link">
              Login
            </NavLink>
          )}
        </div>
      </aside>

      <div className="shell-workspace">
        <header className="shell-topbar print:hidden">
          <div className="shell-topbar-left flex items-center gap-2">
            <button
              type="button"
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="shell-page-title">{currentPageTitle}</h1>
          </div>

          <div className="shell-topbar-actions">
            <GlobalSearch />
            <ThemePanel compact />
          </div>
        </header>

        <div className={`${shellWidthClass} shell-content-frame`}>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
