import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, User, Sparkles, Lightbulb, Map, FileText, Bookmark, Bot } from 'lucide-react';

const SEARCH_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard, keywords: ['home', 'main', 'overview'] },
  { label: 'Profile', to: '/profile', Icon: User, keywords: ['settings', 'account', 'me'] },
  { label: 'Recommendations', to: '/recommendations', Icon: Sparkles, keywords: ['jobs', 'matches', 'opportunities'] },
  { label: 'Skill Gap', to: '/skill-gap', Icon: Lightbulb, keywords: ['skills', 'missing', 'learning'] },
  { label: 'Roadmap', to: '/roadmap', Icon: Map, keywords: ['path', 'plan', 'mock interview', 'practice'] },
  { label: 'Resume', to: '/resume', Icon: FileText, keywords: ['cv', 'upload', 'update resume'] },
  { label: 'Bookmarks', to: '/bookmarks', Icon: Bookmark, keywords: ['saved jobs', 'favorites', 'tracker'] },
  { label: 'AI Mentor', to: '/chatbot', Icon: Bot, keywords: ['chat', 'help', 'ask', 'assistant'] },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const filteredItems = SEARCH_ITEMS.filter(item => {
    const lowerQuery = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        navigate(filteredItems[selectedIndex].to);
        setIsOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative z-50 w-40 sm:w-64 lg:w-80" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages & actions..."
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-800"
        />
      </div>

      {isOpen && query.trim() !== '' && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {filteredItems.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-2">
              {filteredItems.map((item, index) => (
                <li key={item.to}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(item.to);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <item.Icon className={`h-4 w-4 ${index === selectedIndex ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
