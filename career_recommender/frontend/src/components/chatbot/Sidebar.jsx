import { Plus, Search, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ProfileCard from './ProfileCard';

export default function Sidebar() {
  const {
    conversations,
    activeIndex,
    historySearch,
    setHistorySearch,
    newChat,
    loadConversation,
    deleteConversation
  } = useChat();

  const filteredConversationItems = conversations
    .map((conv, index) => ({ conv, index }))
    .filter(({ conv }) => (conv.preview || "Chat").toLowerCase().includes(historySearch.trim().toLowerCase()));

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col space-y-5 p-6">

        {/* New Chat Button */}
        <button
          onClick={newChat}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] px-4 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-4px_rgba(79,70,229,0.5)] transition-all duration-500 hover:scale-[1.02] hover:bg-[right_center] hover:shadow-[0_8px_25px_-5px_rgba(79,70,229,0.6)] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Plus className="relative z-10 h-5 w-5 transition-transform duration-500 group-hover:rotate-90" strokeWidth={2.5} />
          <span className="relative z-10 tracking-wide">New Chat</span>
        </button>

        {/* Search Bar */}
        <div className="group relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-600" />
          <input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3.5 pl-11 pr-4 text-sm font-medium text-gray-800 dark:text-gray-200 outline-none transition-all focus:border-blue-600/30 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-600/10 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Recents */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h2 className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Recents
        </h2>
        
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 px-3 py-10 text-center opacity-60">
              <Clock className="h-6 w-6 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No chat history yet</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your conversations will appear here</p>
              </div>
            </div>
          ) : filteredConversationItems.length === 0 ? (
            <p className="px-3 py-4 text-sm font-medium text-gray-500 text-center">No matching chats</p>
          ) : (
            filteredConversationItems.map(({ conv, index }) => (
              <div
                key={`${index}-${conv.updatedAt || conv.preview}`}
                className={`group flex items-center gap-1 rounded-xl pr-1 transition-all duration-200 ${
                  activeIndex === index
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => loadConversation(index)}
                  className="min-w-0 flex-1 truncate px-4 py-3 text-left text-sm font-medium"
                >
                  {conv.preview}
                </button>
                <button
                  type="button"
                  onClick={() => deleteConversation(index)}
                  className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-white dark:hover:bg-slate-700 hover:text-red-500 group-hover:block"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <ProfileCard />
    </aside>
  );
}
