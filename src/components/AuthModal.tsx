import React, { useState } from 'react';
import { X, Lock, Mail, Shield, Check, AlertCircle, Sparkles } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, registerWithEmail } from '../lib/firebase';
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
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isDemo: false
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setErrorMsg(`The domain '${currentHost}' is not yet in Firebase's Authorized Domains list.`);
      } else {
        setErrorMsg(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      let user;
      if (isRegister) {
        user = await registerWithEmail(email, password);
      } else {
        user = await signInWithEmail(email, password);
      }
      onAuthSuccess({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        photoURL: user.photoURL,
        isDemo: false
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    const demoUser: UserProfile = {
      uid: 'demo-innovator-apac',
      email: 'innovator@apac-ideathon.demo',
      displayName: 'GenAI APAC Innovator',
      photoURL: null,
      isDemo: true
    };
    onAuthSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Firebase Authentication</h2>
            <p className="text-xs text-slate-400">
              Identity Token (Bearer) protected Cloud Run backend
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-rose-300">
                  {isUnauthorizedDomain ? 'Firebase Domain Restriction' : 'Authentication Error'}
                </span>
                <p className="text-slate-300 leading-relaxed">{errorMsg}</p>
              </div>
            </div>

            {isUnauthorizedDomain && (
              <div className="pt-2 mt-2 border-t border-rose-500/20 space-y-2">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                  <p className="font-medium text-amber-300 mb-1">How to fix in Firebase Console:</p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                    <li>Go to <strong className="text-white">Firebase Console &gt; Authentication &gt; Settings</strong></li>
                    <li>Click <strong className="text-white">Authorized domains</strong> &gt; <strong className="text-white">Add domain</strong></li>
                    <li>Add: <code className="text-indigo-300 font-mono bg-indigo-950/40 px-1 py-0.5 rounded">{currentHost || 'your-vercel-domain.vercel.app'}</code></li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Bypass with Instant Evaluator Access
                </button>
              </div>
            )}
          </div>
        )}

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 rounded-xl shadow-xs transition mb-4 disabled:opacity-50 text-sm"
        >
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
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">or email sign-in</span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@apac-ideathon.org"
                required
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition pl-9"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition pl-9"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In with Email'}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="hover:text-indigo-400 transition underline underline-offset-2"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>

        {/* Quick Demo Evaluator Mode Button */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white">Evaluator Instant Demo</p>
                <p className="text-[11px] text-slate-400">Explore without popup requirements</p>
              </div>
            </div>
            <button
              onClick={handleDemoSignIn}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium transition"
            >
              Test as Evaluator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
