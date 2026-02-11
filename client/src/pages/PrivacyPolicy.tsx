export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card p-8 space-y-8">
        {/* English */}
        <section dir="ltr" className="text-left space-y-4 font-latin">
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: February 2026</p>

          <p>
            PersianPages ("we", "us", or "our") operates the persianpages.com
            website. This page informs you of our policies regarding the
            collection, use, and disclosure of personal information.
          </p>

          <h2 className="text-lg font-semibold mt-6">Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>Account information:</strong> name, email address, and
              password when you register.
            </li>
            <li>
              <strong>Phone number:</strong> when you create or claim a business
              listing, for verification purposes.
            </li>
            <li>
              <strong>Business listing data:</strong> business name, address,
              phone, photos, hours, and other details you provide.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, browser type, and IP
              address collected automatically.
            </li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>To provide and maintain our service.</li>
            <li>To verify business ownership via phone verification.</li>
            <li>To display your business listing publicly on our directory.</li>
            <li>To communicate with you about your account or listings.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>Google Maps / Places API:</strong> for address
              autocomplete and map display.
            </li>
            <li>
              <strong>Twilio:</strong> for sending SMS and voice verification
              codes.
            </li>
            <li>
              <strong>Google OAuth:</strong> for optional sign-in with Google.
            </li>
          </ul>
          <p>
            These services may collect information as described in their own
            privacy policies.
          </p>

          <h2 className="text-lg font-semibold mt-6">Cookies &amp; Local Storage</h2>
          <p>
            We use local storage to save your authentication token and country
            preference. We do not use third-party tracking cookies.
          </p>

          <h2 className="text-lg font-semibold mt-6">Data Retention &amp; Deletion</h2>
          <p>
            We retain your data as long as your account is active. You may
            request deletion of your account and associated data by contacting
            us.
          </p>

          <h2 className="text-lg font-semibold mt-6">Contact</h2>
          <p>
            If you have questions about this policy, contact us at{' '}
            <a href="mailto:support@persianpages.com" className="text-primary-600 hover:underline">
              support@persianpages.com
            </a>.
          </p>
        </section>

        <hr className="border-gray-200" />

        {/* Persian */}
        <section dir="rtl" className="text-right space-y-4">
          <h1 className="text-2xl font-bold">سیاست حفظ حریم خصوصی</h1>
          <p className="text-sm text-gray-500">آخرین به‌روزرسانی: بهمن ۱۴۰۴</p>

          <p>
            پرشین‌پیجز (ما) وب‌سایت persianpages.com را اداره می‌کند. این صفحه
            سیاست‌های ما در مورد جمع‌آوری، استفاده و افشای اطلاعات شخصی را شرح
            می‌دهد.
          </p>

          <h2 className="text-lg font-semibold mt-6">اطلاعاتی که جمع‌آوری می‌کنیم</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>اطلاعات حساب کاربری:</strong> نام، آدرس ایمیل و رمز عبور
              هنگام ثبت‌نام.
            </li>
            <li>
              <strong>شماره تلفن:</strong> هنگام ایجاد یا ثبت مالکیت کسب‌وکار،
              برای تایید هویت.
            </li>
            <li>
              <strong>اطلاعات کسب‌وکار:</strong> نام، آدرس، تلفن، عکس، ساعات
              کاری و سایر جزئیات.
            </li>
            <li>
              <strong>داده‌های استفاده:</strong> صفحات بازدید شده، نوع مرورگر و
              آدرس IP به صورت خودکار.
            </li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">نحوه استفاده از اطلاعات</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>ارائه و نگهداری سرویس.</li>
            <li>تایید مالکیت کسب‌وکار از طریق تایید تلفنی.</li>
            <li>نمایش عمومی اطلاعات کسب‌وکار در دایرکتوری.</li>
            <li>ارتباط با شما درباره حساب یا کسب‌وکارهایتان.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">سرویس‌های شخص ثالث</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>Google Maps:</strong> برای تکمیل خودکار آدرس و نمایش
              نقشه.
            </li>
            <li>
              <strong>Twilio:</strong> برای ارسال پیامک و تماس صوتی تایید.
            </li>
            <li>
              <strong>Google OAuth:</strong> برای ورود اختیاری با حساب گوگل.
            </li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">کوکی‌ها و حافظه محلی</h2>
          <p>
            ما از حافظه محلی مرورگر برای ذخیره توکن احراز هویت و ترجیح کشور
            استفاده می‌کنیم. از کوکی‌های ردیابی شخص ثالث استفاده نمی‌کنیم.
          </p>

          <h2 className="text-lg font-semibold mt-6">نگهداری و حذف داده‌ها</h2>
          <p>
            اطلاعات شما تا زمانی که حسابتان فعال است نگهداری می‌شود. می‌توانید
            با تماس با ما درخواست حذف حساب و داده‌های مرتبط را بدهید.
          </p>

          <h2 className="text-lg font-semibold mt-6">تماس با ما</h2>
          <p>
            در صورت داشتن سوال درباره این سیاست، با ما تماس بگیرید:{' '}
            <a href="mailto:support@persianpages.com" className="text-primary-600 hover:underline" dir="ltr">
              support@persianpages.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
