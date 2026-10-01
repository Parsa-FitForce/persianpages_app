import { Link } from 'react-router-dom';

export default function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 whitespace-nowrap" aria-label="پرشین‌پیجز، صفحه اصلی">
      <span className={`relative grid h-9 w-9 place-items-center rounded-xl ${inverted ? 'bg-white text-primary-800' : 'bg-ink text-white'}`} aria-hidden="true">
        <span className="absolute h-3.5 w-3.5 rotate-45 rounded-[3px] bg-saffron" />
        <span className={`relative h-1.5 w-1.5 rotate-45 rounded-[1px] ${inverted ? 'bg-primary-800' : 'bg-ink'}`} />
      </span>
      <span className="leading-none">
        <span className={`block text-lg font-black tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>پرشین‌پیجز</span>
        <span className={`mt-1 block text-[10px] font-semibold tracking-[0.12em] font-latin ${inverted ? 'text-primary-100' : 'text-slate-500'}`} dir="ltr">PERSIAN PAGES</span>
      </span>
    </Link>
  );
}
