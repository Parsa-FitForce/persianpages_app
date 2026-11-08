import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { countries } from '../i18n/locations';
import BrandMark from '../components/BrandMark';

export default function SelectCountry() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink text-white">
      <Helmet>
        <title>انتخاب کشور | پرشین‌پیجز</title>
        <meta name="description" content="کشور خود را انتخاب کنید و کسب‌وکارهای ایرانی نزدیک خود را پیدا کنید. بیش از ۲۰ کشور و ۱۰۰ شهر." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://persianpages.com/select-country" />
      </Helmet>

      <div className="atlas-grid mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-10 flex justify-center">
          <BrandMark inverted />
        </div>

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold tracking-wide text-primary-300">راهنمای محلی جامعه ایرانی</p>
          <h1 className="text-balance text-3xl font-black leading-tight sm:text-5xl">کدام کشور را جستجو می‌کنید؟</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">کشور خود را انتخاب کنید تا شهرها، دسته‌بندی‌ها و اطلاعات تماس کسب‌وکارهای ایرانی مرتبط را ببینید.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {countries.map((country) => (
            <Link
              key={country.code}
              to={`/browse/${country.code}`}
              onClick={() => localStorage.setItem('selectedCountry', country.code)}
              className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-right transition hover:-translate-y-0.5 hover:border-primary-300/60 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron sm:p-5"
              aria-label={`انتخاب ${country.name}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="text-4xl" aria-hidden="true">{country.flag}</span>
                <span className="text-primary-300 transition group-hover:-translate-x-1" aria-hidden="true">←</span>
              </div>
              <h2 className="font-bold text-white">{country.name}</h2>
              <p className="mt-1 text-xs text-slate-400 font-latin" dir="ltr">{country.nameEn}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row">
          <p>{countries.length.toLocaleString('fa-IR')} کشور در یک راهنمای واحد</p>
          <button
            onClick={() => {
              localStorage.removeItem('selectedCountry');
              navigate('/');
            }}
            className="font-bold text-white underline decoration-primary-400 underline-offset-4 hover:text-primary-200"
          >
            فعلاً همه کشورها را ببینم
          </button>
        </div>
      </div>
    </div>
  );
}
