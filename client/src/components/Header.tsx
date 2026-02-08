import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CountrySelector from './CountrySelector';

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => {
    const isActive = pathname === to || pathname.startsWith(to + '/');
    return (
      <Link
        to={to}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-primary-600">
              پرشین‌پیجز
            </Link>
            <CountrySelector compact />
          </div>

          <nav className="flex items-center gap-3">
            {navLink('/search', 'جستجو')}
            {user ? (
              <>
                {navLink('/dashboard', 'داشبورد')}
                <Link to="/listings/new" className="btn-primary">
                  ثبت آگهی
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                {navLink('/login', 'ورود')}
                <Link to="/register" className="btn-primary">
                  ثبت‌نام
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
