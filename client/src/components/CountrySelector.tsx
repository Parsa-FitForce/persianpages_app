import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { countries, getCountryByCode, type Country } from '../i18n/locations';

interface Props {
  compact?: boolean;
}

export default function CountrySelector({ compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const countryCode = searchParams.get('country') || localStorage.getItem('selectedCountry');
    if (countryCode) {
      const country = getCountryByCode(countryCode);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [searchParams]);

  const handleSelect = (country: Country | null) => {
    if (country) {
      localStorage.setItem('selectedCountry', country.code);
      setSearchParams({ country: country.code });
    } else {
      localStorage.removeItem('selectedCountry');
      searchParams.delete('country');
      setSearchParams(searchParams);
    }
    setSelectedCountry(country);
    setIsOpen(false);
  };

  const handleChangeCountry = () => {
    navigate('/select-country');
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
        >
          {selectedCountry ? (
            <>
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <>
              <span>🌍</span>
              <span>همه کشورها</span>
            </>
          )}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 sm:right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
              <button
                onClick={() => handleSelect(null)}
                className={`w-full px-4 py-3 text-right hover:bg-gray-50 flex items-center gap-3 ${
                  !selectedCountry ? 'bg-primary-50 text-primary-600' : ''
                }`}
              >
                <span className="text-xl">🌍</span>
                <div>
                  <div className="font-medium">همه کشورها</div>
                  <div className="text-xs text-gray-500 font-latin">All Countries</div>
                </div>
              </button>
              <div className="border-t border-gray-100" />
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleSelect(country)}
                  className={`w-full px-4 py-3 text-right hover:bg-gray-50 flex items-center gap-3 ${
                    selectedCountry?.code === country.code ? 'bg-primary-50 text-primary-600' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{country.name}</div>
                    <div className="text-xs text-gray-500 font-latin">{country.nameEn}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {selectedCountry ? (
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedCountry.flag}</span>
          <div>
            <div className="font-medium">{selectedCountry.name}</div>
            <div className="text-xs text-gray-500 font-latin">{selectedCountry.nameEn}</div>
          </div>
          <button
            onClick={handleChangeCountry}
            className="text-sm text-primary-600 hover:underline mr-2"
          >
            تغییر
          </button>
        </div>
      ) : (
        <button
          onClick={handleChangeCountry}
          className="text-primary-600 hover:underline"
        >
          انتخاب کشور
        </button>
      )}
    </div>
  );
}
