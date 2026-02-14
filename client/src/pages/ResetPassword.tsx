import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authApi } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <>
      <Helmet>
        <title>بازنشانی رمز عبور | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">لینک نامعتبر</h1>
          <p className="text-gray-600 mb-4">لینک بازیابی رمز عبور نامعتبر است.</p>
          <Link to="/forgot-password" className="text-primary-600 hover:underline">
            درخواست لینک جدید
          </Link>
        </div>
      </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در تغییر رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>بازنشانی رمز عبور | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">تغییر رمز عبور</h1>

        {success ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm">
              رمز عبور شما با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...
            </div>
            <Link to="/login" className="text-primary-600 hover:underline text-sm">
              ورود به حساب کاربری
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رمز عبور جدید
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input text-left"
                  dir="ltr"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">حداقل ۶ کاراکتر</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تکرار رمز عبور
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input text-left"
                  dir="ltr"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
              </button>
            </form>
          </>
        )}
      </div>
      </div>
    </>
  );
}
