import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, name, username, email, verification_code, verification_code_expires, verified
      FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    if (user.verified) {
      return NextResponse.json(
        { error: 'Email is already verified. You can log in.' },
        { status: 400 }
      );
    }

    // Check if code matches
    if (user.verification_code !== code.trim()) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date() > new Date(user.verification_code_expires)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark user as verified and clear the code
    await sql`
      UPDATE users
      SET verified = true, verification_code = NULL, verification_code_expires = NULL
      WHERE id = ${user.id}
    `;

    // Create session — log them in
    const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set('user_email', email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set('user_username', user.username, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    // Send welcome email now that they're verified (non-blocking)
    sendWelcomeEmail(email, user.name);

    return NextResponse.json({
      success: true,
      user: { email, name: user.name, username: user.username },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Primate Research <notifications@resend.dev>';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://primate-research.vercel.app';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Welcome to Primate Research',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #fafafa; margin: 0;">Welcome to Primate Research</h1>
          </div>

          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 16px; color: #fafafa; line-height: 1.7; margin: 0 0 16px 0;">
              Hey ${name},
            </p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 16px 0;">
              Welcome aboard. You now have full access to our research reports, market analysis, video insights, and live trade tracking across equities, crypto, and macro markets.
            </p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 16px 0;">
              We publish weekly market outlooks and deep-dive research — you'll get an email every time a new report drops so you never miss a beat.
            </p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0;">
              If you haven't already, join our Discord community to connect with other traders and get real-time updates.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${siteUrl}/research"
               style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; margin-right: 8px;">
              View Research →
            </a>
            <a href="https://discord.com/invite/QGnUGdAt"
               style="display: inline-block; background-color: #5865F2; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
              Join Discord
            </a>
          </div>

          <div style="border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
            <p style="font-size: 12px; color: #52525b; margin: 0;">
              Edge through the regime. — Primate Research
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('Welcome email failed:', err);
  }
}

