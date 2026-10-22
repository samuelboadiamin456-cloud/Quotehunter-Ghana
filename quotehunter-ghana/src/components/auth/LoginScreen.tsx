import React, { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { AppBackdrop } from '../common/AppBackdrop.tsx';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, error } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <AppBackdrop />
      <div className="qh-page w-full max-w-md bg-white/95 border border-slate-200 rounded-xl shadow-xl p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white mx-auto qh-float qh-glow">
          <Building2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">QuoteHunter Ghana</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connecting Ghanaian contractors and verified building material suppliers.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={busy}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure sign-in. Your Google account must have a verified email.
        </div>
      </div>
    </div>
  );
};
