import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CategoryCard from '../components/CategoryCard';
import ListingCard from '../components/ListingCard';
import { getCitiesByCountry, getCountryByCode, toSlug } from '../i18n/locations';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getWebsiteSchema } from '../utils/structuredData';

const STRONG_GUIDES = [
  { href: '/browse/us/los-angeles', city: 'لس‌آنجلس', detail: 'رستوران، پزشک، وکیل و خدمات محلی' },
  { href: '/browse/us/new-york', city: 'نیویورک', detail: 'کسب‌وکارهای ایرانی در سراسر شهر' },
  { href: '/browse/us/san-francisco', city: 'سانفرانسیسکو', detail: 'راهنمای منطقه خلیج' },
  { href: '/browse/us/seattle', city: 'سیاتل', detail: 'متخصصان و خدمات ایرانی' },
  { href: '/browse/ca/toronto', city: 'تورنتو', detail: 'راهنمای جامعه ایرانی تورنتو' },
  { href: '/browse/ca/vancouver', city: 'ونکوور', detail: 'خدمات ایرانی در مترو ونکوور' },
];

const QUICK_SEARCHES = ['رستوران ایرانی', 'پزشک فارسی‌زبان', 'وکیل ایرانی', 'سوپرمارکت ایرانی'];

export default function Home() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const countryCode = searchParams.get('country') || localStorage.getItem('selectedCountry') || '';
  const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;
  const countryCities = countryCode ? getCitiesByCountry(countryCode) : [];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      categoriesApi.getAll(),
      listingsApi.getFeatured({ limit: 12, country: selectedCountry?.name }),
    ])
      .then(([categoryResponse, listingResponse]) => {
        if (cancelled) return;
        setCategories(categoryResponse.data);
        setListings(listingResponse.data.listings);
        setDirectoryTotal(listingResponse.data.pagination.total);
      })
      .catch((error) => {
        if (!cancelled) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountry?.name]);

  const runSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (countryCode) params.set('country', countryCode);
    navigate(`/search?${params.toString()}`);
  };

  const pageTitle = selectedCountry
    ? `کسب‌وکارهای ایرانی در ${selectedCountry.name} | پرشین‌پیجز`
    : 'پرشین‌پیجز | راهنمای کسب‌وکارهای ایرانی در سراسر جهان';
  const pageDescription = selectedCountry
    ? `کسب‌وکارها و متخصصان ایرانی در ${selectedCountry.name} را بر اساس شهر و دسته‌بندی پیدا و مقایسه کنید.`
    : 'کسب‌وکارها، رستوران‌ها، پزشکان، وکلا و خدمات ایرانی را بر اساس شهر و تخصص پیدا کنید.';

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link rel="canonical" href="https://persianpages.com/" />
        <script type="application/ld+json">{JSON.stringify(getWebsiteSchema())}</script>
      </Helmet>

      <section className="atlas-grid overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
          <div>
            <p className="mb-4 text-sm font-bold text-primary-200">راهنمای جامعه ایرانی، شهر به شهر</p>
            <h1 className="max-w-3xl text-balance text-4xl font-black leading-[1.25] tracking-tight md:text-6xl">
              کسب‌وکارهای ایرانی را در شهر خود پیدا کنید
            </h1>
            <p lang="en" dir="ltr" className="mt-3 w-fit font-latin text-sm font-semibold text-primary-200 md:text-base">Persian business directory by city and category</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              از پزشک و وکیل تا رستوران و سوپرمارکت؛ اطلاعات تماس و موقعیت هر کسب‌وکار را در یک راهنمای فارسی مقایسه کنید.
            </p>
            <form className="mt-8 max-w-2xl" onSubmit={(event) => { event.preventDefault(); runSearch(search); }} role="search">
              <label htmlFor="home-search" className="sr-only">جستجوی کسب‌وکار یا خدمات</label>
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:flex-row">
                <input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={selectedCountry ? `چه چیزی در ${selectedCountry.name} می‌خواهید؟` : 'نام کسب‌وکار، تخصص یا خدمات'} className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3.5 text-base text-ink outline-none placeholder:text-slate-400 focus:ring-0" />
                <button type="submit" className="rounded-xl bg-primary-600 px-6 py-3.5 font-bold text-white hover:bg-primary-700">جستجو در راهنما</button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <span>جستجوهای رایج:</span>
              {QUICK_SEARCHES.map((term) => <button key={term} type="button" onClick={() => runSearch(term)} className="border-b border-white/30 pb-0.5 text-white hover:border-saffron hover:text-saffron">{term}</button>)}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm md:p-7" aria-label="مسیرهای سریع راهنما">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div><p className="font-bold">از کجا شروع کنیم؟</p><p className="mt-1 text-sm text-slate-300">یک مسیر مستقیم به راهنماهای پرمحتوا</p></div>
              {selectedCountry && <span className="text-3xl" aria-hidden="true">{selectedCountry.flag}</span>}
            </div>
            <div className="mt-3 divide-y divide-white/10">
              {(countryCities.length > 0
                ? countryCities.slice(0, 6).map((city) => ({ href: `/browse/${countryCode}/${toSlug(city.nameEn)}`, city: city.name, detail: `راهنمای ${selectedCountry?.name || ''}` }))
                : STRONG_GUIDES.slice(0, 5)
              ).map((guide) => (
                <Link key={guide.href} to={guide.href} className="flex items-center justify-between gap-4 py-3.5 text-sm hover:text-saffron">
                  <span><strong className="block text-base text-white">{guide.city}</strong><span className="mt-0.5 block text-slate-300">{guide.detail}</span></span>
                  <svg className="h-5 w-5 shrink-0 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
              ))}
            </div>
            <Link to="/select-country" className="mt-4 inline-flex text-sm font-bold text-primary-200 hover:text-white">مشاهده همه کشورها و شهرها</Link>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white" aria-label="آمار راهنما">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-x-reverse divide-slate-200 px-4 sm:px-6 lg:px-8">
          <div className="py-5 text-center"><strong className="block text-xl font-black text-ink md:text-2xl">{loading ? '—' : directoryTotal.toLocaleString('fa-IR')}</strong><span className="text-xs text-slate-500 md:text-sm">فهرست کامل</span></div>
          <div className="py-5 text-center"><strong className="block text-xl font-black text-ink md:text-2xl">{loading ? '—' : categories.length.toLocaleString('fa-IR')}</strong><span className="text-xs text-slate-500 md:text-sm">دسته خدمات</span></div>
          <div className="py-5 text-center"><strong className="block text-xl font-black text-ink md:text-2xl">۲۰</strong><span className="text-xs text-slate-500 md:text-sm">کشور</span></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="categories-heading">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><h2 id="categories-heading" className="text-2xl font-black text-ink md:text-3xl">بر اساس نیازتان پیدا کنید</h2><p className="mt-2 text-slate-600">دسته را انتخاب کنید؛ سپس شهر و کشور را محدود کنید.</p></div>
          <Link to="/search" className="hidden text-sm font-bold text-primary-700 sm:block">جستجوی پیشرفته</Link>
        </div>
        {loading ? <div className="py-12 text-center text-slate-500">در حال بارگذاری راهنما…</div> : <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">{categories.slice(0, 10).map((category) => <CategoryCard key={category.id} category={category} countryCode={countryCode} />)}</div>}
      </section>

      {!selectedCountry && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
              <div><h2 className="text-2xl font-black text-ink md:text-3xl">راهنمای شهرهای پرتقاضا</h2><p className="mt-3 max-w-md leading-8 text-slate-600">به‌جای عبور از صدها صفحه کم‌محتوا، از راهنماهایی شروع کنید که گزینه‌های کافی برای مقایسه دارند.</p><Link to="/select-country" className="btn-secondary mt-6 inline-flex">مرور همه شهرها</Link></div>
              <nav className="grid gap-3 sm:grid-cols-2" aria-label="شهرهای پرتقاضا">
                {STRONG_GUIDES.map((guide) => <Link key={guide.href} to={guide.href} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50/40"><span><strong className="block text-lg text-ink">{guide.city}</strong><span className="mt-1 block text-sm text-slate-500">{guide.detail}</span></span><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-white" aria-hidden="true">←</span></Link>)}
              </nav>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="featured-heading">
        <div className="mb-7 flex items-end justify-between gap-4"><div><h2 id="featured-heading" className="text-2xl font-black text-ink md:text-3xl">فهرست‌های کامل‌تر</h2><p className="mt-2 text-slate-600">صفحه‌هایی با اطلاعات تماس، وب‌سایت و جزئیات قابل مقایسه.</p></div><Link to={countryCode ? `/search?country=${countryCode}` : '/search'} className="text-sm font-bold text-primary-700">مشاهده همه</Link></div>
        {loading ? <div className="py-16 text-center text-slate-500">در حال بارگذاری کسب‌وکارها…</div> : listings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">هنوز فهرست کاملی برای این محدوده نداریم.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-lapis px-6 py-9 text-white md:flex md:items-center md:justify-between md:px-10">
          <div><h2 className="text-2xl font-black">اطلاعات کسب‌وکارتان را خودتان مدیریت کنید</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">ثبت مالکیت و تأیید شماره تماس به مشتریان و موتورهای جستجو نشان می‌دهد اطلاعات صفحه از یک منبع دست‌اول می‌آید.</p></div>
          <Link to="/register" className="mt-5 inline-flex shrink-0 rounded-xl bg-white px-5 py-3 font-bold text-lapis hover:bg-blue-50 md:mt-0">ثبت یا تأیید کسب‌وکار</Link>
        </div>
      </section>
    </div>
  );
}
