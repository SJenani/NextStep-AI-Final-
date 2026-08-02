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
  
  const historyHydratedRef = useRef(false);

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
    historyHydratedRef.current = false;
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
    } catch {
      setConversations([]);
      setMessages([]);
      setActiveIndex(-1);
    } finally {
      historyHydratedRef.current = true;
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!historyHydratedRef.current) return;

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

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

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
