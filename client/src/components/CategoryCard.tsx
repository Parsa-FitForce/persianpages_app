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
      className="card p-6 text-center hover:shadow-md transition-shadow"
    >
      <div className="text-4xl mb-3">{category.icon}</div>
      <h3 className="font-medium text-gray-900">{category.nameFa}</h3>
    </Link>
  );
}
