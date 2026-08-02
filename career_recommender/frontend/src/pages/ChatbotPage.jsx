import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, FileText } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ChatProvider, useChat } from "../context/ChatContext";

import Sidebar from "../components/chatbot/Sidebar";
import Header from "../components/chatbot/Header";
import Hero from "../components/chatbot/Hero";
import SuggestionGrid from "../components/chatbot/SuggestionGrid";
import ChatInput from "../components/chatbot/ChatInput";

const markdownComponents = {
  h1: ({ children }) => <h1 className="mb-3 mt-1 text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-gray-100 dark:border-slate-700 pb-2 text-xl font-bold leading-tight text-gray-900 dark:text-gray-100 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-7 text-gray-700 dark:text-gray-300 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-gray-100">{children}</strong>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-gray-700 dark:text-gray-300">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7 text-gray-700 dark:text-gray-300">{children}</li>,
  code: ({ children }) => <code className="rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-[13px] font-medium text-blue-600 dark:text-blue-400">{children}</code>,
  a: ({ children, href }) => <a className="font-semibold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline" href={href}>{children}</a>,
};

function MessageContent({ message }) {
  if (message.role === "user") {
    return <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white">{message.content}</p>;
  }

  const content = message.content;
  const docMatch = content.match(/\[DOCUMENT:\s*(.*?)\]([\s\S]*?)\[\/DOCUMENT\]/);
  
  if (docMatch) {
    const docTitle = docMatch[1].trim();
    const docContent = docMatch[2].trim();
    
    const textBefore = content.substring(0, docMatch.index);
    const textAfter = content.substring(docMatch.index + docMatch[0].length);

    const downloadPDF = async () => {
      try {
        const response = await client.post('/api/generate-pdf', { title: docTitle, content: docContent }, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${docTitle}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } catch (err) {
        console.error("Failed to download PDF", err);
      }
    };

    return (
      <div className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
        {textBefore && <ReactMarkdown components={markdownComponents}>{textBefore}</ReactMarkdown>}
        
        <div className="my-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{docTitle}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">ATS-Optimized Document</p>
              </div>
            </div>
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <FileDown className="h-4 w-4" />
              Download PDF
            </button>
          </div>
          <div className="mt-4 max-h-32 overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50 dark:to-[#172033] z-10" />
             <p className="text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-pre-wrap">{docContent}</p>
          </div>
        </div>

        {textAfter && <ReactMarkdown components={markdownComponents}>{textAfter}</ReactMarkdown>}
      </div>
    );
  }

  return (
    <div className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
      <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
    </div>
  );
}

function ChatbotLayout() {
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    error, 
    sidebarOpen, 
    suggestions,
    sendMessage,
    profilePhoto,
    handleResumeUpload,
    resumeUploading,
    resumeMessage
  } = useChat();
  
  const endRef = useRef(null);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const initial = user?.full_name?.charAt(0).toUpperCase() || "U";

  const openResumePicker = () => {
    if (!resumeUploading) {
      resumeInputRef.current?.click();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex h-screen w-full flex-col bg-white dark:bg-slate-900 font-sans text-gray-900 dark:text-gray-100"
    >
      <Header />
      <div className="flex h-full w-full overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out">
        <input ref={resumeInputRef} type="file" accept="application/pdf" onChange={handleResumeUpload} className="sr-only" />
        
        {sidebarOpen && <Sidebar />}

        <main className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900/50 relative border-l border-gray-100 dark:border-slate-800">

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-4xl">
              {messages.length === 0 ? (
                <div className="flex min-h-[500px] flex-col justify-center py-10">
                  <Hero />
                  <div className="mt-8">
                    <SuggestionGrid />
                  </div>
                  <div className="mt-8 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      onClick={openResumePicker}
                      disabled={resumeUploading}
                      className="rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-[13px] font-bold text-gray-700 dark:text-gray-300 shadow-sm transition hover:border-blue-600/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resumeUploading ? "Analyzing resume..." : "Attach resume PDF for better answers"}
                    </button>
                    {resumeMessage && <p className="mt-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">{resumeMessage}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 pb-10">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-4 ${msg.role === "user" ? "max-w-[80%] flex-row-reverse" : "w-full"}`}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800 shadow-sm">
                            {msg.role === "user" ? (
                              profilePhoto ? (
                                <img src={profilePhoto} alt="User" className="h-full w-full object-cover" />
                              ) : (
                                <span className="bg-blue-600 text-white w-full h-full flex items-center justify-center font-bold text-sm">{initial}</span>
                              )
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-blue-600 text-white">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className={`min-w-0 px-6 py-4 ${
                            msg.role === "user" 
                              ? "rounded-[24px] rounded-tr-sm bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                              : "rounded-[24px] rounded-tl-sm border border-gray-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md shadow-sm"
                          }`}>
                            {msg.role === "assistant" && (
                              <div className="mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">AI Career Mentor</span>
                              </div>
                            )}
                            <MessageContent message={msg} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                        <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 rounded-[24px] rounded-tl-sm border border-gray-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-6 py-5 shadow-sm">
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600/60" style={{ animationDelay: "0ms" }} />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600/60" style={{ animationDelay: "150ms" }} />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-600/60" style={{ animationDelay: "300ms" }} />
                      </div>
                    </motion.div>
                  )}

                  {suggestions.length > 0 && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ml-14 mt-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(suggestion)}
                            className="rounded-full border border-blue-600/20 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-[13px] font-semibold text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <div className="mx-14 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm font-semibold text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-transparent px-4 pb-6 pt-2">
            <ChatInput />
            <p className="mt-4 text-center text-[11px] font-medium text-gray-400">
              AI mentor can make mistakes. Use resume and job suggestions as guidance.
            </p>
          </div>
        </main>
      </div>
    </motion.div>
  );
}

export default function ChatbotPage() {
  return (
    <ChatProvider>
      <ChatbotLayout />
    </ChatProvider>
  );
}
