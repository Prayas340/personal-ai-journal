import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  ExternalLink,
  Code2,
  FileText,
  ListTodo,
  Smile,
  Tag,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquareQuote,
  Flame
} from 'lucide-react';
import { JournalEntry } from '../types';

interface FirestoreLiveLogsProps {
  userId: string | null;
  journals: JournalEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectJournal: (journal: JournalEntry) => void;
  onDeleteJournal: (id: string) => Promise<void>;
  onRunExtraction: (journalId: string, text: string) => Promise<void>;
  extractingId: string | null;
}

export const FirestoreLiveLogs: React.FC<FirestoreLiveLogsProps> = ({
  userId,
  journals,
  isLoading,
  onRefresh,
  onSelectJournal,
  onDeleteJournal,
  onRunExtraction,
  extractingId
}) => {
  const [inspectDoc, setInspectDoc] = useState<JournalEntry | null>(null);

  const formatTime = (timeVal: any) => {
    try {
      if (!timeVal) return 'Just now';
      const d = typeof timeVal === 'string' ? new Date(timeVal) : timeVal instanceof Date ? timeVal : new Date(timeVal);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  const getPriorityBadge = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'High':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
      {/* Path header & Live listener info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Cloud Firestore Real-Time Logs
              </h3>
              <p className="text-[11px] text-slate-400">
                User-Scoped Isolation Subcollection
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        <div className="mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Isolated Firestore Storage Path:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> SEC-04 Active
            </span>
          </div>
          <code className="block font-mono text-[11px] text-amber-300 truncate">
            users/{userId || '{userId}'}/journals/{'{journalId}'}
          </code>
        </div>
      </div>

      {/* Journals List */}
      <div className="space-y-3">
        {journals.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-300">
              No Firestore entries for current user yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Start chatting or run a prompt test in the left column. Each turn will persist automatically to your isolated subcollection!
            </p>
          </div>
        ) : (
          journals.map((journal) => (
            <div
              key={journal.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-2.5 transition shadow-xs"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-white line-clamp-1">
                    {journal.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {formatTime(journal.timestamp)}
                    </span>
                    <span>&bull;</span>
                    <span>{journal.messages?.length || 0} messages</span>
                  </div>
                </div>

                {/* Sentiment pill */}
                {journal.sentiment && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                    <Smile className="w-2.5 h-2.5 text-indigo-400" />
                    {journal.sentiment}
                  </span>
                )}
              </div>

              {/* Summary Snippet */}
              {journal.summary && (
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                  {journal.summary}
                </div>
              )}

              {/* Action items preview */}
              {journal.actionItems && journal.actionItems.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3 text-sky-400" /> Extracted Action Items:
                    </span>
                    <span>{journal.actionItems.length} tasks</span>
                  </div>
                  <div className="space-y-1">
                    {journal.actionItems.slice(0, 2).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/40"
                      >
                        <span className="truncate flex-1">{item.task}</span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                    ))}
                    {journal.actionItems.length > 2 && (
                      <span className="text-[10px] text-slate-500 block pl-1">
                        + {journal.actionItems.length - 2} more actions
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {journal.tags && journal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {journal.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectJournal(journal)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition"
                  >
                    Open in Chat
                  </button>

                  <button
                    onClick={() => {
                      const allText = journal.messages?.map((m) => m.content).join('\n') || journal.title;
                      onRunExtraction(journal.id, allText);
                    }}
                    disabled={extractingId === journal.id}
                    className="text-[11px] px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition flex items-center gap-1 disabled:opacity-50"
                    title="Phase 3: Run Mood & Action Extraction Engine"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {extractingId === journal.id ? 'Extracting...' : 'Re-Extract Mood'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInspectDoc(journal)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                    title="View Raw Firestore Document JSON"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteJournal(journal.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raw Firestore Document JSON Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Firestore Document: {inspectDoc.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              users/{userId}/journals/{inspectDoc.id}
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-[11px] text-emerald-300">
              <pre>{JSON.stringify(inspectDoc, null, 2)}</pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
