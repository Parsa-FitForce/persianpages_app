import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.SES_REGION || 'us-east-1',
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@persianpages.com';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

async function sendEmail(to: string, subject: string, html: string) {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } },
    },
  });

  await ses.send(command);
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #15803d;">تایید ایمیل - PersianPages</h2>
      <p>سلام،</p>
      <p>برای تایید آدرس ایمیل خود، لطفا روی دکمه زیر کلیک کنید:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #16a34a; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px;">
          تایید ایمیل
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">این لینک تا ۲۴ ساعت معتبر است.</p>
      <p style="color: #6b7280; font-size: 14px;">اگر شما این درخواست را ارسال نکرده‌اید، لطفا این ایمیل را نادیده بگیرید.</p>
    </div>
  `;

  await sendEmail(to, 'تایید ایمیل - PersianPages', html);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${CLIENT_URL}/reset-password?token=${token}`;
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #15803d;">بازیابی رمز عبور - PersianPages</h2>
      <p>سلام،</p>
      <p>برای تغییر رمز عبور خود، لطفا روی دکمه زیر کلیک کنید:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #16a34a; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px;">
          تغییر رمز عبور
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">این لینک تا ۱ ساعت معتبر است.</p>
      <p style="color: #6b7280; font-size: 14px;">اگر شما این درخواست را ارسال نکرده‌اید، لطفا این ایمیل را نادیده بگیرید.</p>
    </div>
  `;

  await sendEmail(to, 'بازیابی رمز عبور - PersianPages', html);
}
