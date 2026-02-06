import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CountrySelector from './CountrySelector';

export default function Header() {
  const { user, logout } = useAuth();

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

          <nav className="flex items-center gap-4">
            <Link to="/search" className="text-gray-600 hover:text-gray-900">
              جستجو
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                  داشبورد
                </Link>
                <Link to="/listings/new" className="btn-primary">
                  ثبت آگهی
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900">
                  ورود
                </Link>
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
