import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuggestionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group relative flex h-[100px] w-full flex-col justify-center rounded-[20px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-5 text-left shadow-sm transition-all duration-300 hover:border-blue-600/30 dark:hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-600/5 dark:hover:shadow-blue-500/10"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex flex-1 flex-col pr-6">
          <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">{title}</span>
          {subtitle && (
            <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 text-blue-600 dark:text-blue-400">
        <ArrowRight className="h-5 w-5" />
      </div>
    </motion.button>
  );
}
