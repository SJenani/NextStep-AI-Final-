import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center pb-8 pt-4"
    >
      <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-600/20 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400">
        <Sparkles className="h-3.5 w-3.5" />
        AI CAREER MENTOR
      </div>
      
      <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
        What can I help<br />you with today?
      </h2>
      
      <p className="max-w-[28rem] text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
        I'm here to help you grow your career, develop your skills, and achieve your professional goals.
      </p>
    </motion.div>
  );
}
