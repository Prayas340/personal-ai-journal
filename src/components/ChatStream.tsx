import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  ShieldAlert,
  Share2,
  Paperclip,
  Code,
  Mic,
  MicOff,
  Send,
  Check,
  CheckSquare,
  Square,
  FileText,
  ListTodo,
  Download,
  Copy,
  X
} from 'lucide-react';
import { ChatMessage, ActionItem, UserProfile } from '../types';
import { RocketLogo } from './RocketLogo';
import { LottieLoading } from './LottieLoading';
import { extractSearchRelatedTags } from '../lib/tagExtractor';

interface ChatStreamProps {
  user: UserProfile | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onSaveSession: () => Promise<void>;
  onNewSession: () => void;
  isLoading: boolean;
  activeJournalId: string;
  isSaving: boolean;
  saveSuccess: boolean;
}

// Starter prompt templates that can be inserted with one click
const ARCHITECTURAL_PROMPTS = [
  'What are best practices for structuring technical design documents to help cross-functional teams collaborate more efficiently?',
  'Analyze how engineering leads can balance rapid feature delivery with tech-debt remediation in high-velocity teams.',
  'Draft a clear sprint retrospective template focusing on team alignment, velocity metrics, and priority follow-ups.'
];

export const ChatStream: React.FC<ChatStreamProps> = ({
  user,
  messages,
  onSendMessage,
  onSaveSession,
  onNewSession,
  isLoading,
  activeJournalId,
  isSaving,
  saveSuccess
}) => {
  const [inputText, setInputText] = useState('');
  const [actionItemsState, setActionItemsState] = useState<Record<string, boolean>>({
    'act-1': true,
    'act-2': false,
    'act-3': false
  });
  const [copyToast, setCopyToast] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [promptCycleIndex, setPromptCycleIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Handle Speech-to-Text via Web Speech API
  const toggleSpeechRecognition = () => {
    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permissions.');
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech start error:', err);
      setIsListening(false);
    }
  };

  // Handle File Attachment
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFileName(file.name);
      setInputText((prev) =>
        prev
          ? `${prev}\n\n[Attached File: ${file.name}]\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``
          : `Please review and reflect on the following architecture file (${file.name}):\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Cycle through sample architectural prompts
  const handleInsertTemplate = () => {
    const nextPrompt = ARCHITECTURAL_PROMPTS[promptCycleIndex % ARCHITECTURAL_PROMPTS.length];
    setInputText(nextPrompt);
    setPromptCycleIndex((prev) => prev + 1);
  };

  // Export current session as clean Markdown
  const handleExportMarkdown = () => {
    if (messages.length === 0) return;

    const sessionDate = new Date().toISOString().split('T')[0];
    let mdContent = `# Strategic Reflection Log • ${sessionDate}\n\n`;
    mdContent += `**Author**: ${user?.displayName || 'Engineering Lead'}\n`;
    mdContent += `**Session ID**: ${activeJournalId}\n`;
    mdContent += `**Exported**: ${new Date().toLocaleString()}\n\n`;
    mdContent += `---\n\n`;

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        mdContent += `### 👤 Reflection (${msg.timestamp || 'Recorded'})\n\n`;
        mdContent += `${msg.content}\n\n`;
      } else {
        mdContent += `### 🚀 Journal Synthesis (${msg.timestamp || 'Generated'})\n\n`;
        if (msg.executiveSummary) {
          mdContent += `**Executive Summary**:\n${msg.executiveSummary}\n\n`;
        }
        if (msg.content) {
          mdContent += `${msg.content}\n\n`;
        }
        if (msg.actionItems && msg.actionItems.length > 0) {
          mdContent += `**Extracted Action Items**:\n`;
          msg.actionItems.forEach((item) => {
            const checked = actionItemsState[item.id] ? '[x]' : '[ ]';
            mdContent += `- ${checked} **${item.priority || 'Normal'}**: ${item.task}\n`;
          });
          mdContent += `\n`;
        }
        if (msg.tags && msg.tags.length > 0) {
          mdContent += `**Tags**: ${msg.tags.map((t) => `#${t}`).join(' ')}\n\n`;
        }
      }
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Executive-Reflection-${activeJournalId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy text to clipboard
  const handleCopy = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    setAttachedFileName(null);
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleActionItem = (id: string) => {
    setActionItemsState((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const authorName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'You');

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.md,.json,.js,.ts,.py,.log,.yaml,.yml"
        className="hidden"
      />

      {/* Top Header with Responsive Action Grouping */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 font-semibold text-xs tracking-wide uppercase border border-blue-100 shrink-0">
              Personal AI Journal
            </span>
          </div>

          {/* Specified Spaces for Action Icons to prevent mobile compaction */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Save Journal Entry Button */}
            <button
              onClick={onSaveSession}
              disabled={isSaving || messages.length === 0}
              className={`h-9 px-3 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                saveSuccess
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
              }`}
              title="Save journal entry"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Saved</span>
                </>
              ) : isSaving ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Save</span>
                </>
              )}
            </button>

            {/* Export Markdown */}
            <button
              onClick={handleExportMarkdown}
              disabled={messages.length === 0}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export Reflection as Markdown (.md)"
            >
              <Download className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Metadata Badges Row with specified item spacing */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200/80">
              <RocketLogo className="text-blue-600" size={13} />
              AI Reflection
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200/70">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Auto-Sync
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200/70">
              <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              Markdown Ready
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            AI Strategic Reflection Journal
          </span>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-full fixed top-20 right-6 shadow-lg flex items-center gap-2 z-50 animate-bounce">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Copied to clipboard!</span>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="p-1 hover:text-rose-900 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 sm:space-y-6 bg-slate-50/40">
        {messages.length === 0 ? (
          /* Empty State - Chat starts clean with no pre-given chats */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-400 flex items-center justify-center mb-3.5 shadow-2xs">
              <RocketLogo className="text-slate-400" size={22} />
            </div>
            <h2 className="text-sm font-semibold text-slate-700">
              Journal is empty
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Start typing below to record your reflections, notes, or milestones.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id || index} className="flex flex-col items-end space-y-1">
                  {/* Author & Timestamp */}
                  <div className="text-[11px] text-slate-500 font-medium pr-1">
                    <span>
                      {msg.timestamp?.includes('T')
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : msg.timestamp || 'Just now'}
                    </span>
                    <span className="ml-2 font-semibold text-slate-700">{authorName}</span>
                  </div>

                  {/* User Message Bubble */}
                  <div className="max-w-[92%] sm:max-w-[85%] bg-[#1a56db] text-white rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-xs text-xs sm:text-[13.5px] leading-relaxed font-normal whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Delivery Confirmation */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium pr-1">
                    <Check className="w-3 h-3 text-slate-400 stroke-[2.5]" />
                    <span>Delivered</span>
                  </div>
                </div>
              );
            }

            // Case A: Model message is a Blocked Response / Policy Notice
            const isSecurityHookMessage =
              msg.threatBlocked ||
              msg.threatDetails ||
              (msg.content && msg.content.includes('Constitution Enforcement'));

            if (isSecurityHookMessage && !msg.actionItems && !msg.executiveSummary) {
              return (
                <div
                  key={msg.id || index}
                  className="relative pl-3.5 sm:pl-4 border-l-4 border-amber-500 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200 shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          Content Advisory Notice
                        </h3>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Sensitive content pattern was flagged
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            }

            // Case B: Full Gemini Executive Synthesis & Action Blueprint Card
            const summary = msg.executiveSummary || msg.content;
            const actionItemsList = msg.actionItems || [];
            const tagsList = (msg.tags && msg.tags.length > 0)
              ? msg.tags
              : extractSearchRelatedTags(msg.content || msg.executiveSummary || '');

            return (
              <div
                key={msg.id || index}
                className="relative pl-3.5 sm:pl-4 border-l-4 border-blue-600 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0">
                      <RocketLogo className="text-white" size={15} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                        Personal AI Journal{' '}
                        <span className="font-normal text-slate-600 hidden sm:inline">
                          • Executive Synthesis & Action Blueprint
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Strategic Synthesis • Action Blueprint
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium flex items-center gap-1 shrink-0">
                    ⚡ Realtime
                  </span>
                </div>

                {/* 1. Executive Summary Box */}
                {summary && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-600">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>Executive Summary</span>
                      </div>
                      <button
                        onClick={() => handleCopy(summary)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 transition cursor-pointer shrink-0"
                        title="Copy Summary"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* 2. Main Response Body if separate from summary */}
                {msg.content && msg.content !== summary && (
                  <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* 3. Action Items Checklist */}
                {actionItemsList.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-600">
                        <ListTodo className="w-3.5 h-3.5 shrink-0" />
                        <span>Extracted Action Items</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {actionItemsList.filter((item) => actionItemsState[item.id]).length} of{' '}
                        {actionItemsList.length} complete
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-800">
                      {actionItemsList.map((item) => {
                        const isDone = !!actionItemsState[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleActionItem(item.id)}
                            className="flex items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200/70 hover:border-blue-300 transition cursor-pointer"
                          >
                            <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                              <div className="pt-0.5 sm:pt-0 shrink-0">
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                              </div>
                              <span
                                className={`text-xs break-words leading-relaxed ${
                                  isDone
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800 font-medium'
                                }`}
                              >
                                {item.task}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                                item.priority === 'High'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : item.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {item.priority || 'Normal'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Card Footer: Action buttons & Tags with specified spaces */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        onSendMessage('Please refine and expand the executive summary with specific implementation steps.')
                      }
                      className="h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Refine Summary</span>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Download .MD</span>
                    </button>
                    <button
                      onClick={() => handleCopy(summary || '')}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer flex items-center justify-center shrink-0"
                      title="Copy Summary"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>

                  {tagsList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-blue-600">
                      {tagsList.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100/90 text-blue-600 font-medium"
                        >
                          #{tag.replace(/^#+/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 flex items-center gap-2.5 shadow-xs">
              <LottieLoading size={20} className="shrink-0" />
              <span>Synthesizing reflection and action items...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Bar with dedicated specified spaces for mobile layout */}
      <div className="p-2.5 sm:p-4 border-t border-slate-100 bg-white">
        {attachedFileName && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 max-w-full">
            <Paperclip className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Attached: {attachedFileName}</span>
            <button
              onClick={() => {
                setAttachedFileName(null);
                setInputText('');
              }}
              className="ml-1 p-0.5 text-blue-500 hover:text-blue-800 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200/90 rounded-2xl px-2 sm:px-3.5 py-1.5 sm:py-2 shadow-sm focus-within:border-blue-400 transition"
        >
          {/* Left Controls: File Attachment & Code Template with specified spacing */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleFileClick}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              title="Attach Architecture File / Log (.txt, .md, .json, .log)"
            >
              <Paperclip className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleInsertTemplate}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              title="Cycle through Architectural Reflection Prompts"
            >
              <Code className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* Text Input with min-w-0 to prevent layout compression */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to speech... speak now'
                : 'Reflect on your day, challenges, or thoughts...'
            }
            className={`flex-1 min-w-0 bg-transparent border-none outline-hidden text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 py-1.5 px-1 sm:px-2 ${
              isListening ? 'animate-pulse font-medium text-blue-600' : ''
            }`}
          />

          {/* Right Controls: Microphone and Red Send Button with specified spacing */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400/40'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isListening ? 'Stop listening' : 'Start Speech-to-Text Voice Dictation'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 shrink-0" />
              ) : (
                <Mic className="w-4 h-4 shrink-0" />
              )}
            </button>

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-[#c22b2b] hover:bg-[#a82424] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
