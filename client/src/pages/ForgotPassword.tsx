import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ارسال ایمیل بازیابی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>بازیابی رمز عبور | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">بازیابی رمز عبور</h1>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm">
              اگر حساب کاربری با این ایمیل وجود داشته باشد، لینک بازیابی رمز عبور ارسال شده است.
            </div>
            <p className="text-gray-600 text-sm">
              لطفا صندوق ورودی ایمیل خود را بررسی کنید.
            </p>
            <Link to="/login" className="text-primary-600 hover:underline text-sm">
              بازگشت به صفحه ورود
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <p className="text-gray-600 text-sm mb-4">
              ایمیل خود را وارد کنید تا لینک بازیابی رمز عبور برایتان ارسال شود.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ایمیل
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input text-left"
                  dir="ltr"
                  placeholder="example@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
              </button>
            </form>

            <p className="text-center text-gray-600 mt-6">
              <Link to="/login" className="text-primary-600 hover:underline">
                بازگشت به صفحه ورود
              </Link>
            </p>
          </>
        )}
      </div>
      </div>
    </>
  );
}
