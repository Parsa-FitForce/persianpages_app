// Top 100+ cities with significant Iranian diaspora populations
// Sources: Wikipedia Iranian diaspora, UCLA, Migration Policy Institute

export interface Country {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  population: string; // Approximate Iranian population
  dialCode: string;
}

export const countries: Country[] = [
  { code: 'us', name: 'آمریکا', nameEn: 'United States', flag: '🇺🇸', population: '~600,000', dialCode: '+1' },
  { code: 'ca', name: 'کانادا', nameEn: 'Canada', flag: '🇨🇦', population: '~400,000', dialCode: '+1' },
  { code: 'de', name: 'آلمان', nameEn: 'Germany', flag: '🇩🇪', population: '~320,000', dialCode: '+49' },
  { code: 'ae', name: 'امارات', nameEn: 'UAE', flag: '🇦🇪', population: '~300,000', dialCode: '+971' },
  { code: 'tr', name: 'ترکیه', nameEn: 'Turkey', flag: '🇹🇷', population: '~200,000', dialCode: '+90' },
  { code: 'gb', name: 'انگلستان', nameEn: 'United Kingdom', flag: '🇬🇧', population: '~150,000', dialCode: '+44' },
  { code: 'se', name: 'سوئد', nameEn: 'Sweden', flag: '🇸🇪', population: '~120,000', dialCode: '+46' },
  { code: 'au', name: 'استرالیا', nameEn: 'Australia', flag: '🇦🇺', population: '~100,000', dialCode: '+61' },
  { code: 'fr', name: 'فرانسه', nameEn: 'France', flag: '🇫🇷', population: '~60,000', dialCode: '+33' },
  { code: 'nl', name: 'هلند', nameEn: 'Netherlands', flag: '🇳🇱', population: '~50,000', dialCode: '+31' },
  { code: 'at', name: 'اتریش', nameEn: 'Austria', flag: '🇦🇹', population: '~40,000', dialCode: '+43' },
  { code: 'it', name: 'ایتالیا', nameEn: 'Italy', flag: '🇮🇹', population: '~30,000', dialCode: '+39' },
  { code: 'es', name: 'اسپانیا', nameEn: 'Spain', flag: '🇪🇸', population: '~25,000', dialCode: '+34' },
  { code: 'no', name: 'نروژ', nameEn: 'Norway', flag: '🇳🇴', population: '~20,000', dialCode: '+47' },
  { code: 'dk', name: 'دانمارک', nameEn: 'Denmark', flag: '🇩🇰', population: '~18,000', dialCode: '+45' },
  { code: 'be', name: 'بلژیک', nameEn: 'Belgium', flag: '🇧🇪', population: '~15,000', dialCode: '+32' },
  { code: 'ch', name: 'سوئیس', nameEn: 'Switzerland', flag: '🇨🇭', population: '~12,000', dialCode: '+41' },
  { code: 'nz', name: 'نیوزیلند', nameEn: 'New Zealand', flag: '🇳🇿', population: '~10,000', dialCode: '+64' },
  { code: 'jp', name: 'ژاپن', nameEn: 'Japan', flag: '🇯🇵', population: '~8,000', dialCode: '+81' },
  { code: 'my', name: 'مالزی', nameEn: 'Malaysia', flag: '🇲🇾', population: '~7,000', dialCode: '+60' },
];

export interface City {
  name: string;
  nameEn: string;
  country: string; // country code
}

export const cities: City[] = [
  // United States - Major Iranian population centers
  { name: 'لس‌آنجلس', nameEn: 'Los Angeles', country: 'us' },
  { name: 'بورلی‌هیلز', nameEn: 'Beverly Hills', country: 'us' },
  { name: 'ارواین', nameEn: 'Irvine', country: 'us' },
  { name: 'گلندیل', nameEn: 'Glendale', country: 'us' },
  { name: 'سانتا مونیکا', nameEn: 'Santa Monica', country: 'us' },
  { name: 'انسینو', nameEn: 'Encino', country: 'us' },
  { name: 'وودلند هیلز', nameEn: 'Woodland Hills', country: 'us' },
  { name: 'سن‌دیگو', nameEn: 'San Diego', country: 'us' },
  { name: 'سانفرانسیسکو', nameEn: 'San Francisco', country: 'us' },
  { name: 'سن‌خوزه', nameEn: 'San Jose', country: 'us' },
  { name: 'پالو آلتو', nameEn: 'Palo Alto', country: 'us' },
  { name: 'ساکرامنتو', nameEn: 'Sacramento', country: 'us' },
  { name: 'فرزنو', nameEn: 'Fresno', country: 'us' },
  { name: 'هیوستون', nameEn: 'Houston', country: 'us' },
  { name: 'دالاس', nameEn: 'Dallas', country: 'us' },
  { name: 'آستین', nameEn: 'Austin', country: 'us' },
  { name: 'سن‌آنتونیو', nameEn: 'San Antonio', country: 'us' },
  { name: 'نیویورک', nameEn: 'New York', country: 'us' },
  { name: 'گریت‌نک', nameEn: 'Great Neck', country: 'us' },
  { name: 'واشنگتن', nameEn: 'Washington DC', country: 'us' },
  { name: 'شیکاگو', nameEn: 'Chicago', country: 'us' },
  { name: 'سیاتل', nameEn: 'Seattle', country: 'us' },
  { name: 'بوستون', nameEn: 'Boston', country: 'us' },
  { name: 'مایامی', nameEn: 'Miami', country: 'us' },
  { name: 'آتلانتا', nameEn: 'Atlanta', country: 'us' },
  { name: 'فینیکس', nameEn: 'Phoenix', country: 'us' },
  { name: 'لاس‌وگاس', nameEn: 'Las Vegas', country: 'us' },
  { name: 'دنور', nameEn: 'Denver', country: 'us' },
  { name: 'پورتلند', nameEn: 'Portland', country: 'us' },
  { name: 'فیلادلفیا', nameEn: 'Philadelphia', country: 'us' },
  { name: 'بالتیمور', nameEn: 'Baltimore', country: 'us' },
  { name: 'مینیاپولیس', nameEn: 'Minneapolis', country: 'us' },
  { name: 'سالت‌لیک‌سیتی', nameEn: 'Salt Lake City', country: 'us' },

  // Canada - Major Iranian population centers (Tehranto)
  { name: 'تورنتو', nameEn: 'Toronto', country: 'ca' },
  { name: 'ونکوور', nameEn: 'Vancouver', country: 'ca' },
  { name: 'مونترال', nameEn: 'Montreal', country: 'ca' },
  { name: 'کلگری', nameEn: 'Calgary', country: 'ca' },
  { name: 'اتاوا', nameEn: 'Ottawa', country: 'ca' },
  { name: 'ادمونتون', nameEn: 'Edmonton', country: 'ca' },
  { name: 'وینیپگ', nameEn: 'Winnipeg', country: 'ca' },
  { name: 'ریچموند‌هیل', nameEn: 'Richmond Hill', country: 'ca' },
  { name: 'نورث‌یورک', nameEn: 'North York', country: 'ca' },
  { name: 'مارکهام', nameEn: 'Markham', country: 'ca' },

  // Germany - 320,000 Iranians
  { name: 'برلین', nameEn: 'Berlin', country: 'de' },
  { name: 'مونیخ', nameEn: 'Munich', country: 'de' },
  { name: 'فرانکفورت', nameEn: 'Frankfurt', country: 'de' },
  { name: 'هامبورگ', nameEn: 'Hamburg', country: 'de' },
  { name: 'کلن', nameEn: 'Cologne', country: 'de' },
  { name: 'دوسلدورف', nameEn: 'Dusseldorf', country: 'de' },
  { name: 'اشتوتگارت', nameEn: 'Stuttgart', country: 'de' },
  { name: 'هانوفر', nameEn: 'Hannover', country: 'de' },
  { name: 'بن', nameEn: 'Bonn', country: 'de' },
  { name: 'نورنبرگ', nameEn: 'Nuremberg', country: 'de' },

  // UAE - 300,000 Iranians
  { name: 'دبی', nameEn: 'Dubai', country: 'ae' },
  { name: 'ابوظبی', nameEn: 'Abu Dhabi', country: 'ae' },
  { name: 'شارجه', nameEn: 'Sharjah', country: 'ae' },
  { name: 'عجمان', nameEn: 'Ajman', country: 'ae' },

  // Turkey - 200,000 Iranians
  { name: 'استانبول', nameEn: 'Istanbul', country: 'tr' },
  { name: 'آنکارا', nameEn: 'Ankara', country: 'tr' },
  { name: 'ازمیر', nameEn: 'Izmir', country: 'tr' },
  { name: 'آنتالیا', nameEn: 'Antalya', country: 'tr' },
  { name: 'بورسا', nameEn: 'Bursa', country: 'tr' },
  { name: 'وان', nameEn: 'Van', country: 'tr' },

  // United Kingdom - 150,000 Iranians
  { name: 'لندن', nameEn: 'London', country: 'gb' },
  { name: 'منچستر', nameEn: 'Manchester', country: 'gb' },
  { name: 'بیرمنگام', nameEn: 'Birmingham', country: 'gb' },
  { name: 'لیدز', nameEn: 'Leeds', country: 'gb' },
  { name: 'گلاسگو', nameEn: 'Glasgow', country: 'gb' },
  { name: 'بریستول', nameEn: 'Bristol', country: 'gb' },
  { name: 'لیورپول', nameEn: 'Liverpool', country: 'gb' },
  { name: 'نیوکاسل', nameEn: 'Newcastle', country: 'gb' },

  // Sweden - 120,000 Iranians
  { name: 'استکهلم', nameEn: 'Stockholm', country: 'se' },
  { name: 'گوتنبرگ', nameEn: 'Gothenburg', country: 'se' },
  { name: 'اوپسالا', nameEn: 'Uppsala', country: 'se' },
  { name: 'مالمو', nameEn: 'Malmo', country: 'se' },
  { name: 'لینشوپینگ', nameEn: 'Linkoping', country: 'se' },

  // Australia - 100,000 Iranians
  { name: 'سیدنی', nameEn: 'Sydney', country: 'au' },
  { name: 'ملبورن', nameEn: 'Melbourne', country: 'au' },
  { name: 'بریزبن', nameEn: 'Brisbane', country: 'au' },
  { name: 'پرث', nameEn: 'Perth', country: 'au' },
  { name: 'آدلاید', nameEn: 'Adelaide', country: 'au' },
  { name: 'کانبرا', nameEn: 'Canberra', country: 'au' },

  // France - 60,000 Iranians
  { name: 'پاریس', nameEn: 'Paris', country: 'fr' },
  { name: 'لیون', nameEn: 'Lyon', country: 'fr' },
  { name: 'مارسی', nameEn: 'Marseille', country: 'fr' },
  { name: 'تولوز', nameEn: 'Toulouse', country: 'fr' },
  { name: 'نیس', nameEn: 'Nice', country: 'fr' },

  // Netherlands - 50,000 Iranians
  { name: 'آمستردام', nameEn: 'Amsterdam', country: 'nl' },
  { name: 'روتردام', nameEn: 'Rotterdam', country: 'nl' },
  { name: 'لاهه', nameEn: 'The Hague', country: 'nl' },
  { name: 'اوترخت', nameEn: 'Utrecht', country: 'nl' },
  { name: 'آیندهوون', nameEn: 'Eindhoven', country: 'nl' },

  // Austria - 40,000 Iranians
  { name: 'وین', nameEn: 'Vienna', country: 'at' },
  { name: 'سالزبورگ', nameEn: 'Salzburg', country: 'at' },
  { name: 'گراتس', nameEn: 'Graz', country: 'at' },
  { name: 'لینتس', nameEn: 'Linz', country: 'at' },

  // Italy - 30,000 Iranians
  { name: 'میلان', nameEn: 'Milan', country: 'it' },
  { name: 'رم', nameEn: 'Rome', country: 'it' },
  { name: 'تورین', nameEn: 'Turin', country: 'it' },
  { name: 'بولونیا', nameEn: 'Bologna', country: 'it' },

  // Spain - 25,000 Iranians
  { name: 'مادرید', nameEn: 'Madrid', country: 'es' },
  { name: 'بارسلونا', nameEn: 'Barcelona', country: 'es' },
  { name: 'والنسیا', nameEn: 'Valencia', country: 'es' },

  // Norway - 20,000 Iranians
  { name: 'اسلو', nameEn: 'Oslo', country: 'no' },
  { name: 'برگن', nameEn: 'Bergen', country: 'no' },
  { name: 'تروندهایم', nameEn: 'Trondheim', country: 'no' },

  // Denmark - 18,000 Iranians
  { name: 'کپنهاگ', nameEn: 'Copenhagen', country: 'dk' },
  { name: 'آرهوس', nameEn: 'Aarhus', country: 'dk' },
  { name: 'اودنسه', nameEn: 'Odense', country: 'dk' },

  // Belgium - 15,000 Iranians
  { name: 'بروکسل', nameEn: 'Brussels', country: 'be' },
  { name: 'آنتورپ', nameEn: 'Antwerp', country: 'be' },
  { name: 'گنت', nameEn: 'Ghent', country: 'be' },

  // Switzerland - 12,000 Iranians
  { name: 'زوریخ', nameEn: 'Zurich', country: 'ch' },
  { name: 'ژنو', nameEn: 'Geneva', country: 'ch' },
  { name: 'برن', nameEn: 'Bern', country: 'ch' },
  { name: 'بازل', nameEn: 'Basel', country: 'ch' },

  // New Zealand - 10,000 Iranians
  { name: 'اوکلند', nameEn: 'Auckland', country: 'nz' },
  { name: 'ولینگتون', nameEn: 'Wellington', country: 'nz' },
  { name: 'کرایستچرچ', nameEn: 'Christchurch', country: 'nz' },

  // Japan - 8,000 Iranians
  { name: 'توکیو', nameEn: 'Tokyo', country: 'jp' },
  { name: 'اوساکا', nameEn: 'Osaka', country: 'jp' },
  { name: 'یوکوهاما', nameEn: 'Yokohama', country: 'jp' },

  // Malaysia - 7,000 Iranians
  { name: 'کوالالامپور', nameEn: 'Kuala Lumpur', country: 'my' },
  { name: 'پنانگ', nameEn: 'Penang', country: 'my' },
];

// Slug helpers
export const toSlug = (nameEn: string): string => {
  return nameEn.toLowerCase().replace(/\s+/g, '-');
};

export const getCityBySlug = (countryCode: string, slug: string): City | undefined => {
  return cities.find(c => c.country === countryCode && toSlug(c.nameEn) === slug);
};

// Helper functions
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code);
};

export const getCitiesByCountry = (countryCode: string): City[] => {
  return cities.filter(c => c.country === countryCode);
};

export const getAllCities = (): City[] => {
  return cities;
};

export const searchCities = (query: string, countryCode?: string): City[] => {
  let filtered = countryCode ? getCitiesByCountry(countryCode) : cities;
  if (!query) return filtered.slice(0, 15);

  const lowerQuery = query.toLowerCase();
  return filtered.filter(
    c => c.name.includes(query) || c.nameEn.toLowerCase().includes(lowerQuery)
  ).slice(0, 15);
};

export const searchCountries = (query: string): Country[] => {
  if (!query) return countries;
  const lowerQuery = query.toLowerCase();
  return countries.filter(
    c => c.name.includes(query) || c.nameEn.toLowerCase().includes(lowerQuery)
  );
};
