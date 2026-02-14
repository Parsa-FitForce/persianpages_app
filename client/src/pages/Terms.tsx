import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions | شرایط استفاده | PersianPages</title>
        <meta name="description" content="PersianPages terms and conditions of use." />
        <link rel="canonical" href="https://persianpages.com/terms" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="card p-8 space-y-8">
        {/* English */}
        <section dir="ltr" className="text-left space-y-4 font-latin">
          <h1 className="text-2xl font-bold">Terms and Conditions</h1>
          <p className="text-sm text-gray-500">Last updated: February 2026</p>

          <h2 className="text-lg font-semibold mt-6">1. Acceptance of Terms</h2>
          <p>
            By accessing or using PersianPages, you agree to be bound by these
            Terms and Conditions. If you do not agree, please do not use our
            service.
          </p>

          <h2 className="text-lg font-semibold mt-6">2. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials. You must provide accurate information when
            creating an account. You are responsible for all activity under your
            account.
          </p>

          <h2 className="text-lg font-semibold mt-6">3. Business Listings</h2>
          <p>
            By submitting a business listing, you represent that the information
            provided is accurate and that you have the right to publish it.
            PersianPages reserves the right to remove or modify any listing that
            violates these terms.
          </p>

          <h2 className="text-lg font-semibold mt-6">4. Business Claims</h2>
          <p>
            Claiming a business requires phone verification to confirm
            ownership. You must only claim businesses that you own or are
            authorized to manage. Fraudulent claims may result in account
            suspension.
          </p>

          <h2 className="text-lg font-semibold mt-6">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Submit false, misleading, or fraudulent information.</li>
            <li>Claim businesses you do not own or manage.</li>
            <li>Use the service for spam, harassment, or illegal purposes.</li>
            <li>Attempt to gain unauthorized access to other accounts or systems.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">6. Intellectual Property</h2>
          <p>
            You retain ownership of content you submit. By posting content, you
            grant PersianPages a non-exclusive license to display it on our
            platform. The PersianPages name, logo, and website design are our
            property.
          </p>

          <h2 className="text-lg font-semibold mt-6">7. Disclaimer</h2>
          <p>
            PersianPages is provided "as is" without warranties of any kind. We
            do not guarantee the accuracy of business listings or user-submitted
            content. We are not responsible for any transactions or interactions
            between users and listed businesses.
          </p>

          <h2 className="text-lg font-semibold mt-6">8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, PersianPages shall not be
            liable for any indirect, incidental, or consequential damages
            arising from your use of the service.
          </p>

          <h2 className="text-lg font-semibold mt-6">9. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the service
            after changes constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-lg font-semibold mt-6">10. Contact</h2>
          <p>
            Questions about these terms? Contact us at{' '}
            <a href="mailto:support@persianpages.com" className="text-primary-600 hover:underline">
              support@persianpages.com
            </a>.
          </p>
        </section>

        <hr className="border-gray-200" />

        {/* Persian */}
        <section dir="rtl" className="text-right space-y-4">
          <h1 className="text-2xl font-bold">شرایط و ضوابط استفاده</h1>
          <p className="text-sm text-gray-500">آخرین به‌روزرسانی: بهمن ۱۴۰۴</p>

          <h2 className="text-lg font-semibold mt-6">۱. پذیرش شرایط</h2>
          <p>
            با دسترسی یا استفاده از پرشین‌پیجز، شما موافقت خود را با این شرایط
            و ضوابط اعلام می‌کنید. در صورت عدم موافقت، لطفا از سرویس استفاده
            نکنید.
          </p>

          <h2 className="text-lg font-semibold mt-6">۲. حساب‌های کاربری</h2>
          <p>
            شما مسئول حفظ محرمانگی اطلاعات حساب خود هستید. باید اطلاعات دقیق
            هنگام ایجاد حساب ارائه دهید. شما مسئول تمام فعالیت‌های حساب خود
            هستید.
          </p>

          <h2 className="text-lg font-semibold mt-6">۳. ثبت کسب‌وکار</h2>
          <p>
            با ثبت کسب‌وکار، تایید می‌کنید که اطلاعات ارائه شده صحیح است و حق
            انتشار آن را دارید. پرشین‌پیجز حق حذف یا تغییر هر لیستی که این
            شرایط را نقض کند دارد.
          </p>

          <h2 className="text-lg font-semibold mt-6">۴. ثبت مالکیت کسب‌وکار</h2>
          <p>
            ثبت مالکیت کسب‌وکار نیاز به تایید تلفنی دارد. فقط کسب‌وکارهایی را
            ثبت کنید که مالک آن هستید یا اجازه مدیریت آن را دارید. ثبت مالکیت
            جعلی ممکن است منجر به تعلیق حساب شود.
          </p>

          <h2 className="text-lg font-semibold mt-6">۵. استفاده قابل قبول</h2>
          <p>شما موافقت می‌کنید که:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>اطلاعات نادرست، گمراه‌کننده یا جعلی ارسال نکنید.</li>
            <li>کسب‌وکارهایی که مالک آن نیستید را ثبت نکنید.</li>
            <li>از سرویس برای هرزنامه، آزار یا اهداف غیرقانونی استفاده نکنید.</li>
            <li>تلاش برای دسترسی غیرمجاز به حساب‌ها یا سیستم‌های دیگر نکنید.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">۶. مالکیت معنوی</h2>
          <p>
            مالکیت محتوایی که ارسال می‌کنید متعلق به شماست. با ارسال محتوا، به
            پرشین‌پیجز مجوز غیرانحصاری برای نمایش آن در پلتفرم می‌دهید. نام،
            لوگو و طراحی پرشین‌پیجز متعلق به ماست.
          </p>

          <h2 className="text-lg font-semibold mt-6">۷. سلب مسئولیت</h2>
          <p>
            پرشین‌پیجز به صورت «همان‌طور که هست» و بدون هرگونه ضمانت ارائه
            می‌شود. ما صحت اطلاعات کسب‌وکارها یا محتوای ارسالی کاربران را تضمین
            نمی‌کنیم. ما مسئول معاملات یا تعاملات بین کاربران و کسب‌وکارهای
            ثبت‌شده نیستیم.
          </p>

          <h2 className="text-lg font-semibold mt-6">۸. محدودیت مسئولیت</h2>
          <p>
            تا حداکثر حد مجاز قانونی، پرشین‌پیجز مسئول هیچ خسارت غیرمستقیم،
            اتفاقی یا تبعی ناشی از استفاده شما از سرویس نخواهد بود.
          </p>

          <h2 className="text-lg font-semibold mt-6">۹. تغییرات در شرایط</h2>
          <p>
            ما ممکن است این شرایط را در هر زمان به‌روزرسانی کنیم. ادامه استفاده
            از سرویس پس از تغییرات به منزله پذیرش شرایط جدید است.
          </p>

          <h2 className="text-lg font-semibold mt-6">۱۰. تماس با ما</h2>
          <p>
            سوالی درباره این شرایط دارید؟ با ما تماس بگیرید:{' '}
            <a href="mailto:support@persianpages.com" className="text-primary-600 hover:underline" dir="ltr">
              support@persianpages.com
            </a>
          </p>
        </section>
        </div>
      </div>
    </>
  );
}
