import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  getIdToken,
  saveJournalEntry,
  deleteJournalEntry,
  subscribeToUserJournals,
  logoutUser
} from './lib/firebase';
import { ChatMessage, UserProfile, JournalEntry } from './types';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ChatStream } from './components/ChatStream';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { extractSearchRelatedTags } from './lib/tagExtractor';

export default function App() {
  // Authentication State: Null by default until the user explicitly signs in
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('journal_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Chat State
  const [activeJournalId, setActiveJournalId] = useState<string>(() => `journal-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current effective UID for chat isolation (logged in Firebase UID, or stable guest UID)
  const currentUid = user?.uid || (typeof window !== 'undefined' ? (() => {
    let guestUid = localStorage.getItem('journal_guest_uid');
    if (!guestUid) {
      guestUid = `guest-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('journal_guest_uid', guestUid);
    }
    return guestUid;
  })() : 'guest-user');

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
          photoURL: firebaseUser.photoURL,
          isDemo: false
        };
        setUser(u);
        localStorage.setItem('journal_user', JSON.stringify(u));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Subscription to Account's Chat History (Firestore + Local Mirror)
  useEffect(() => {
    if (!currentUid) return;

    const unsubscribe = subscribeToUserJournals(
      currentUid,
      (userJournals) => {
        setJournals(userJournals);
      },
      (err) => {
        console.warn('Journals sync notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  // Helper to fetch authorization header
  const getAuthHeader = async () => {
    const token = await getIdToken();
    if (token) return `Bearer ${token}`;
    return `Bearer demo-session-token-${currentUid}`;
  };

  // 3. Send message through Gemini Chat Endpoint and auto-save chat
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
          'x-demo-uid': currentUid
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

      // Determine clean title from the initial user prompt
      const firstUserMsg = updatedHistory.find((m) => m.role === 'user');
      const chatTitle = firstUserMsg ? firstUserMsg.content.slice(0, 50).trim() : 'Reflection Session';

      // Automatically persist to user's isolated chat history
      try {
        await saveJournalEntry(currentUid, activeJournalId, {
          title: chatTitle,
          messages: updatedHistory,
          summary: data.summary || '',
          tags: (data.tags && data.tags.length > 0) ? data.tags : extractSearchRelatedTags(text),
          actionItems: data.actionItems || [],
          sentiment: data.sentiment || 'Focused',
          sentimentScore: data.sentimentScore ?? 0.85
        });
        setSaveSuccess(true);
      } catch (dbErr: any) {
        console.warn('Background chat persistence notice:', dbErr.message);
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

  // 4. Save Session explicitly
  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      const firstPrompt = messages[0]?.content?.slice(0, 60) || 'Personal AI Journal Log';
      const lastModelMsg = [...messages].reverse().find((m) => m.role === 'model');

      await saveJournalEntry(currentUid, activeJournalId, {
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

  // 5. Select past chat from Gemini-style history list
  const handleSelectJournal = (journal: JournalEntry) => {
    setActiveJournalId(journal.id);
    setMessages(journal.messages || []);
    setSaveSuccess(false);

    // On mobile screens, auto-collapse sidebar after selecting a chat
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // 6. Start new chat session (just like Gemini '+ New chat')
  const handleNewSession = () => {
    setActiveJournalId(`journal-${Date.now()}`);
    setMessages([]);
    setSaveSuccess(false);

    // On mobile screens, auto-collapse sidebar
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // 7. Delete chat session from user's account
  const handleDeleteJournal = async (journalId: string) => {
    try {
      await deleteJournalEntry(currentUid, journalId);
      // If deleted active chat, reset to new chat
      if (activeJournalId === journalId) {
        handleNewSession();
      }
    } catch (err: any) {
      console.error('Failed to delete journal:', err);
    }
  };

  // 8. Sign out
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser(null);
    localStorage.removeItem('journal_user');
    handleNewSession();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f1f5f9] text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onNewChat={handleNewSession}
      />

      {/* App Workspace with Gemini-Style Chat History Sidebar */}
      <div className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto p-2 sm:p-4 gap-3 sm:gap-4">
        {/* Chat History Sidebar */}
        <ChatHistorySidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          journals={journals}
          activeJournalId={activeJournalId}
          onSelectJournal={handleSelectJournal}
          onNewChat={handleNewSession}
          onDeleteJournal={handleDeleteJournal}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        {/* Main Focused Chat Reflection Stream */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
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
      </div>

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
