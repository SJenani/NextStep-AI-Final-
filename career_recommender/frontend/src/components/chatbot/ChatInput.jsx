import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function ChatInput() {
  const { sendMessage, loading, isMuted, toggleMute, isSpeaking, isInterviewMode } = useChat();
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [wasVoiceInput, setWasVoiceInput] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInputText(currentTranscript);
          setWasVoiceInput(true);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = (e) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText("");
      setWasVoiceInput(false);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let isVoice = wasVoiceInput;
    
    if (isListening) {
      isVoice = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    if (inputText.trim() && !loading) {
      sendMessage(inputText, { isVoice });
      setInputText("");
      setWasVoiceInput(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-[5px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow focus-within:shadow-[0_8px_30px_rgba(37,99,235,0.1)] dark:focus-within:shadow-[0_8px_30px_rgba(37,99,235,0.2)]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center pl-2 text-gray-400 dark:text-gray-500">
        <Sparkles className="h-[18px] w-[18px]" />
      </div>
      
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={isListening ? "Listening..." : "Ask anything..."}
        disabled={loading}
        className={`flex-1 bg-transparent px-2 py-2 text-[14px] outline-none disabled:opacity-50 ${
          isListening ? "text-blue-600 dark:text-blue-400 placeholder:text-blue-400 dark:placeholder:text-blue-500" : "text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
        }`}
      />
      
      {(isListening || isSpeaking || isInterviewMode) && (
        <button
          type="button"
          onClick={toggleMute}
          disabled={loading}
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
            isMuted
              ? "bg-orange-100 text-orange-500 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:hover:bg-orange-500/30"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-slate-600"
          }`}
          aria-label="Toggle voice output"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      )}

      <button
        type="button"
        onClick={toggleListening}
        disabled={loading}
        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          isListening 
            ? "bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 shadow-sm animate-pulse" 
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-slate-600"
        }`}
        aria-label="Toggle voice input"
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      <button
        type="submit"
        disabled={!inputText.trim() || loading}
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:scale-[1.05] hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:shadow-none disabled:hover:scale-100"
        aria-label="Send message"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4 pr-0.5 pt-0.5" />
        )}
      </button>
    </form>
  );
}
