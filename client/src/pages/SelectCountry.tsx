import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { countries } from '../i18n/locations';

export default function SelectCountry() {
  const navigate = useNavigate();

  const handleCountrySelect = (countryCode: string) => {
    localStorage.setItem('selectedCountry', countryCode);
    navigate(`/?country=${countryCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-primary-600 to-primary-800">
      <Helmet>
        <title>انتخاب کشور | پرشین‌پیجز</title>
        <meta name="description" content="کشور خود را انتخاب کنید و کسب‌وکارهای ایرانی نزدیک خود را پیدا کنید. بیش از ۲۰ کشور و ۱۰۰ شهر." />
        <link rel="canonical" href="https://persianpages.com/select-country" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            پرشین‌پیجز
          </h1>
          <p className="text-xl text-primary-100 mb-2">
            راهنمای کسب‌وکارهای ایرانی در سراسر جهان
          </p>
          <p className="text-primary-200">
            کشور خود را انتخاب کنید
          </p>
        </div>

        {/* Country Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {countries.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country.code)}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-5 text-center hover:bg-white/20 transition-all hover:scale-105 border border-white/20 group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{country.flag}</div>
              <h3 className="font-semibold text-white text-lg mb-1">{country.name}</h3>
              <p className="text-primary-200 text-sm font-latin">{country.nameEn}</p>
            </button>
          ))}
        </div>

        {/* All Countries Link */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
              localStorage.removeItem('selectedCountry');
              navigate('/');
            }}
            className="text-white/80 hover:text-white underline"
          >
            مشاهده همه کشورها
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-primary-200 text-sm">
          <p>۲۰+ کشور • ۱۰۰+ شهر</p>
        </div>
      </div>
    </div>
  );
}
