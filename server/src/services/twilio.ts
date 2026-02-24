import Twilio from 'twilio';
import crypto from 'crypto';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const fromNumber = process.env.TWILIO_FROM_NUMBER;
const messagingSid = process.env.TWILIO_MESSAGING_SID;
const verifySid = process.env.TWILIO_VERIFY_SID;

const canSend = !!(accountSid && authToken && (fromNumber || messagingSid || verifySid));
const client = canSend ? Twilio(accountSid!, authToken!) : null;

export const useVerifyApi = !!(client && verifySid);

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function sendSms(phone: string, code: string): Promise<void> {
  if (!client) {
    console.log(`[DEV] SMS OTP to ${phone}: ${code}`);
    return;
  }

  await client.messages.create({
    to: phone,
    from: fromNumber || undefined,
    messagingServiceSid: messagingSid || undefined,
    body: `Your PersianPages verification code is: ${code}`,
  });
}

export async function sendVerification(phone: string, channel: 'sms' | 'call'): Promise<void> {
  if (!client || !verifySid) {
    console.log(`[DEV] Verify API send to ${phone} via ${channel}`);
    return;
  }

  await client.verify.v2.services(verifySid).verifications.create({
    to: phone,
    channel: channel === 'call' ? 'call' : 'sms',
  });
}

export async function checkVerification(phone: string, code: string): Promise<boolean> {
  if (!client || !verifySid) {
    console.log(`[DEV] Verify API check for ${phone} with code ${code}`);
    return true;
  }

  const check = await client.verify.v2.services(verifySid).verificationChecks.create({
    to: phone,
    code,
  });

  return check.status === 'approved';
}

export async function sendVoiceCall(phone: string, code: string): Promise<void> {
  if (!client || !fromNumber) {
    console.log(`[DEV] Voice OTP to ${phone}: ${code}`);
    return;
  }

  const spokenCode = code.split('').join(', ');
  await client.calls.create({
    to: phone,
    from: fromNumber,
    twiml: `<Response><Say language="en-US">Your PersianPages verification code is: ${spokenCode}. I repeat: ${spokenCode}.</Say></Response>`,
  });
}
