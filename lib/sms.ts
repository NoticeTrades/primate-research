/**
 * Send SMS via Twilio REST API.
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (E.164, e.g. +15551234567)
 */

export async function sendSms(toE164: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'SMS not configured (missing Twilio env vars)' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.set('To', toE164);
  params.set('From', fromNumber);
  params.set('Body', body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error_message || res.statusText;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send SMS';
    return { success: false, error: msg };
  }
}

/**
 * Normalize a US-style phone string to E.164 (+1XXXXXXXXXX).
 * Accepts: 5551234567, 555-123-4567, (555) 123-4567, +1 555 123 4567, etc.
 */
export function normalizePhoneToE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0')) return '+' + digits;
  return null;
}
