import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CountrySelector from './CountrySelector';

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLink = (to: string, label: string, onClick?: () => void) => {
    const isActive = pathname === to || pathname.startsWith(to + '/');
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors block ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Country */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-primary-600 whitespace-nowrap">
              پرشین‌پیجز
            </Link>
            <div className="hidden sm:block">
              <CountrySelector compact />
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLink('/search', 'جستجو')}
            {user ? (
              <>
                {navLink('/dashboard', 'داشبورد')}
                <Link to="/listings/new" className="btn-primary text-sm whitespace-nowrap">
                  افزودن کسب‌وکار
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                {navLink('/login', 'ورود')}
                <Link to="/register" className="btn-primary text-sm">
                  ثبت‌نام
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="منو"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closeMenu} />
          <div className="md:hidden absolute top-16 inset-x-0 z-50 bg-white border-t border-gray-100 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {/* Country selector */}
              <div className="pb-3 mb-2 border-b border-gray-100">
                <CountrySelector compact />
              </div>

              {navLink('/search', 'جستجو', closeMenu)}

              {user ? (
                <>
                  {navLink('/dashboard', 'داشبورد', closeMenu)}
                  <Link
                    to="/listings/new"
                    onClick={closeMenu}
                    className="btn-primary text-sm text-center block w-full"
                  >
                    افزودن کسب‌وکار
                  </Link>
                  <button
                    onClick={() => { logout(); closeMenu(); }}
                    className="w-full text-right px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    خروج
                  </button>
                </>
              ) : (
                <>
                  {navLink('/login', 'ورود', closeMenu)}
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="btn-primary text-sm text-center block w-full"
                  >
                    ثبت‌نام
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
