// Real Iranian/Persian businesses scraped from the web
// These are unclaimed listings that business owners can claim

export interface ScrapedBusiness {
  title: string;
  titleEn: string;
  description: string;
  categorySlug: string;
  phone?: string;
  address: string;
  city: string;
  country: string;
  website?: string;
  socialLinks?: Record<string, string>;
}

export const scrapedBusinesses: ScrapedBusiness[] = [
  // ============================
  // Los Angeles, USA (6)
  // ============================
  {
    title: 'گریل شمشیری',
    titleEn: 'Shamshiri Grill',
    description:
      'رستوران معروف ایرانی در وست‌وود لس‌آنجلس با بیش از ۳۰ سال سابقه. ارائه انواع کباب، چلوکباب سلطانی و غذاهای اصیل ایرانی. یکی از محبوب‌ترین رستوران‌های ایرانی در کالیفرنیا.',
    categorySlug: 'restaurant',
    phone: '+1 (310) 474-1410',
    address: '1712 Westwood Blvd, Los Angeles, CA 90024',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    website: 'https://shamshiri.com',
    socialLinks: { instagram: 'shamshirigrill' },
  },
  {
    title: 'رستوران جوان',
    titleEn: 'Javan Restaurant',
    description:
      'رستوران ایرانی جوان در سانتا مونیکا بولوارد. سرو انواع غذاهای ایرانی شامل کباب کوبیده، جوجه کباب، خورشت قورمه‌سبزی و قیمه. فضای خانوادگی و دنج.',
    categorySlug: 'restaurant',
    phone: '+1 (310) 207-5555',
    address: '11500 Santa Monica Blvd, Los Angeles, CA 90025',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    socialLinks: { instagram: 'javanrestaurant' },
  },
  {
    title: 'برنجک',
    titleEn: 'Berenjak',
    description:
      'رستوران ایرانی مدرن در مرکز لس‌آنجلس. ترکیبی از آشپزی سنتی ایرانی با ارائه مدرن. کباب‌های زغالی، مزه‌های ایرانی و دسرهای خانگی.',
    categorySlug: 'restaurant',
    phone: '',
    address: '1010 S Santa Fe Ave, Los Angeles, CA 90021',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    website: 'https://berenjak.com',
    socialLinks: { instagram: 'berenjakrestaurant' },
  },
  {
    title: 'مارکت تهران',
    titleEn: 'Tehran Market',
    description:
      'سوپرمارکت ایرانی معتبر در سانتا مونیکا. عرضه انواع مواد غذایی ایرانی و خاورمیانه‌ای شامل نان تازه، ادویه‌جات، برنج ایرانی، خشکبار و لبنیات. از سال‌ها پیش در خدمت جامعه ایرانی.',
    categorySlug: 'grocery',
    phone: '+1 (310) 393-6719',
    address: '1417 Wilshire Blvd, Santa Monica, CA 90403',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
  },
  {
    title: 'مارکت الات',
    titleEn: 'Elat Market',
    description:
      'فروشگاه مواد غذایی ایرانی و کوشر در لس‌آنجلس. عرضه محصولات ایرانی، اسرائیلی و خاورمیانه‌ای. انواع ادویه، کنسرو، ترشیجات و مواد غذایی تازه.',
    categorySlug: 'grocery',
    phone: '+1 (310) 659-7070',
    address: '8730 W Pico Blvd, Los Angeles, CA 90035',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    website: 'https://elatsupermarket.com',
  },
  {
    title: 'دفتر وکالت کن بهزادی',
    titleEn: 'Law Office of Ken Behzadi',
    description:
      'وکیل مهاجرت ایرانی در لس‌آنجلس. متخصص در امور ویزا، گرین‌کارت، پناهندگی و دفاع از اخراج. مسلط به فارسی و انگلیسی. عضو انجمن وکلای مهاجرت آمریکا.',
    categorySlug: 'legal',
    phone: '+1 (310) 441-9341',
    address: '400 Corporate Pointe, Suite 300, Culver City, CA 90230',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    website: 'https://behzadiimmigrationlaw.com',
  },

  // ============================
  // Toronto, Canada (5)
  // ============================
  {
    title: 'ملکه پارس',
    titleEn: 'Queen of Persia',
    description:
      'رستوران ایرانی در خیابان سنت کلر تورنتو. سرو غذاهای اصیل ایرانی شامل انواع کباب، خورشت و برنج. فضای گرم و دوستانه با سرویس عالی.',
    categorySlug: 'restaurant',
    phone: '+1 (416) 651-5500',
    address: '672A St Clair Avenue W, Toronto, ON M6C 1B1',
    city: 'تورنتو',
    country: 'کانادا',
  },
  {
    title: 'کبابی',
    titleEn: 'Kababi',
    description:
      'رستوران کباب ایرانی در خیابان دن‌فورث تورنتو. تخصص در کباب کوبیده، کباب برگ و جوجه کباب. قیمت مناسب و کیفیت بالا. سرویس بیرون‌بر موجود.',
    categorySlug: 'restaurant',
    phone: '+1 (416) 461-8867',
    address: '341 Danforth Ave, Toronto, ON',
    city: 'تورنتو',
    country: 'کانادا',
    website: 'https://kababi.ca',
  },
  {
    title: 'رستوران زعفران',
    titleEn: 'Zaffron Restaurant',
    description:
      'رستوران ایرانی زعفران در نورث‌یورک. ارائه غذاهای سنتی ایرانی با کیفیت بالا. باقالی‌پلو با ماهیچه، زرشک‌پلو با مرغ و انواع کباب. مناسب برای مراسم و مهمانی.',
    categorySlug: 'restaurant',
    phone: '+1 (416) 223-7070',
    address: '6200 Yonge Street, North York, ON',
    city: 'تورنتو',
    country: 'کانادا',
    website: 'https://zaffron.ca',
    socialLinks: { instagram: 'zaffronrestaurant' },
  },
  {
    title: 'سالن و اسپا هیرپلی',
    titleEn: 'HairPlay Salon & Spa',
    description:
      'سالن زیبایی ایرانی در خیابان سنت کلر تورنتو. خدمات کوتاهی مو، رنگ، هایلایت، کراتین و اکستنشن. آرایش عروس و شنیون مجلسی. محصولات حرفه‌ای.',
    categorySlug: 'beauty',
    phone: '',
    address: '638 St. Clair Avenue West, Toronto, ON M6C 1A9',
    city: 'تورنتو',
    country: 'کانادا',
  },
  {
    title: 'دفتر حقوقی جعفری',
    titleEn: 'Jafari Law',
    description:
      'دفتر حقوقی تخصصی مهاجرت و شهروندی در تورنتو. خدمات حقوقی تجاری و دعاوی. مسلط به فارسی، انگلیسی، اسپانیایی و ترکی. مشاوره حضوری و آنلاین.',
    categorySlug: 'legal',
    phone: '+1 855-523-2741',
    address: 'Toronto, ON',
    city: 'تورنتو',
    country: 'کانادا',
    website: 'https://jafarilaw.ca',
  },

  // ============================
  // London, UK (4)
  // ============================
  {
    title: 'رستوران ایران',
    titleEn: 'Iran Restaurant',
    description:
      'رستوران ایرانی تاریخی در می‌فر لندن. یکی از قدیمی‌ترین رستوران‌های ایرانی در لندن. سرو غذاهای اصیل ایرانی از ظهر تا نیمه‌شب، هفت روز هفته.',
    categorySlug: 'restaurant',
    phone: '+44 20 7409 3337',
    address: '27 Shepherd Market, Mayfair, London W1J 7PR',
    city: 'لندن',
    country: 'انگلستان',
    website: 'https://www.iranrestaurant.co.uk',
  },
  {
    title: 'رستوران پردیس',
    titleEn: 'Pardis Persian Restaurant',
    description:
      'رستوران ایرانی پردیس در پدینگتون لندن. ارائه غذاهای سنتی ایرانی شامل انواع کباب، خورشت و برنج زعفرانی. فضای سنتی و دلنشین.',
    categorySlug: 'restaurant',
    phone: '+44 20 7402 8933',
    address: '29 Connaught Street, Paddington, London W2 2AY',
    city: 'لندن',
    country: 'انگلستان',
  },
  {
    title: 'رستوران نارون',
    titleEn: 'Naroon Persian Restaurant',
    description:
      'رستوران ایرانی نارون در مرکز لندن. آشپزی ایرانی با مواد اولیه تازه و با کیفیت. منوی متنوع شامل کباب، خورشت و مزه‌های ایرانی.',
    categorySlug: 'restaurant',
    phone: '+44 20 7436 0934',
    address: '60 Great Titchfield Street, London W1W 7QF',
    city: 'لندن',
    country: 'انگلستان',
  },
  {
    title: 'کیش میش',
    titleEn: 'Kish Mish',
    description:
      'رستوران و کافه ایرانی مدیترانه‌ای در جنوب لندن. ترکیبی از غذاهای ایرانی و مدیترانه‌ای. فضای دنج و خانوادگی.',
    categorySlug: 'restaurant',
    phone: '+44 20 8670 6969',
    address: 'L.G.F 13-14, Crystal Palace Parade, London SE19 1UA',
    city: 'لندن',
    country: 'انگلستان',
    website: 'https://www.kish-mish.co.uk',
  },

  // ============================
  // Dubai, UAE (5)
  // ============================
  {
    title: 'رستوران ایران‌زمین',
    titleEn: 'Iran Zamin Restaurant',
    description:
      'رستوران معروف ایرانی ایران‌زمین در دبی. از سال ۲۰۰۳ در خدمت جامعه ایرانی. دارای چندین شعبه در سراسر دبی. غذاهای اصیل ایرانی با کیفیت عالی.',
    categorySlug: 'restaurant',
    phone: '+971 4 447 6656',
    address: 'Downtown Dubai, Dubai',
    city: 'دبی',
    country: 'امارات',
    website: 'https://www.iranzaminonline.com',
    socialLinks: { instagram: 'iranzamindubai' },
  },
  {
    title: 'رستوران شبستان',
    titleEn: 'Shabestan Restaurant',
    description:
      'رستوران ایرانی شبستان در هتل رادیسون بلو دبی. ارائه غذاهای اصیل ایرانی در فضایی لوکس و شیک. انواع کباب، برنج و خورشت‌های سنتی.',
    categorySlug: 'restaurant',
    phone: '+971 4 205 7033',
    address: 'Radisson Blu Hotel, Baniyas Road, Deira, Dubai',
    city: 'دبی',
    country: 'امارات',
  },
  {
    title: 'آشپزخانه ایرانی آریانا',
    titleEn: "Ariana's Persian Kitchen",
    description:
      'رستوران ایرانی آریانا در هتل آتلانتیس رویال دبی. آشپزی ایرانی در سطح جهانی. برنده ستاره میشلن. تجربه‌ای منحصر به فرد از غذاهای ایرانی.',
    categorySlug: 'restaurant',
    phone: '+971 4 426 2626',
    address: 'Atlantis The Royal, Palm Jumeirah, Dubai',
    city: 'دبی',
    country: 'امارات',
    website: 'https://www.atlantis.com/dubai/dining/arianas-kitchen',
    socialLinks: { instagram: 'arianaspk' },
  },
  {
    title: 'رستوران پارس',
    titleEn: 'Pars Iranian Restaurant',
    description:
      'رستوران ایرانی پارس در منطقه الجافلیه دبی. سرو غذاهای سنتی ایرانی با طعم خانگی. کباب کوبیده، چلوکباب و خورشت. قیمت مناسب و سرویس سریع.',
    categorySlug: 'restaurant',
    phone: '',
    address: 'Al Jafliya, Dubai',
    city: 'دبی',
    country: 'امارات',
  },
  {
    title: 'ایران‌زمین مارینا',
    titleEn: 'Iran Zamin Marina',
    description:
      'شعبه مارینا رستوران ایران‌زمین. از سال ۲۰۰۹ در دبی مارینا فعال. غذاهای اصیل ایرانی با منظره زیبای مارینا. امکان سفارش آنلاین.',
    categorySlug: 'restaurant',
    phone: '',
    address: 'Dubai Marina, Dubai',
    city: 'دبی',
    country: 'امارات',
    website: 'https://www.izmarina.com',
    socialLinks: { instagram: 'iranzamindubai' },
  },

  // ============================
  // Additional businesses from research
  // ============================

  // Los Angeles - additional
  {
    title: 'رستوران رفیز پلیس',
    titleEn: "Raffi's Place",
    description:
      'یکی از معروف‌ترین رستوران‌های ایرانی در گلندیل. تخصص در کباب‌های اصیل ایرانی. کباب کوبیده، کباب برگ و جوجه کباب با برنج زعفرانی. محبوب در جامعه ایرانی کالیفرنیا.',
    categorySlug: 'restaurant',
    phone: '+1 (818) 240-7411',
    address: '211 E Broadway, Glendale, CA 91205',
    city: 'گلندیل',
    country: 'آمریکا',
    website: 'https://raffisplace.com',
    socialLinks: { instagram: 'raffisplace' },
  },
  {
    title: 'رستوران فرید',
    titleEn: 'Farid Restaurant',
    description:
      'رستوران ایرانی فرید در مرکز شهر لس‌آنجلس. سرو غذاهای اصیل ایرانی در فضایی گرم و صمیمی. کباب، خورشت و برنج ایرانی.',
    categorySlug: 'restaurant',
    phone: '+1 (213) 622-0808',
    address: '635 S Broadway, Los Angeles, CA 90014',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
  },

  // Toronto - additional
  {
    title: 'رستوران انار',
    titleEn: 'Pomegranate Restaurant',
    description:
      'رستوران ایرانی انار در خیابان کالج تورنتو. از رستوران‌های قدیمی و محبوب ایرانی در تورنتو. کباب، خورشت و غذاهای سنتی ایرانی با کیفیت بالا.',
    categorySlug: 'restaurant',
    phone: '+1 (416) 921-7557',
    address: '420 College St, Toronto, ON M5T 1S9',
    city: 'تورنتو',
    country: 'کانادا',
    website: 'https://pomegranaterestaurant.ca',
  },
  {
    title: 'نانوایی یاس',
    titleEn: 'Yas Bakery',
    description:
      'نانوایی ایرانی یاس در نورث‌یورک. نان سنگک، بربری و لواش تازه هر روز. شیرینی‌های ایرانی و نان‌های مخصوص. محبوب در محله ایرانی‌نشین یانگ استریت.',
    categorySlug: 'grocery',
    phone: '+1 (416) 223-5200',
    address: '5207 Yonge St, North York, ON',
    city: 'تورنتو',
    country: 'کانادا',
  },
  {
    title: 'سوپرمارکت ایران',
    titleEn: 'Iran Supermarket',
    description:
      'یکی از قدیمی‌ترین سوپرمارکت‌های ایرانی در تورنتو بزرگ. برنج ایرانی، ادویه‌جات، خشکبار و محصولات وارداتی ایرانی. خدمت‌رسانی به جامعه ایرانی از سال‌ها پیش.',
    categorySlug: 'grocery',
    phone: '+1 (416) 221-0011',
    address: '5765 Yonge St, North York, ON M2M 4J1',
    city: 'تورنتو',
    country: 'کانادا',
  },

  // London - additional
  {
    title: 'رستوران محسن',
    titleEn: 'Mohsen Restaurant',
    description:
      'رستوران ایرانی سنتی در کنزینگتون لندن. از رستوران‌های قدیمی و محبوب ایرانی در لندن. غذاهای خانگی ایرانی با طعم اصیل. قیمت مناسب و کیفیت عالی.',
    categorySlug: 'restaurant',
    phone: '+44 20 7602 9888',
    address: '152 Warwick Road, Kensington, London W14 8PS',
    city: 'لندن',
    country: 'انگلستان',
  },
  {
    title: 'رستوران کته',
    titleEn: 'Kateh Restaurant',
    description:
      'رستوران ایرانی کته در لیتل ونیس لندن. آشپزی ایرانی مدرن با مواد اولیه تازه و محلی. فضای شیک و رمانتیک. یکی از بهترین رستوران‌های ایرانی لندن.',
    categorySlug: 'restaurant',
    phone: '+44 20 7289 3393',
    address: '5 Warwick Place, Little Venice, London W9 2PX',
    city: 'لندن',
    country: 'انگلستان',
    website: 'https://www.katehrestaurant.co.uk',
  },

  // Dubai - additional
  {
    title: 'رستوران استادی',
    titleEn: 'Special Ostadi',
    description:
      'رستوران و کبابی ایرانی در دیره دبی. کباب‌های خوشمزه و قیمت مناسب. محبوب در میان جامعه ایرانی دبی. غذاهای سنتی با طعم خانگی.',
    categorySlug: 'restaurant',
    phone: '+971 4 226 1611',
    address: 'Al Murar, Deira, Dubai',
    city: 'دبی',
    country: 'امارات',
  },
  {
    title: 'آشپزخانه ایرانی پارس',
    titleEn: 'Pars Iranian Kitchen',
    description:
      'رستوران ایرانی پارس در مرکز خرید وافی دبی. غذاهای سنتی ایرانی شامل چلوکباب، قورمه‌سبزی و تهدیگ. فضای خانوادگی و دنج.',
    categorySlug: 'restaurant',
    phone: '+971 4 324 4666',
    address: 'Wafi Mall, Oud Metha, Dubai',
    city: 'دبی',
    country: 'امارات',
  },
];
