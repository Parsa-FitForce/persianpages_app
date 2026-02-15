import { Link } from 'react-router-dom';
import type { Category } from '../types';

interface Props {
  category: Category;
  countryCode?: string;
}

export default function CategoryCard({ category, countryCode }: Props) {
  const searchUrl = countryCode
    ? `/search?category=${category.slug}&country=${countryCode}`
    : `/search?category=${category.slug}`;

  return (
    <Link
      to={searchUrl}
      className="card p-3 md:p-6 text-center hover:shadow-md transition-shadow"
    >
      <div className="text-2xl md:text-4xl mb-1 md:mb-3">{category.icon}</div>
      <h3 className="font-medium text-gray-900 text-xs md:text-base">{category.nameFa}</h3>
    </Link>
  );
}
