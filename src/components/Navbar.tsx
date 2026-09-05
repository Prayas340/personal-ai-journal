import React, { useState } from 'react';
import {
  LogOut,
  LogIn,
  CheckCircle2,
  ChevronDown,
  PanelLeft,
  Plus
} from 'lucide-react';
import { UserProfile } from '../types';
import { RocketLogo } from './RocketLogo';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onNewChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuthModal,
  onSignOut,
  onToggleSidebar,
  isSidebarOpen,
  onNewChat
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : '');
  const email = user?.email || '';
  const avatarUrl = user?.photoURL;
  const initial = (displayName || email || 'U').charAt(0).toUpperCase();

  return (
    <header className="bg-transparent pt-3 pb-1 px-3 sm:px-6 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Sidebar Toggle, Brand & Live Indicator */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
                  isSidebarOpen
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-600'
                }`}
                aria-label="Toggle chat history sidebar"
                title={isSidebarOpen ? 'Close chat history' : 'Open chat history'}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs shrink-0"
                title="Start a new chat session"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>New Chat</span>
              </button>
            )}

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 shrink-0">
              <RocketLogo className="text-white" size={17} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base sm:text-[18px] font-bold text-slate-800 tracking-tight truncate">
                Personal AI Journal
              </span>
              <div className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] sm:text-[11px] font-semibold text-blue-600 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span>• LIVE NOW</span>
              </div>
            </div>
          </div>

          {/* Right: User Profile / Sign In */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

            {/* If Not Logged In: Show Sign In Button */}
            {!user ? (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              /* User Profile Card with Dropdown (Only when logged in) */
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 sm:pr-2.5 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200 transition text-left cursor-pointer shrink-0"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/20 shadow-2xs bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
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
                  <div className="hidden md:flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-800 leading-tight">
                        {displayName}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    </div>
                    {email && (
                      <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                        {email}
                      </span>
                    )}
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900">{displayName}</p>
                      {email && <p className="text-[11px] text-slate-500 truncate">{email}</p>}
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {user.isDemo ? 'Journal Guest Session' : 'Firebase Verified'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
