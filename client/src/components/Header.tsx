import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandMark from './BrandMark';
import CountrySelector from './CountrySelector';

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const navClass = (to: string) => {
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-primary-50 text-primary-800' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`;
  };
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark />
          <span className="hidden h-7 w-px bg-slate-200 lg:block" aria-hidden="true" />
          <div className="hidden lg:block"><CountrySelector compact /></div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
          <Link to="/search" className={navClass('/search')}>جستجوی کسب‌وکار</Link>
          <Link to="/select-country" className={navClass('/select-country')}>راهنمای شهرها</Link>
          {user ? (
            <>
              <Link to="/listings/new" className="btn-primary mr-2 text-sm">افزودن کسب‌وکار</Link>
              <div className="relative" ref={dropdownRef}>
                <button type="button" onClick={() => setDropdownOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-2.5 text-sm font-semibold text-slate-700 hover:border-primary-300" aria-expanded={dropdownOpen} aria-haspopup="menu" aria-label="منوی حساب کاربری">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-bold text-white">{userInitial}</span>
                  <svg className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" /></svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
                    <div className="border-b border-slate-100 px-3 py-2.5"><p className="truncate text-sm font-bold text-ink">{user.name}</p><p className="truncate text-xs text-slate-500" dir="ltr">{user.email}</p></div>
                    <Link to="/dashboard" className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">داشبورد کسب‌وکار</Link>
                    <Link to="/settings" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">تنظیمات</Link>
                    <button type="button" onClick={logout} className="block w-full rounded-lg px-3 py-2 text-right text-sm text-slate-700 hover:bg-slate-50" role="menuitem">خروج</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <><Link to="/login" className={`${navClass('/login')} mr-2`}>ورود</Link><Link to="/register" className="btn-primary text-sm">ثبت رایگان کسب‌وکار</Link></>
          )}
        </nav>

        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-xl border border-slate-200 p-2.5 text-ink md:hidden" aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'} aria-expanded={menuOpen}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18 18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-4 md:hidden" aria-label="منوی موبایل">
          <div className="mb-3"><CountrySelector compact /></div>
          <div className="grid gap-1">
            <Link to="/search" className={navClass('/search')}>جستجوی کسب‌وکار</Link>
            <Link to="/select-country" className={navClass('/select-country')}>راهنمای شهرها</Link>
            {user ? (
              <><Link to="/dashboard" className={navClass('/dashboard')}>داشبورد کسب‌وکار</Link><Link to="/listings/new" className="btn-primary mt-2 text-center text-sm">افزودن کسب‌وکار</Link><button type="button" onClick={logout} className="mt-1 rounded-lg px-3 py-2 text-right text-sm font-semibold text-slate-600">خروج</button></>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2"><Link to="/login" className="btn-secondary text-center text-sm">ورود</Link><Link to="/register" className="btn-primary text-center text-sm">ثبت کسب‌وکار</Link></div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
