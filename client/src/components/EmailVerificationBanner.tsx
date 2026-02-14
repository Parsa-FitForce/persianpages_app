import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Don't show for Google users or verified users
  if (!user || user.emailVerified || user.googleId) return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      await authApi.resendVerification();
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ارسال ایمیل');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-amber-800 text-sm">
          لطفا ایمیل خود را تایید کنید. لینک تایید به ایمیل شما ارسال شده است.
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-600 text-xs">{error}</span>}
          {sent ? (
            <span className="text-green-600 text-sm">ایمیل ارسال شد</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-sm text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
            >
              {sending ? 'در حال ارسال...' : 'ارسال مجدد'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
