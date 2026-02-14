import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { categoriesApi, listingsApi, uploadApi } from '../services/api';
import OtpVerifyModal from '../components/OtpVerifyModal';
import type { Category } from '../types';
import { countries, cities, searchCities, getCountryByCode, type Country, type City } from '../i18n/locations';
import { resolveImageUrl } from '../utils/image';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { AsYouType, parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

function formatPhoneNumber(raw: string, countryCode: string): string {
  // Strip non-digit/+ chars for processing
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  const formatter = new AsYouType(countryCode.toUpperCase() as any);
  return formatter.input(digits);
}

function stripPhoneForStorage(formatted: string): string {
  const parsed = parsePhoneNumberFromString(formatted);
  if (parsed && parsed.isValid()) return parsed.format('E.164');
  // If it's just a dial code or empty, return empty
  const digits = formatted.replace(/[^\d+]/g, '');
  if (!digits || /^\+\d{1,3}$/.test(digits)) return '';
  return digits;
}

function extractSocialUsername(value: string): string {
  let v = value.trim();
  // Strip common URL prefixes
  for (const prefix of [
    'https://www.instagram.com/', 'https://instagram.com/', 'http://instagram.com/',
    'https://www.telegram.me/', 'https://telegram.me/', 'https://t.me/', 'http://t.me/',
    'https://www.t.me/',
  ]) {
    if (v.toLowerCase().startsWith(prefix)) {
      v = v.slice(prefix.length);
      break;
    }
  }
  // Strip leading @ and trailing /
  v = v.replace(/^@/, '').replace(/\/+$/, '');
  return v;
}

function ensureHttps(url: string): string {
  const v = url.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}

export default function ListingForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isLoaded } = useGoogleMaps();

  const [categories, setCategories] = useState<Category[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    website: '',
    instagram: '',
    telegram: '',
    whatsapp: '',
    photos: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));

    // Pre-select country from localStorage if available
    const savedCountry = localStorage.getItem('selectedCountry');
    if (savedCountry && !isEdit) {
      const country = getCountryByCode(savedCountry);
      if (country) {
        setForm(prev => ({ ...prev, country: country.name }));
        setSelectedCountryCode(savedCountry);
      }
    }

    if (isEdit && id) {
      listingsApi.getOne(id).then((res) => {
        const l = res.data;
        setForm({
          title: l.title,
          description: l.description,
          categoryId: l.categoryId,
          phone: l.phone || '',
          address: l.address,
          city: l.city,
          country: l.country,
          website: l.website || '',
          instagram: l.socialLinks?.instagram || '',
          telegram: l.socialLinks?.telegram || '',
          whatsapp: l.socialLinks?.whatsapp || '',
          photos: l.photos.length > 0 ? l.photos : [],
          isActive: l.isActive,
        });
        if (l.latitude != null) setLatitude(l.latitude);
        if (l.longitude != null) setLongitude(l.longitude);
        if (l.placeId) setPlaceId(l.placeId);
        // Find country code from name
        const foundCountry = countries.find(c => c.name === l.country);
        if (foundCountry) {
          setSelectedCountryCode(foundCountry.code);
          // Re-format stored phone numbers for display
          if (l.phone) {
            setForm(prev => ({ ...prev, phone: formatPhoneNumber(l.phone, foundCountry.code) }));
          }
          if (l.socialLinks?.whatsapp) {
            setForm(prev => ({ ...prev, whatsapp: formatPhoneNumber(l.socialLinks.whatsapp, foundCountry.code) }));
          }
        }
      });
    }
  }, [id, isEdit]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    const query = countrySearch.toLowerCase();
    return countries.filter(
      (c) => c.name.includes(countrySearch) || c.nameEn.toLowerCase().includes(query)
    );
  }, [countrySearch]);

  const availableCities = useMemo(() => {
    return searchCities(citySearch, selectedCountryCode || undefined);
  }, [citySearch, selectedCountryCode]);

  const selectedCountry = useMemo(() => {
    return selectedCountryCode ? getCountryByCode(selectedCountryCode) : undefined;
  }, [selectedCountryCode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCountrySelect = (country: Country) => {
    setForm((prev) => ({ ...prev, country: country.name, city: '' }));
    setSelectedCountryCode(country.code);
    setCountrySearch('');
    setCitySearch('');
    setShowCountryList(false);
  };

  const clearCountry = () => {
    setForm((prev) => ({ ...prev, country: '', city: '' }));
    setSelectedCountryCode('');
    setCountrySearch('');
    setCitySearch('');
  };

  const handleCitySelect = (city: City) => {
    setForm((prev) => ({ ...prev, city: city.name }));
    setCitySearch('');
    if (!form.country) {
      const country = getCountryByCode(city.country);
      if (country) {
        setForm((prev) => ({ ...prev, country: country.name }));
        setSelectedCountryCode(city.country);
      }
    }
    setShowCityList(false);
  };

  const clearCity = () => {
    setForm((prev) => ({ ...prev, city: '' }));
    setCitySearch('');
  };

  const handleCountryBlur = () => {
    setTimeout(() => {
      setShowCountryList(false);
      setCountrySearch('');
    }, 200);
  };

  const handleCityBlur = () => {
    setTimeout(() => {
      setShowCityList(false);
      setCitySearch('');
    }, 200);
  };

  const handlePhoneFocus = (field: 'phone' | 'whatsapp') => {
    if (!form[field] && selectedCountry) {
      setForm((prev) => ({ ...prev, [field]: selectedCountry.dialCode + ' ' }));
    }
  };

  const handlePhoneInput = (value: string, field: 'phone' | 'whatsapp') => {
    const formatted = formatPhoneNumber(value, selectedCountryCode);
    setForm((prev) => ({ ...prev, [field]: formatted }));
    if (field === 'phone' && !isEdit && phoneVerified) {
      setPhoneVerified(false);
      setVerificationToken('');
    }
  };

  const handleSocialInput = (value: string, field: 'instagram' | 'telegram') => {
    setForm((prev) => ({ ...prev, [field]: extractSocialUsername(value) }));
  };

  const handleWebsiteBlur = () => {
    if (form.website) {
      setForm((prev) => ({ ...prev, website: ensureHttps(prev.website) }));
    }
  };

  const handleAddressPlaceSelect = useCallback(
    (address: string, lat: number, lng: number, pid: string) => {
      setForm((prev) => ({ ...prev, address }));
      setLatitude(lat);
      setLongitude(lng);
      setPlaceId(pid);
    },
    []
  );

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    const remaining = 6 - form.photos.filter((p) => p).length;
    const toUpload = fileArray.slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    try {
      const res = await uploadApi.uploadPhotos(toUpload);
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos.filter((p) => p), ...res.data.urls],
      }));
    } catch {
      setError('خطا در آپلود تصاویر');
    } finally {
      setUploading(false);
    }
  }, [form.photos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const submitForm = async (token?: string) => {
    setError('');

    // Validate country/city against known values
    const validCountry = countries.find(c => c.name === form.country);
    if (!validCountry) {
      setError('لطفا کشور را از لیست انتخاب کنید');
      return;
    }
    const validCity = cities.find(c => c.name === form.city && c.country === validCountry.code);
    if (!validCity) {
      setError('لطفا شهر را از لیست انتخاب کنید');
      return;
    }

    // Validate phone number
    const phoneDigits = form.phone.replace(/\s/g, '');
    if (phoneDigits && phoneDigits !== validCountry.dialCode) {
      if (!isValidPhoneNumber(phoneDigits)) {
        setError('شماره تلفن وارد شده معتبر نیست');
        return;
      }
    } else if (!isEdit) {
      setError('شماره تلفن الزامی است');
      return;
    }

    // Validate whatsapp if provided
    const waDigits = form.whatsapp.replace(/\s/g, '');
    if (waDigits && waDigits !== validCountry.dialCode) {
      if (!isValidPhoneNumber(waDigits)) {
        setError('شماره واتساپ وارد شده معتبر نیست');
        return;
      }
    }

    setLoading(true);

    const data: any = {
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      phone: stripPhoneForStorage(form.phone) || undefined,
      address: form.address,
      city: form.city,
      country: form.country,
      website: form.website || undefined,
      socialLinks: {
        instagram: form.instagram || undefined,
        telegram: form.telegram || undefined,
        whatsapp: stripPhoneForStorage(form.whatsapp) || undefined,
      },
      photos: form.photos.filter((p) => p.trim()),
      isActive: form.isActive,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      placeId: placeId || undefined,
    };

    if (!isEdit && token) {
      data.verificationToken = token;
    }

    try {
      if (isEdit && id) {
        await listingsApi.update(id, data);
      } else {
        await listingsApi.create(data);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ذخیره کسب‌وکار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // For new listings, require phone verification
    if (!isEdit && !verificationToken) {
      if (!form.phone) {
        setError('شماره تلفن الزامی است');
        return;
      }
      setPendingSubmit(true);
      setShowOtpModal(true);
      return;
    }

    await submitForm(verificationToken);
  };

  const handlePhoneVerified = async (token: string) => {
    setVerificationToken(token);
    setPhoneVerified(true);
    setShowOtpModal(false);

    // Auto-submit if we were waiting for verification
    if (pendingSubmit) {
      setPendingSubmit(false);
      await submitForm(token);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">
        {isEdit ? 'ویرایش کسب‌وکار' : 'افزودن کسب‌وکار'}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">اطلاعات اصلی</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان کسب‌وکار *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              دسته‌بندی *
            </label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">انتخاب کنید</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nameFa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              توضیحات *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="input"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">موقعیت مکانی</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Country with strict searchable dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                کشور *
              </label>
              <div className="relative">
                {showCountryList ? (
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    onBlur={handleCountryBlur}
                    className="input"
                    placeholder="جستجوی کشور..."
                    autoComplete="off"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCountryList(true)}
                    className="input w-full text-right flex items-center justify-between"
                  >
                    <span className={form.country ? 'text-gray-900' : 'text-gray-400'}>
                      {form.country ? `${selectedCountry?.flag || ''} ${form.country}` : 'انتخاب کشور'}
                    </span>
                    {form.country ? (
                      <span
                        onClick={(e) => { e.stopPropagation(); clearCountry(); }}
                        className="text-gray-400 hover:text-gray-600 px-1"
                      >
                        ✕
                      </span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              {showCountryList && filteredCountries.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {filteredCountries.map((c) => (
                    <li
                      key={c.code}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      onMouseDown={() => handleCountrySelect(c)}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                      <span className="text-gray-400 text-sm font-latin">({c.nameEn})</span>
                    </li>
                  ))}
                </ul>
              )}
              <input type="hidden" name="country" value={form.country} required />
            </div>

            {/* City with strict searchable dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شهر *
              </label>
              <div className="relative">
                {showCityList ? (
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onBlur={handleCityBlur}
                    className="input"
                    placeholder="جستجوی شهر..."
                    autoComplete="off"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCityList(true)}
                    className="input w-full text-right flex items-center justify-between"
                  >
                    <span className={form.city ? 'text-gray-900' : 'text-gray-400'}>
                      {form.city || 'انتخاب شهر'}
                    </span>
                    {form.city ? (
                      <span
                        onClick={(e) => { e.stopPropagation(); clearCity(); }}
                        className="text-gray-400 hover:text-gray-600 px-1"
                      >
                        ✕
                      </span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              {showCityList && availableCities.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {availableCities.map((city) => (
                    <li
                      key={`${city.country}-${city.nameEn}`}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onMouseDown={() => handleCitySelect(city)}
                    >
                      <span>{city.name}</span>
                      <span className="text-gray-400 text-sm font-latin">{city.nameEn}</span>
                    </li>
                  ))}
                </ul>
              )}
              <input type="hidden" name="city" value={form.city} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              آدرس *
            </label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
              onPlaceSelect={handleAddressPlaceSelect}
              countryCode={selectedCountryCode}
              isLoaded={isLoaded}
            />
          </div>

          {latitude && longitude && isLoaded && (
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 200 }}>
              <GoogleMap
                center={{ lat: latitude, lng: longitude }}
                zoom={15}
                mapContainerStyle={{ width: '100%', height: '100%' }}
                options={{ disableDefaultUI: true, zoomControl: true }}
              >
                <MarkerF position={{ lat: latitude, lng: longitude }} />
              </GoogleMap>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">اطلاعات تماس</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تلفن {!isEdit && '*'}
                {phoneVerified && !isEdit && (
                  <span className="text-green-600 text-xs mr-2">
                    (تایید شده)
                  </span>
                )}
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onFocus={() => handlePhoneFocus('phone')}
                onChange={(e) => handlePhoneInput(e.target.value, 'phone')}
                className="input text-left"
                dir="ltr"
                placeholder={selectedCountry ? `${selectedCountry.dialCode} ...` : '+1 234 567 8900'}
                required={!isEdit}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وب‌سایت
              </label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                onBlur={handleWebsiteBlur}
                className="input text-left"
                dir="ltr"
                placeholder="https://"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">شبکه‌های اجتماعی</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اینستاگرام
              </label>
              <input
                type="text"
                name="instagram"
                value={form.instagram}
                onChange={(e) => handleSocialInput(e.target.value, 'instagram')}
                className="input text-left"
                dir="ltr"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تلگرام
              </label>
              <input
                type="text"
                name="telegram"
                value={form.telegram}
                onChange={(e) => handleSocialInput(e.target.value, 'telegram')}
                className="input text-left"
                dir="ltr"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                واتساپ
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={form.whatsapp}
                onFocus={() => handlePhoneFocus('whatsapp')}
                onChange={(e) => handlePhoneInput(e.target.value, 'whatsapp')}
                className="input text-left"
                dir="ltr"
                placeholder={selectedCountry ? `${selectedCountry.dialCode} ...` : '+1 234 567 890'}
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">تصاویر</h2>
            <span className="text-sm text-gray-400">
              {form.photos.filter((p) => p).length}/6
            </span>
          </div>

          {/* Uploaded photos grid */}
          {form.photos.filter((p) => p).length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {form.photos.filter((p) => p).map((photo, index) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={resolveImageUrl(photo)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(form.photos.indexOf(photo))}
                    className="absolute top-2 left-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    ✕
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      اصلی
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          {form.photos.filter((p) => p).length < 6 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">در حال آپلود...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    تصاویر را بکشید و رها کنید یا <span className="text-primary-600 font-medium">انتخاب کنید</span>
                  </p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP — حداکثر ۵MB هر تصویر</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        {isEdit && (
          <div className="card p-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 rounded"
              />
              <span>کسب‌وکار فعال باشد</span>
            </label>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'افزودن کسب‌وکار'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            انصراف
          </button>
        </div>
      </form>

      <OtpVerifyModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setPendingSubmit(false);
        }}
        onVerified={handlePhoneVerified}
        phone={stripPhoneForStorage(form.phone)}
        mode="create"
      />
    </div>
  );
}
