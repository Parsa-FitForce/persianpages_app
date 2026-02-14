import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser } = useAuth();
  const calledRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('لینک تایید نامعتبر است');
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    authApi.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
        refreshUser().catch(() => {});
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'خطا در تایید ایمیل');
      });
  }, [token]);

  return (
    <>
      <Helmet>
        <title>تایید ایمیل | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">در حال تایید ایمیل...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-700">{message}</h2>
            <Link to="/dashboard" className="btn-primary inline-block">
              رفتن به داشبورد
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-700">{message}</h2>
            <Link to="/dashboard" className="text-primary-600 hover:underline">
              بازگشت به داشبورد
            </Link>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
