import { Link } from 'react-router-dom';
import type { Category } from '../types';

interface Props {
  category: Category;
}

export default function CategoryCard({ category }: Props) {
  return (
    <Link
      to={`/search?category=${category.slug}`}
      className="card p-6 text-center hover:shadow-md transition-shadow"
    >
      <div className="text-4xl mb-3">{category.icon}</div>
      <h3 className="font-medium text-gray-900">{category.nameFa}</h3>
    </Link>
  );
}
