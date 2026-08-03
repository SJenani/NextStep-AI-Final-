import { createContext, useContext, useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

const CHAT_HISTORY_LIMIT = 30;
const MESSAGE_HISTORY_LIMIT = 80;

const defaultStarters = [
  "Which role should I target right now?",
  "What skills should I learn next?",
  "Why am I not matching more roles?",
  "Improve my resume summary",
  "How should I prepare for interviews?",
  "Which saved job is my best fit?",
];

function getChatStorageKey(user) {
  return `career_chatbot_history_${user?.id || user?.email || "local"}`;
}

function getProfilePhotoStorageKey(user) {
  return `career_profile_${user?.id || user?.email || "local"}_photo`;
}

function buildChatPreview(messages) {
  const firstUserMessage = messages.find((message) => message.role === "user") || messages[0];
  return firstUserMessage?.content?.slice(0, 48) || "Chat";
}

function buildStoredConversation(messages) {
  return {
    messages: messages.slice(-MESSAGE_HISTORY_LIMIT),
    preview: buildChatPreview(messages),
    updatedAt: Date.now(),
  };
}

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await client.get("/profile/view");
        setProfile(data);
      } catch {
        setProfile(null);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    const loadProfilePhoto = () => {
      setProfilePhoto(localStorage.getItem(getProfilePhotoStorageKey(user)) || "");
    };

    loadProfilePhoto();
    window.addEventListener("storage", loadProfilePhoto);
    window.addEventListener("nextstep-profile-photo-updated", loadProfilePhoto);
    return () => {
      window.removeEventListener("storage", loadProfilePhoto);
      window.removeEventListener("nextstep-profile-photo-updated", loadProfilePhoto);
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    setIsHydrated(false);
    try {
      const raw = localStorage.getItem(getChatStorageKey(user));
      const parsed = raw ? JSON.parse(raw) : null;
      let savedConversations = Array.isArray(parsed?.conversations) ? parsed.conversations : [];
      const savedMessages = Array.isArray(parsed?.activeMessages) ? parsed.activeMessages : [];
      let savedActiveIndex = Number.isInteger(parsed?.activeIndex) ? parsed.activeIndex : -1;

      if (savedMessages.length > 0 && savedActiveIndex < 0) {
        savedConversations = [...savedConversations, buildStoredConversation(savedMessages)].slice(-CHAT_HISTORY_LIMIT);
        savedActiveIndex = savedConversations.length - 1;
      }
      if (savedActiveIndex >= savedConversations.length) {
        savedActiveIndex = savedConversations.length - 1;
      }
      if (savedMessages.length > 0 && savedActiveIndex >= 0) {
        savedConversations = savedConversations.map((conversation, index) =>
          index === savedActiveIndex ? buildStoredConversation(savedMessages) : conversation
        );
      }

      setConversations(savedConversations.slice(-CHAT_HISTORY_LIMIT));
      setMessages(savedMessages.slice(-MESSAGE_HISTORY_LIMIT));
      setActiveIndex(savedActiveIndex);
      setSuggestions([]);
      setError("");
      
      // Attempt to restore interview mode based on recent messages
      if (savedMessages.length > 0) {
        for (let i = savedMessages.length - 1; i >= 0; i--) {
          const msg = savedMessages[i].content.toLowerCase();
          if (msg.includes("end interview") || msg.includes("stop interview") || msg.includes("exit interview")) {
            setIsInterviewMode(false);
            break;
          }
          if (msg.includes("start mock interview")) {
            setIsInterviewMode(true);
            break;
          }
        }
      }
    } catch {
      setConversations([]);
      setMessages([]);
      setActiveIndex(-1);
    } finally {
      setIsHydrated(true);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!isHydrated) return;

    const storedConversations = conversations
      .map((conversation, index) =>
        index === activeIndex && messages.length > 0
          ? buildStoredConversation(messages)
          : {
              ...conversation,
              messages: (conversation.messages || []).slice(-MESSAGE_HISTORY_LIMIT),
              preview: conversation.preview || buildChatPreview(conversation.messages || []),
            }
      )
      .slice(-CHAT_HISTORY_LIMIT);

    const payload = {
      conversations: storedConversations.length === 0 && messages.length > 0 ? [buildStoredConversation(messages)] : storedConversations,
      activeMessages: messages.slice(-MESSAGE_HISTORY_LIMIT),
      activeIndex,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(getChatStorageKey(user), JSON.stringify(payload));
    } catch {
      // Ignore storage quota/private mode failures.
    }
  }, [user?.id, user?.email, conversations, messages, activeIndex]);

  const getQuickPrompts = () => {
    if (!profile) return defaultStarters;
    const { desired_role, domain, skills } = profile;
    const prompts = [];
    if (desired_role) prompts.push(`What skills do I need for ${desired_role}?`);
    if (domain) prompts.push(`Am I a good fit for ${domain} roles?`);
    if (skills?.length > 0) prompts.push("Which of my skills are most in demand?");
    prompts.push("Why am I not matching more roles?");
    prompts.push("Start Mock Interview");
    prompts.push("Improve my resume summary");
    return prompts.slice(0, 6);
  };

  const refreshProfile = async () => {
    try {
      const { data } = await client.get("/profile/view");
      setProfile(data);
    } catch {
      // Keep current profile if refresh fails.
    }
  };

  const sendMessage = async (text, options = {}) => {
    const { isVoice = false } = options;
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    
    const textLower = trimmed.toLowerCase();
    let currentInterviewMode = isInterviewMode;
    if (textLower.includes("start mock interview")) {
      currentInterviewMode = true;
      setIsInterviewMode(true);
    } else if (textLower.includes("end interview") || textLower.includes("stop interview") || textLower.includes("exit interview")) {
      currentInterviewMode = false;
      setIsInterviewMode(false);
    }

    const history = messages.slice(-6).map((message) => ({
      role: message.role,
      text: message.content,
    }));
    const userMessage = { role: "user", content: trimmed };

    if (activeIndex === -1 && messages.length === 0) {
      const nextConversation = buildStoredConversation([userMessage]);
      setConversations((prev) => [...prev, nextConversation].slice(-CHAT_HISTORY_LIMIT));
      setActiveIndex(Math.min(conversations.length, CHAT_HISTORY_LIMIT - 1));
    }

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const response = await client.post("/chatbot/ask", {
        question: trimmed,
        messages: history,
      });

      const answer = response.data?.answer || "I couldn't get a response. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      setSuggestions(response.data?.suggestions || []);
      
      const shouldSpeak = (isVoice || currentInterviewMode) && !isMuted;
      if (shouldSpeak && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
        const plainText = answer.replace(/[#*_`~>]/g, '').trim(); // Remove basic markdown
        const utterance = new SpeechSynthesisUtterance(plainText);
        
        // Try to select a pleasant, clear voice
        const voices = window.speechSynthesis.getVoices();
        
        // Look for premium, natural, or high-quality default voices
        const preferredVoice = voices.find(v => v.name.includes('Natural')) ||
                               voices.find(v => v.name.includes('Premium')) ||
                               voices.find(v => v.name.includes('Google US English')) ||
                               voices.find(v => v.name.includes('Google UK English Female')) ||
                               voices.find(v => v.name.includes('Microsoft Aria Online')) ||
                               voices.find(v => v.name.includes('Microsoft Zira')) ||
                               voices.find(v => v.name.includes('Samantha')) ||
                               voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
                               voices.find(v => v.lang.startsWith('en-US'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        // Tweak rate and pitch for a friendlier, clearer tone
        utterance.rate = 1.05; // Slightly faster for conversational pace
        utterance.pitch = 1.05; // Slightly higher pitch for a friendlier sound

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Unable to reach the mentor.";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. The server might be busy. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setResumeMessage("Please upload a PDF resume.");
      setError("Please upload a PDF resume.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setResumeUploading(true);
      setResumeMessage(`Analyzing ${file.name}...`);
      setError("");

      const { data } = await client.post("/resume/upload?auto_fill=true", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshProfile();

      const audit = data.resume_audit;
      const scoreLine = audit ? ` ATS score: ${Math.round(audit.overall_score)}/100 for ${audit.target_role}.` : "";
      const extractedSkills = data.extracted_skills?.slice(0, 6).join(", ");
      const skillsLine = extractedSkills ? ` I found skills like ${extractedSkills}.` : "";

      setResumeMessage("Resume analyzed and added to your mentor context.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Resume uploaded successfully.${scoreLine}${skillsLine}\n\nYou can now ask me to improve your summary, check ATS gaps, or rewrite bullets for your target role.`,
        },
      ]);
      setSuggestions(["Check my resume score", "Which resume keywords are missing?", "Improve my resume summary"]);
    } catch (err) {
      const message = err.response?.data?.detail || "Resume upload failed. Please try again.";
      setResumeMessage(message);
      setError(message);
    } finally {
      setResumeUploading(false);
    }
  };

  const newChat = () => {
    if (messages.length > 0) {
      setConversations((prev) => {
        const nextConversation = buildStoredConversation(messages);
        if (activeIndex >= 0) {
          return prev.map((conversation, index) => (index === activeIndex ? nextConversation : conversation));
        }
        return [...prev, nextConversation].slice(-CHAT_HISTORY_LIMIT);
      });
    }
    setMessages([]);
    setActiveIndex(-1);
    setError("");
    setSuggestions([]);
  };

  const loadConversation = (index) => {
    const conv = conversations[index];
    if (!conv) return;
    setMessages(conv.messages || []);
    setActiveIndex(index);
    setError("");
    setSuggestions([]);
  };

  const deleteConversation = (indexToDelete) => {
    setConversations((prev) => prev.filter((_, index) => index !== indexToDelete));
    if (activeIndex === indexToDelete) {
      setMessages([]);
      setActiveIndex(-1);
      setSuggestions([]);
      setError("");
    } else if (activeIndex > indexToDelete) {
      setActiveIndex((current) => current - 1);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        messages,
        setMessages,
        conversations,
        activeIndex,
        error,
        loading,
        profile,
        suggestions,
        sidebarOpen,
        setSidebarOpen,
        resumeUploading,
        resumeMessage,
        profilePhoto,
        historySearch,
        setHistorySearch,
        isMuted,
        toggleMute,
        isSpeaking,
        isInterviewMode,
        getQuickPrompts,
        sendMessage,
        handleResumeUpload,
        newChat,
        loadConversation,
        deleteConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
