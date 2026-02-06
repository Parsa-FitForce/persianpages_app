import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category } from '../types';
import { countries, searchCities, getCountryByCode, type Country, type City } from '../i18n/locations';

export default function ListingForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

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
    photos: [''],
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
          photos: l.photos.length > 0 ? l.photos : [''],
          isActive: l.isActive,
        });
        // Find country code from name
        const foundCountry = countries.find(c => c.name === l.country);
        if (foundCountry) setSelectedCountryCode(foundCountry.code);
      });
    }
  }, [id, isEdit]);

  const filteredCountries = useMemo(() => {
    if (!form.country) return countries;
    const query = form.country.toLowerCase();
    return countries.filter(
      (c) => c.name.includes(form.country) || c.nameEn.toLowerCase().includes(query)
    );
  }, [form.country]);

  const availableCities = useMemo(() => {
    return searchCities(form.city, selectedCountryCode || undefined);
  }, [form.city, selectedCountryCode]);

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
    setShowCountryList(false);
  };

  const handleCitySelect = (city: City) => {
    setForm((prev) => ({ ...prev, city: city.name }));
    // Also set country if not already set
    if (!form.country) {
      const country = getCountryByCode(city.country);
      if (country) {
        setForm((prev) => ({ ...prev, country: country.name }));
        setSelectedCountryCode(city.country);
      }
    }
    setShowCityList(false);
  };

  const handlePhotoChange = (index: number, value: string) => {
    setForm((prev) => {
      const photos = [...prev.photos];
      photos[index] = value;
      return { ...prev, photos };
    });
  };

  const addPhoto = () => {
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ''] }));
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = {
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      phone: form.phone || undefined,
      address: form.address,
      city: form.city,
      country: form.country,
      website: form.website || undefined,
      socialLinks: {
        instagram: form.instagram || undefined,
        telegram: form.telegram || undefined,
        whatsapp: form.whatsapp || undefined,
      },
      photos: form.photos.filter((p) => p.trim()),
      isActive: form.isActive,
    };

    try {
      if (isEdit && id) {
        await listingsApi.update(id, data);
      } else {
        await listingsApi.create(data);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'خطا در ذخیره آگهی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">
        {isEdit ? 'ویرایش آگهی' : 'ثبت آگهی جدید'}
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
            {/* Country with autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                کشور *
              </label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                onFocus={() => setShowCountryList(true)}
                onBlur={() => setTimeout(() => setShowCountryList(false), 200)}
                className="input"
                placeholder="نام کشور را تایپ کنید"
                autoComplete="off"
                required
              />
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
                      <span className="text-gray-400 text-sm">({c.nameEn})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* City with autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شهر *
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                onFocus={() => setShowCityList(true)}
                onBlur={() => setTimeout(() => setShowCityList(false), 200)}
                className="input"
                placeholder="نام شهر را تایپ کنید"
                autoComplete="off"
                required
              />
              {showCityList && availableCities.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {availableCities.map((city) => (
                    <li
                      key={`${city.country}-${city.nameEn}`}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onMouseDown={() => handleCitySelect(city)}
                    >
                      <span>{city.name}</span>
                      <span className="text-gray-400 text-sm">{city.nameEn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              آدرس *
            </label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="input"
              placeholder="خیابان، پلاک، واحد"
              required
            />
          </div>
        </div>

        {/* Contact */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">اطلاعات تماس</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تلفن
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="input text-left"
                dir="ltr"
                placeholder="+1 234 567 8900"
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                type="text"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                className="input text-left"
                dir="ltr"
                placeholder="+1234567890"
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">تصاویر</h2>
          <p className="text-sm text-gray-500">لینک تصاویر را وارد کنید</p>

          {form.photos.map((photo, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                value={photo}
                onChange={(e) => handlePhotoChange(index, e.target.value)}
                className="input flex-1 text-left"
                dir="ltr"
                placeholder="https://example.com/image.jpg"
              />
              {form.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-red-600 hover:text-red-700 px-3"
                >
                  حذف
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addPhoto}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            + افزودن تصویر
          </button>
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
              <span>آگهی فعال باشد</span>
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
            {loading ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ثبت آگهی'}
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
    </div>
  );
}
