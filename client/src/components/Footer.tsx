import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="text-white font-bold text-lg">
            PersianPages | پرشین‌پیجز
          </Link>

          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy | حریم خصوصی
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms | شرایط استفاده
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 pt-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} PersianPages. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
