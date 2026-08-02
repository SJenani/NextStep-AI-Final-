import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('career_theme') || 'light';
    setTheme(saved);
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('career_theme', next);
    
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
      aria-label="Toggle theme"
    >
      <motion.div
        animate={{
          backgroundColor: theme === 'light' ? '#2563eb' : 'transparent',
          color: theme === 'light' ? '#ffffff' : '#64748b'
        }}
        className="rounded-full p-1.5 transition-colors"
      >
        <Sun className="h-4 w-4" />
      </motion.div>
      <motion.div
        animate={{
          backgroundColor: theme === 'dark' ? '#2563eb' : 'transparent',
          color: theme === 'dark' ? '#ffffff' : '#64748b'
        }}
        className="rounded-full p-1.5 transition-colors"
      >
        <Moon className="h-4 w-4" />
      </motion.div>
    </button>
  );
}
