import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';

export default function Settings() {
  const { user, refreshUser } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isGoogleOnly = !!user?.googleId && !user?.hasPassword;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      await authApi.updateProfile({ name, email });
      await refreshUser();
      setProfileSuccess('اطلاعات با موفقیت بروزرسانی شد');
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'خطا در بروزرسانی پروفایل');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('رمز عبور جدید و تکرار آن مطابقت ندارند');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'خطا در تغییر رمز عبور');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>تنظیمات حساب | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">تنظیمات حساب</h1>

        {/* Profile Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">اطلاعات پروفایل</h2>

          {profileError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-left disabled:bg-gray-100 disabled:text-gray-500"
                dir="ltr"
                required
                disabled={!!user?.googleId}
              />
              {user?.googleId && (
                <p className="text-xs text-gray-500 mt-1">ایمیل حساب‌های متصل به گوگل قابل تغییر نیست</p>
              )}
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary disabled:opacity-50"
            >
              {profileLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </form>
        </div>

        {/* Password Card - hidden for Google-only users */}
        {!isGoogleOnly && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">تغییر رمز عبور</h2>

            {passwordError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رمز عبور فعلی</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input text-left"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رمز عبور جدید</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input text-left"
                  dir="ltr"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تکرار رمز عبور جدید</label>
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
                disabled={passwordLoading}
                className="btn-primary disabled:opacity-50"
              >
                {passwordLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
