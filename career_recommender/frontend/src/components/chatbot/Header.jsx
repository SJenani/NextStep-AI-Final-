import { Menu, X, LayoutDashboard } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { sidebarOpen, setSidebarOpen, profile } = useChat();

  return (
    <header className="sticky top-0 z-10 flex h-[80px] shrink-0 items-center justify-between bg-white/80 dark:bg-slate-900/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-sm">
        <img src="/images/next-step-ai-logo.png" alt="Next Step AI Logo" className="h-10 w-10 object-contain rounded-full bg-night" />
        <span className="text-[13px] font-black tracking-[0.15em] text-gray-900 dark:text-white uppercase pl-1 pr-3">
          NEXT STEP AI
        </span>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <NavLink
          to="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm transition-all hover:border-gray-200 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-md"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        <ThemeToggle />
      </div>
    </header>
  );
}
