import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

const GUIDE_LINKS = [
  { to: '/browse/us', label: 'کسب‌وکارهای ایرانی در آمریکا' },
  { to: '/browse/ca', label: 'کسب‌وکارهای ایرانی در کانادا' },
  { to: '/browse/gb/category/restaurant', label: 'رستوران‌های ایرانی در انگلستان' },
  { to: '/browse/us/category/medical', label: 'پزشکان ایرانی در آمریکا' },
];

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-slate-300">
      <div className="atlas-grid mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <BrandMark inverted />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">راهنمای مستقل برای پیدا کردن کسب‌وکارها و متخصصان ایرانی، شهر به شهر و با مسیر مستقیم به اطلاعات تماس.</p>
            <Link to="/register" className="mt-5 inline-flex rounded-xl bg-saffron px-4 py-2.5 text-sm font-bold text-ink hover:bg-amber-400">کسب‌وکار خود را ثبت کنید</Link>
          </div>
          <nav aria-label="راهنماهای محبوب">
            <h2 className="font-bold text-white">راهنماهای محبوب</h2>
            <ul className="mt-4 space-y-3 text-sm">{GUIDE_LINKS.map((link) => <li key={link.to}><Link to={link.to} className="hover:text-white">{link.label}</Link></li>)}</ul>
          </nav>
          <nav aria-label="پیوندهای پرشین‌پیجز">
            <h2 className="font-bold text-white">پرشین‌پیجز</h2>
            <ul className="mt-4 space-y-3 text-sm"><li><Link to="/search" className="hover:text-white">جستجو</Link></li><li><Link to="/select-country" className="hover:text-white">همه کشورها</Link></li><li><Link to="/privacy" className="hover:text-white">حریم خصوصی</Link></li><li><Link to="/terms" className="hover:text-white">شرایط استفاده</Link></li></ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} PersianPages</p><p>اطلاعات را پیش از مراجعه مستقیماً با کسب‌وکار تأیید کنید.</p></div>
      </div>
    </footer>
  );
}
