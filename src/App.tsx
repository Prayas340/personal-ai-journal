import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  getIdToken,
  saveJournalEntry,
  logoutUser
} from './lib/firebase';
import { ChatMessage, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ChatStream } from './components/ChatStream';
import { extractSearchRelatedTags } from './lib/tagExtractor';

// Initial baseline reflection messages for executive leadership journal
const DEFAULT_INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'init-msg-1',
    role: 'user',
    content:
      'Reflecting on our engineering roadmap and service migration today. Deployment latency dropped 45%, but team context-switching between operational workflows was high. We need to systematize our onboarding checklist, improve team documentation, and streamline our weekly sprint reviews.',
    timestamp: '10:14 AM'
  },
  {
    id: 'init-msg-2',
    role: 'model',
    content: '',
    timestamp: '10:14 AM',
    executiveSummary:
      'Key engineering milestone achieved with a 45% latency improvement across production services. Operational context-switching remains the primary bottleneck for team velocity. Prioritize systematizing sprint onboarding, automating verification checks, and consolidating cross-team documentation.',
    actionItems: [
      {
        id: 'act-1',
        task: 'Publish service performance baseline metrics to engineering team dashboard',
        priority: 'Medium',
        status: 'completed'
      },
      {
        id: 'act-2',
        task: 'Consolidate engineering onboarding checklist and environment setup guide',
        priority: 'High',
        status: 'pending'
      },
      {
        id: 'act-3',
        task: 'Schedule bi-weekly architecture review to streamline team workflows',
        priority: 'Low',
        status: 'pending'
      }
    ],
    tags: ['Roadmap', 'Migration', 'Latency', 'Onboarding']
  }
];

export default function App() {
  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => ({
    uid: 'priya-sharma-apac',
    email: 'priya.sharma@cloudlab.dev',
    displayName: 'Dr. Priya Sharma',
    photoURL:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=160&auto=format&fit=crop',
    isDemo: true
  }));

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Chat State
  const [activeJournalId, setActiveJournalId] = useState<string>(() => `journal-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Dr. Priya Sharma',
          photoURL: firebaseUser.photoURL,
          isDemo: false
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to fetch authorization header
  const getAuthHeader = async () => {
    if (user && !user.isDemo) {
      const token = await getIdToken();
      if (token) return `Bearer ${token}`;
    }
    return `Bearer demo-session-token-${user?.uid || 'evaluator'}`;
  };

  // 2. Send message through Gemini Chat Endpoint
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setSaveSuccess(false);

    try {
      const authHeader = await getAuthHeader();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'x-demo-uid': user?.uid || 'evaluator'
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          journalId: activeJournalId,
          saveToFirestore: true
        })
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data = await response.json();

      const modelMsg: ChatMessage = {
        id: `mod-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executiveSummary: data.summary,
        actionItems: data.actionItems,
        sentiment: data.sentiment,
        sentimentScore: data.sentimentScore,
        tags: data.tags
      };

      const updatedHistory = [...newMessages, modelMsg];
      setMessages(updatedHistory);

      // Silently persist session in background
      if (user?.uid) {
        try {
          await saveJournalEntry(user.uid, activeJournalId, {
            title: text.slice(0, 60),
            messages: updatedHistory,
            summary: data.summary || '',
            tags: (data.tags && data.tags.length > 0) ? data.tags : extractSearchRelatedTags(text),
            actionItems: data.actionItems || [],
            sentiment: data.sentiment || 'Focused',
            sentimentScore: data.sentimentScore ?? 0.85
          });
          setSaveSuccess(true);
        } catch (dbErr: any) {
          console.warn('Background persistence notice:', dbErr.message);
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Unable to process request**: ${err.message || 'Server connection failed.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Save Session explicitly
  const handleSaveSession = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      const firstPrompt = messages[0]?.content?.slice(0, 60) || 'Personal AI Journal Log';
      const lastModelMsg = [...messages].reverse().find((m) => m.role === 'model');

      await saveJournalEntry(user.uid, activeJournalId, {
        title: firstPrompt,
        messages,
        summary:
          lastModelMsg?.executiveSummary ||
          'Personal reflection and strategic action items documented.',
        tags: (lastModelMsg?.tags && lastModelMsg.tags.length > 0)
          ? lastModelMsg.tags
          : extractSearchRelatedTags(firstPrompt),
        actionItems: lastModelMsg?.actionItems || [],
        sentiment: lastModelMsg?.sentiment || 'Focused',
        sentimentScore: lastModelMsg?.sentimentScore ?? 0.9
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save session:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Start new session
  const handleNewSession = () => {
    setActiveJournalId(`journal-${Date.now()}`);
    setMessages([]);
    setSaveSuccess(false);
  };

  // 5. Sign out
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser({
      uid: 'guest-innovator',
      email: 'guest@cloudlab.dev',
      displayName: 'Guest Innovator',
      photoURL: null,
      isDemo: true
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Centered Focused Journal View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 pb-6 flex flex-col h-[calc(100vh-5.5rem)] min-h-[580px]">
        <ChatStream
          user={user}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSaveSession={handleSaveSession}
          onNewSession={handleNewSession}
          isLoading={isLoading}
          activeJournalId={activeJournalId}
          isSaving={isSaving}
          saveSuccess={saveSuccess}
        />
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          handleNewSession();
        }}
      />
    </div>
  );
}
