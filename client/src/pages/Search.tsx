import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry } from '../i18n/locations';
import ListingCard from '../components/ListingCard';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const search = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const countryCode = searchParams.get('country') || localStorage.getItem('selectedCountry') || '';
  const [draftSearch, setDraftSearch] = useState(search);

  const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;
  const countryCities = countryCode ? getCitiesByCountry(countryCode) : [];

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listingsApi
      .getAll({ search, category: categorySlug, city, country: selectedCountry?.name, page })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data.listings);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
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
  }, [search, categorySlug, city, page, selectedCountry?.name]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    setSearchParams(params);
    setPage(1);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    updateFilter('search', draftSearch.trim());
  };

  const selectedCategory = categories.find((category) => category.slug === categorySlug);
  const hasFilters = Boolean(search || categorySlug || city);
  const titleParts = ['جستجوی کسب‌وکارهای ایرانی'];
  if (search) titleParts.push(`«${search}»`);
  if (selectedCategory) titleParts.push(selectedCategory.nameFa);
  if (city) titleParts.push(city);
  if (selectedCountry) titleParts.push(selectedCountry.name);

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{`${titleParts.join(' - ')} | پرشین‌پیجز`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <section className="atlas-grid bg-ink py-10 text-white sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            {selectedCountry && <span className="text-3xl" aria-hidden="true">{selectedCountry.flag}</span>}
            <div>
              <p className="text-xs font-bold tracking-wide text-primary-300">جستجوی دایرکتوری</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                {selectedCountry ? `کسب‌وکارهای ایرانی در ${selectedCountry.name}` : 'کسب‌وکار ایرانی پیدا کنید'}
              </h1>
            </div>
          </div>
          <form onSubmit={submitSearch} className="flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:flex-row" role="search">
            <label htmlFor="directory-search" className="sr-only">نام کسب‌وکار، خدمات یا محصول</label>
            <input
              id="directory-search"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="مثلاً وکیل، دندانپزشک یا رستوران…"
              className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-base text-ink placeholder:text-slate-400 focus:ring-0"
            />
            <button type="submit" className="rounded-xl bg-saffron px-6 py-3 text-sm font-black text-ink transition hover:bg-amber-400">جستجو</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="grid min-w-0 gap-4 md:grid-cols-2 lg:sticky lg:top-24 lg:block lg:self-start lg:space-y-5" aria-label="فیلترهای جستجو">
            <FilterPanel title="دسته‌بندی">
              <FilterButton active={!categorySlug} onClick={() => updateFilter('category', '')}>همه دسته‌ها</FilterButton>
              {categories.map((category) => (
                <FilterButton key={category.id} active={categorySlug === category.slug} onClick={() => updateFilter('category', category.slug)}>
                  <span aria-hidden="true">{category.icon}</span>
                  <span>{category.nameFa}</span>
                </FilterButton>
              ))}
            </FilterPanel>

            {countryCities.length > 0 && (
              <FilterPanel title="شهر">
                <FilterButton active={!city} onClick={() => updateFilter('city', '')}>همه شهرها</FilterButton>
                {countryCities.map((countryCity) => (
                  <FilterButton key={countryCity.nameEn} active={city === countryCity.name} onClick={() => updateFilter('city', countryCity.name)}>
                    {countryCity.name}
                  </FilterButton>
                ))}
              </FilterPanel>
            )}
          </aside>

          <section className="min-w-0" aria-live="polite" aria-busy={loading}>
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold text-primary-700">نتایج جستجو</p>
                <h2 className="mt-1 text-2xl font-black text-ink">
                  {loading ? 'در حال پیدا کردن…' : `${total.toLocaleString('fa-IR')} کسب‌وکار`}
                </h2>
              </div>
              {hasFilters && (
                <button
                  onClick={() => {
                    setDraftSearch('');
                    const params = new URLSearchParams(searchParams);
                    ['search', 'category', 'city'].forEach((key) => params.delete(key));
                    setSearchParams(params);
                    setPage(1);
                  }}
                  className="self-start text-sm font-bold text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-900 sm:self-auto"
                >
                  پاک کردن همه فیلترها
                </button>
              )}
            </div>

            {hasFilters && (
              <div className="mb-6 flex flex-wrap gap-2">
                {search && <ActiveFilter label={`«${search}»`} onClear={() => updateFilter('search', '')} />}
                {selectedCategory && <ActiveFilter label={`${selectedCategory.icon} ${selectedCategory.nameFa}`} onClear={() => updateFilter('category', '')} />}
                {city && <ActiveFilter label={city} onClear={() => updateFilter('city', '')} />}
              </div>
            )}

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="در حال بارگذاری نتایج">
                {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-2xl" aria-hidden="true">⌕</div>
                <h3 className="text-xl font-black text-ink">نتیجه‌ای پیدا نشد</h3>
                <p className="mt-2 text-sm text-slate-600">عبارت کوتاه‌تری امتحان کنید یا یکی از فیلترها را بردارید.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
                </div>
                {pages > 1 && (
                  <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="صفحه‌بندی نتایج">
                    <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-40">قبلی</button>
                    {Array.from({ length: Math.min(5, pages) }, (_, index) => {
                      const pageNumber = pages <= 5 ? index + 1 : page <= 3 ? index + 1 : page >= pages - 2 ? pages - 4 + index : page - 2 + index;
                      return (
                        <button key={pageNumber} onClick={() => setPage(pageNumber)} aria-current={page === pageNumber ? 'page' : undefined} className={`h-10 w-10 rounded-xl text-sm font-bold ${page === pageNumber ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-ink hover:border-primary-300'}`}>
                          {pageNumber.toLocaleString('fa-IR')}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-40">بعدی</button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-black text-ink">{title}</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:max-h-72 lg:block lg:space-y-1 lg:overflow-y-auto lg:pl-1">{children}</div>
    </section>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-right text-sm transition lg:w-full ${active ? 'bg-ink font-bold text-white' : 'text-slate-700 hover:bg-primary-50 hover:text-primary-800'}`}>
      {children}
    </button>
  );
}

function ActiveFilter({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-bold text-primary-800">
      {label}
      <button onClick={onClear} aria-label={`حذف فیلتر ${label}`} className="rounded-full text-primary-600 hover:text-primary-950">×</button>
    </span>
  );
}
