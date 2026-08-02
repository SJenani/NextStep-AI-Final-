import { motion } from 'framer-motion';
import { Briefcase, User, TrendingUp, Sparkles, Calendar, FileText } from 'lucide-react';
import SuggestionCard from './SuggestionCard';
import { useChat } from '../../context/ChatContext';

const ICONS = [Briefcase, User, TrendingUp, Sparkles, Calendar, FileText];

// Helper to split a long prompt into title and subtitle for the card
function splitPrompt(prompt) {
  // If it's a known pattern, split it nicely
  if (prompt.includes("What skills do I need for")) {
    return { title: "What skills do I need", subtitle: prompt.replace("What skills do I need ", "") };
  }
  if (prompt.includes("Am I a good fit for")) {
    return { title: "Am I a good fit", subtitle: prompt.replace("Am I a good fit ", "") };
  }
  if (prompt.includes("Which of my skills are most in demand?")) {
    return { title: "Which of my skills are", subtitle: "most in demand?" };
  }
  if (prompt.includes("Why am I not matching more roles?")) {
    return { title: "Why am I not matching", subtitle: "more roles?" };
  }
  if (prompt.includes("Start Mock Interview")) {
    return { title: "Start Mock Interview", subtitle: "Interactive Mode" };
  }
  if (prompt.includes("How should I prepare for interviews?")) {
    return { title: "How should I prepare", subtitle: "for interviews?" };
  }
  if (prompt.includes("Improve my resume summary")) {
    return { title: "Improve my", subtitle: "resume summary" };
  }
  if (prompt.includes("Which saved job is my best fit?")) {
    return { title: "Which saved job", subtitle: "is my best fit?" };
  }
  
  // Fallback: no subtitle
  return { title: prompt, subtitle: null };
}

export default function SuggestionGrid() {
  const { getQuickPrompts, sendMessage, loading } = useChat();
  const prompts = getQuickPrompts();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {prompts.map((prompt, i) => {
        const Icon = ICONS[i % ICONS.length];
        const { title, subtitle } = splitPrompt(prompt);
        
        return (
          <motion.div key={i} variants={item}>
            <SuggestionCard 
              icon={Icon}
              title={title}
              subtitle={subtitle}
              onClick={() => !loading && sendMessage(prompt)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
