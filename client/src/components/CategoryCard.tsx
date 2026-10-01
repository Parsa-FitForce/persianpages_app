import { Link } from 'react-router-dom';
import type { Category } from '../types';

export default function CategoryCard({ category, countryCode }: { category: Category; countryCode?: string }) {
  const to = countryCode ? `/browse/${countryCode}/category/${category.slug}` : `/search?category=${category.slug}`;
  return (
    <Link to={to} className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50/50 md:min-h-36 md:p-5">
      <span className="text-3xl" aria-hidden="true">{category.icon}</span>
      <span className="mt-4 flex items-end justify-between gap-2 font-bold text-ink group-hover:text-primary-800">
        <span>{category.nameFa}</span>
        <svg className="h-4 w-4 shrink-0 rotate-180 text-slate-300 group-hover:text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </span>
    </Link>
  );
}
