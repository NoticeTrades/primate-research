import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';
import { normalizePhoneToE164 } from '../../../../lib/sms';

export const dynamic = 'force-dynamic';

// GET /api/notifications/preferences — get user's notification preferences
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    let result: { browser_notifications_enabled?: boolean; sound_notifications_enabled?: boolean; trade_notifications_enabled?: boolean; trade_notifications_email?: boolean; phone_number?: string | null; trade_notifications_sms?: boolean }[];
    try {
      result = await sql`
        SELECT browser_notifications_enabled, sound_notifications_enabled,
               trade_notifications_enabled, trade_notifications_email,
               phone_number, trade_notifications_sms
        FROM users WHERE email = ${userEmail}
      `;
    } catch {
      result = await sql`
        SELECT browser_notifications_enabled, sound_notifications_enabled,
               trade_notifications_enabled, trade_notifications_email
        FROM users WHERE email = ${userEmail}
      `;
    }
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const r = result[0];
    const out: Record<string, boolean | string | null> = {
      browserNotificationsEnabled: r.browser_notifications_enabled || false,
      soundNotificationsEnabled: r.sound_notifications_enabled !== false,
    };
    if ('trade_notifications_enabled' in r) {
      out.tradeNotificationsEnabled = r.trade_notifications_enabled !== false;
      out.tradeNotificationsEmail = r.trade_notifications_email === true;
    }
    if ('phone_number' in r) out.phoneNumber = r.phone_number ?? null;
    if ('trade_notifications_sms' in r) out.tradeNotificationsSms = r.trade_notifications_sms === true;
    return NextResponse.json(out);
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences — update user's browser notification preference
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      enabled,
      soundEnabled,
      tradeNotificationsEnabled,
      tradeNotificationsEmail,
      phoneNumber,
      tradeNotificationsSms,
      smsConsent,
    } = body;

    // SMS / phone preferences
    const hasSmsPref = 'phoneNumber' in body || 'tradeNotificationsSms' in body || 'smsConsent' in body;
    if (hasSmsPref) {
      const sql = getDb();
      try {
        const userCheck = await sql`
          SELECT phone_number, trade_notifications_sms FROM users WHERE email = ${userEmail}
        `;
        if (userCheck.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const current = userCheck[0];
        let newPhone: string | null = current?.phone_number ?? null;
        if ('phoneNumber' in body) {
          const raw = phoneNumber == null ? '' : String(phoneNumber).trim();
          newPhone = raw === '' ? null : normalizePhoneToE164(raw) ?? newPhone;
          if (raw !== '' && !normalizePhoneToE164(raw)) {
            return NextResponse.json({ error: 'Invalid phone number. Use 10-digit US number or E.164 (e.g. +1 555 123 4567).' }, { status: 400 });
          }
        }
        const newSms = typeof tradeNotificationsSms === 'boolean' ? tradeNotificationsSms : (current?.trade_notifications_sms === true);
        const optIn = newSms && !!newPhone;
        const prevPhone = String(current?.phone_number ?? '').trim();
        const nextPhone = String(newPhone ?? '').trim();
        const wasOptIn = current?.trade_notifications_sms === true && prevPhone !== '';
        /** New consent signature: first opt-in, re-opt-in after off, or number changed while subscribed */
        const consentRefresh = optIn && (!wasOptIn || prevPhone !== nextPhone);
        const needOptOutTimestamp = !optIn && wasOptIn;

        if (newSms && !newPhone) {
          return NextResponse.json({ error: 'Add a phone number to enable SMS alerts.' }, { status: 400 });
        }
        // Twilio / TCPA: explicit opt-in when enabling SMS (new subscribers or number change).
        // Legacy: already-subscribed same-number saves without `smsConsent` still work until they update prefs in the new UI.
        const legacySameNumber =
          optIn && wasOptIn && prevPhone === nextPhone && (smsConsent === undefined || smsConsent === null);
        if (optIn && smsConsent !== true && !legacySameNumber) {
          return NextResponse.json(
            {
              error:
                'Check the consent box to agree to receive SMS for live trade alerts, or turn off SMS alerts.',
            },
            { status: 400 }
          );
        }

        try {
          await sql`
            UPDATE users SET
              phone_number = ${newPhone},
              trade_notifications_sms = ${optIn},
              trade_sms_consent_at = CASE WHEN ${consentRefresh} THEN NOW() ELSE trade_sms_consent_at END,
              trade_sms_opt_out_at = CASE
                WHEN ${optIn} THEN NULL
                WHEN ${needOptOutTimestamp} THEN NOW()
                ELSE trade_sms_opt_out_at
              END
            WHERE email = ${userEmail}
          `;
        } catch (consentColErr: unknown) {
          const msg = consentColErr instanceof Error ? consentColErr.message : '';
          if (msg.includes('trade_sms_consent_at') || msg.includes('trade_sms_opt_out_at') || (consentColErr as { code?: string })?.code === '42703') {
            await sql`
              UPDATE users SET phone_number = ${newPhone}, trade_notifications_sms = ${optIn}
              WHERE email = ${userEmail}
            `;
          } else {
            throw consentColErr;
          }
        }
        return NextResponse.json({
          success: true,
          phoneNumber: newPhone,
          tradeNotificationsSms: optIn,
        });
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : '';
        if (msg.includes('phone_number') || msg.includes('trade_notifications_sms') || (dbErr as { code?: string })?.code === '42703') {
          return NextResponse.json(
            { error: 'Database setup required. Run Setup in Admin to add SMS columns.' },
            { status: 500 }
          );
        }
        throw dbErr;
      }
    }

    // Trade notification preferences (in-app + email): accept if either key is present
    const hasTradePref = 'tradeNotificationsEnabled' in body || 'tradeNotificationsEmail' in body;
    if (hasTradePref) {
      const sql = getDb();
      try {
        const userCheck = await sql`
          SELECT trade_notifications_enabled, trade_notifications_email FROM users WHERE email = ${userEmail}
        `;
        if (userCheck.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const current = userCheck[0];
        const newInApp = typeof tradeNotificationsEnabled === 'boolean' ? tradeNotificationsEnabled : (current?.trade_notifications_enabled !== false);
        const newEmail = typeof tradeNotificationsEmail === 'boolean' ? tradeNotificationsEmail : (current?.trade_notifications_email === true);
        await sql`
          UPDATE users SET trade_notifications_enabled = ${newInApp}, trade_notifications_email = ${newEmail}
          WHERE email = ${userEmail}
        `;
        return NextResponse.json({
          success: true,
          tradeNotificationsEnabled: newInApp,
          tradeNotificationsEmail: newEmail,
        });
      } catch (dbErr: any) {
        if (dbErr?.message?.includes('trade_notifications') || dbErr?.code === '42703') {
          return NextResponse.json(
            { error: 'Database setup required. Run Setup in Admin to add trade notification columns.' },
            { status: 500 }
          );
        }
        throw dbErr;
      }
    }

    // Support both old format (just enabled) and new format (enabled and soundEnabled)
    if (typeof enabled === 'boolean') {
      // Update browser notifications
      const sql = getDb();
      
      // First check if user exists
      const userCheck = await sql`
        SELECT id FROM users WHERE email = ${userEmail}
      `;
      
      if (userCheck.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Try to update - if column doesn't exist, it will throw an error
      try {
        await sql`
          UPDATE users
          SET browser_notifications_enabled = ${enabled}
          WHERE email = ${userEmail}
        `;
      } catch (dbError: any) {
        // Check if the error is because the column doesn't exist
        if (dbError?.message?.includes('browser_notifications_enabled') || dbError?.code === '42703') {
          console.error('Database column browser_notifications_enabled does not exist. Please run database setup.');
          return NextResponse.json(
            { 
              error: 'Database setup required',
              message: 'The browser_notifications_enabled column does not exist. Please run database setup from the admin page.'
            },
            { status: 500 }
          );
        }
        throw dbError; // Re-throw if it's a different error
      }

      return NextResponse.json({
        success: true,
        browserNotificationsEnabled: enabled,
      });
    } else if (typeof soundEnabled === 'boolean') {
      // Update sound notifications
      const sql = getDb();
      
      // First check if user exists
      const userCheck = await sql`
        SELECT id FROM users WHERE email = ${userEmail}
      `;
      
      if (userCheck.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Try to update - if column doesn't exist, it will throw an error
      try {
        await sql`
          UPDATE users
          SET sound_notifications_enabled = ${soundEnabled}
          WHERE email = ${userEmail}
        `;
      } catch (dbError: any) {
        // Check if the error is because the column doesn't exist
        if (dbError?.message?.includes('sound_notifications_enabled') || dbError?.code === '42703') {
          console.error('Database column sound_notifications_enabled does not exist. Please run database setup.');
          return NextResponse.json(
            { 
              error: 'Database setup required',
              message: 'The sound_notifications_enabled column does not exist. Please run database setup from the admin page.'
            },
            { status: 500 }
          );
        }
        throw dbError; // Re-throw if it's a different error
      }

      return NextResponse.json({
        success: true,
        soundNotificationsEnabled: soundEnabled,
      });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Failed to update preferences'
      },
      { status: 500 }
    );
  }
}

