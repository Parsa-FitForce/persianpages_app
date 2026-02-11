import { useState, useEffect, useRef } from 'react';
import { verificationApi } from '../services/api';

interface OtpVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (token: string) => void;
  phone: string;
  maskedPhone?: string;
  listingId?: string;
  mode: 'claim' | 'create';
}

export default function OtpVerifyModal({
  isOpen,
  onClose,
  onVerified,
  phone,
  maskedPhone,
  listingId,
  mode,
}: OtpVerifyModalProps) {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [channel, setChannel] = useState<'sms' | 'call'>('sms');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // OTP expiry countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) setExpiresAt(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Focus code input on step change
  useEffect(() => {
    if (step === 'verify') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('send');
      setCode('');
      setError('');
      setResendCooldown(0);
      setExpiresAt(null);
      setTimeLeft(0);
    }
  }, [isOpen]);

  const handleSend = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await verificationApi.sendOtp({
        phone,
        channel,
        listingId,
      });
      setExpiresAt(new Date(res.data.expiresAt));
      setResendCooldown(30);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ارسال کد تایید');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setCode('');
    setLoading(true);
    try {
      const res = await verificationApi.sendOtp({
        phone,
        channel,
        listingId,
      });
      setExpiresAt(new Date(res.data.expiresAt));
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ارسال مجدد کد');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('لطفا کد ۶ رقمی را وارد کنید');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await verificationApi.confirmOtp({ phone, code });
      onVerified(res.data.verificationToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در تایید کد');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card relative z-10 w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {mode === 'claim' ? 'تایید مالکیت کسب‌وکار' : 'تایید شماره تلفن'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {step === 'send' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {mode === 'claim'
                ? 'برای تایید مالکیت، کد تایید به شماره تلفن ثبت‌شده کسب‌وکار ارسال می‌شود.'
                : 'برای ثبت کسب‌وکار، شماره تلفن شما باید تایید شود.'}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره تلفن
              </label>
              <div className="input bg-gray-50 text-left" dir="ltr">
                {mode === 'claim' && maskedPhone ? maskedPhone : phone}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                روش ارسال
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm transition-colors ${
                    channel === 'sms'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  پیامک (SMS)
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('call')}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm transition-colors ${
                    channel === 'call'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  تماس صوتی
                </button>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              کد ۶ رقمی ارسال شده به شماره{' '}
              <span dir="ltr" className="font-medium">
                {mode === 'claim' && maskedPhone ? maskedPhone : phone}
              </span>{' '}
              را وارد کنید.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                کد تایید
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCode(val);
                }}
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                dir="ltr"
                placeholder="------"
              />
            </div>

            {timeLeft > 0 && (
              <p className="text-xs text-gray-500 text-center">
                اعتبار کد: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} دقیقه
              </p>
            )}
            {timeLeft === 0 && expiresAt === null && (
              <p className="text-xs text-red-500 text-center">
                کد منقضی شده است. لطفا کد جدید درخواست کنید.
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'در حال تایید...' : 'تایید کد'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-primary-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendCooldown > 0
                  ? `ارسال مجدد (${resendCooldown} ثانیه)`
                  : 'ارسال مجدد کد'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
