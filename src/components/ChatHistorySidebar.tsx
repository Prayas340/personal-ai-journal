import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  LogIn
} from 'lucide-react';
import { JournalEntry, UserProfile } from '../types';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  journals: JournalEntry[];
  activeJournalId: string;
  onSelectJournal: (journal: JournalEntry) => void;
  onNewChat: () => void;
  onDeleteJournal: (journalId: string) => void;
  user: UserProfile | null;
  onOpenAuthModal: () => void;
}

// Group entries into Gemini-style time buckets
function groupJournalsByDate(journals: JournalEntry[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: {
    today: JournalEntry[];
    yesterday: JournalEntry[];
    previousWeek: JournalEntry[];
    older: JournalEntry[];
  } = {
    today: [],
    yesterday: [],
    previousWeek: [],
    older: []
  };

  journals.forEach((entry) => {
    let date = new Date(entry.timestamp || Date.now());
    if (isNaN(date.getTime())) date = new Date();

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      groups.today.push(entry);
    } else if (compareDate.getTime() === yesterday.getTime()) {
      groups.yesterday.push(entry);
    } else if (compareDate.getTime() >= lastWeek.getTime()) {
      groups.previousWeek.push(entry);
    } else {
      groups.older.push(entry);
    }
  });

  return groups;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onToggle,
  journals,
  activeJournalId,
  onSelectJournal,
  onNewChat,
  onDeleteJournal,
  user,
  onOpenAuthModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter journals if search query is entered
  const filteredJournals = searchQuery.trim()
    ? journals.filter(
        (j) =>
          j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : journals;

  const grouped = groupJournalsByDate(filteredJournals);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      onDeleteJournal(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => {
        setDeletingId((curr) => (curr === id ? null : curr));
      }, 3000);
    }
  };

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest');
  const email = user?.email || '';
  const avatarUrl = user?.photoURL;
  const initial = (displayName || 'U').charAt(0).toUpperCase();

  const renderSection = (title: string, entries: JournalEntry[]) => {
    if (entries.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
          {title}
        </h3>
        <div className="space-y-0.5">
          {entries.map((entry) => {
            const isActive = entry.id === activeJournalId;
            const isConfirmingDelete = deletingId === entry.id;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectJournal(entry)}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border border-blue-200/60'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={entry.title || 'Untitled Reflection'}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{entry.title || 'Untitled Reflection'}</span>
                </div>

                {/* Delete button (with 2-step confirmation) */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, entry.id)}
                  className={`p-1 rounded-lg transition shrink-0 cursor-pointer ${
                    isConfirmingDelete
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-rose-600'
                  }`}
                  title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete chat'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-40 bg-white/95 backdrop-blur-md md:bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shadow-lg md:shadow-none ${
          isOpen ? 'w-72 sm:w-80 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'
        }`}
      >
        {/* Top Header: Collapse button & New Chat */}
        <div className="p-3.5 pb-2 flex items-center justify-between gap-2 border-b border-slate-100">
          <button
            onClick={onToggle}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Chat History</span>
          </span>

          <div className="w-8" />
        </div>

        {/* Gemini-Style "+ New chat" Button */}
        <div className="p-3 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-semibold transition border border-slate-200/70 shadow-2xs cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-blue-600 transition group-hover:scale-110" />
            <span>New chat</span>
          </button>
        </div>

        {/* Search Bar for Past Chats */}
        {journals.length > 2 && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past chats..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        )}

        {/* Chats List Area */}
        <div className="flex-1 overflow-y-auto px-2 py-2 select-none scrollbar-thin scrollbar-thumb-slate-200">
          {filteredJournals.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
              <p className="text-xs font-medium text-slate-600">No chats saved yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Your conversations will be saved and listed here for your account.
              </p>
            </div>
          ) : (
            <>
              {renderSection('Today', grouped.today)}
              {renderSection('Yesterday', grouped.yesterday)}
              {renderSection('Previous 7 Days', grouped.previousWeek)}
              {renderSection('Older', grouped.older)}
            </>
          )}
        </div>

        {/* Bottom Account Card / Sync Indicator */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {user ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-blue-500/20">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {displayName}
                  </p>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                </div>
                {email && (
                  <p className="text-[10px] text-slate-500 truncate leading-tight">{email}</p>
                )}
                <span className="text-[9px] text-blue-600 font-medium mt-0.5 block">
                  • Synced with your account
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
              <p className="text-[11px] font-medium text-blue-900">Sign in to save chats</p>
              <p className="text-[10px] text-blue-700/80 mt-0.5 mb-2">
                Access your chat history across any device with Google or Email.
              </p>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In / Register</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
