import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function ChatInput() {
  const { sendMessage, loading } = useChat();
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !loading) {
      sendMessage(inputText);
      setInputText("");
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
        placeholder="Ask anything..."
        disabled={loading}
        className="flex-1 bg-transparent px-2 py-2 text-[14px] text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />
      
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
