import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail
} from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Input states (strictly unpopulated / empty by default)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (newMode: 'signin' | 'register') => {
    resetForm();
    setMode(newMode);
  };

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Google User'),
        photoURL: user.photoURL || null,
        isDemo: false
      };
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.warn('Google Sign-In response:', err.message);
      setErrorMsg(err.message || 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email/Password Submit handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);
    try {
      let user: any;
      if (mode === 'register') {
        user = await registerWithEmail(cleanEmail, password, name.trim());
      } else {
        user = await signInWithEmail(cleanEmail, password);
      }

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: user.displayName || name.trim() || cleanEmail.split('@')[0],
        photoURL:
          user.photoURL ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            user.displayName || name.trim() || cleanEmail
          )}&backgroundColor=4f46e5`,
        isDemo: false
      };

      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Optional zero-friction Guest session
  const handleGuestSignIn = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    const guestUser: UserProfile = {
      uid: `guest_${Date.now()}_${randomId}`,
      email: `guest_${randomId}@journal.local`,
      displayName: 'Guest Explorer',
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=Guest&backgroundColor=64748b`,
      isDemo: true
    };
    onAuthSuccess(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Welcome back! Enter your details to access your journal.'
                : 'Join to save your journals and AI mood reflections securely.'}
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="leading-relaxed">{errorMsg}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-rose-300" />
                  <span>Continue as Guest</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('signin');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
                >
                  Sign in with Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Official Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs shadow-xs transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 border border-slate-300"
          type="button"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-500 bg-slate-900 px-3">
            or continue with email
          </div>
        </div>

        {/* Mode Selector (Sign In vs Register) */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 mb-4 border border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-1.5 font-medium rounded-lg transition cursor-pointer text-center ${
              mode === 'signin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-1.5 font-medium rounded-lg transition cursor-pointer text-center ${
              mode === 'register'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              {mode === 'register' && (
                <span className="text-[11px] text-slate-400">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In with Email' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch mode footer */}
        <div className="mt-4 text-center">
          {mode === 'signin' ? (
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer underline underline-offset-2"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Subtle Guest Access Option */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={handleGuestSignIn}
            className="text-[11px] text-slate-400 hover:text-slate-300 transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span>Just exploring? Continue as Guest</span>
          </button>
        </div>
      </div>
    </div>
  );
};
