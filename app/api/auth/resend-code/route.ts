import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { Resend } from 'resend';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, name, verified FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email' },
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

    // Generate new code
    const code = generateCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    await sql`
      UPDATE users
      SET verification_code = ${code}, verification_code_expires = ${codeExpires}::timestamptz
      WHERE id = ${user.id}
    `;

    // Send verification email
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Primate Research <notifications@resend.dev>';

      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `${code} — Your Primate Research verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #fafafa; margin: 0;">Verify Your Email</h1>
              </div>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #fafafa; line-height: 1.7; margin: 0 0 16px 0;">
                  Hey ${user.name},
                </p>
                <p style="font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 24px 0;">
                  Here's your new verification code:
                </p>
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; background-color: #09090b; border: 2px solid #3b82f6; border-radius: 12px; padding: 16px 40px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #fafafa; font-family: monospace;">
                    ${code}
                  </div>
                </div>
                <p style="font-size: 13px; color: #71717a; line-height: 1.7; margin: 0; text-align: center;">
                  This code expires in 15 minutes.
                </p>
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
        console.error('Resend verification email failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'New verification code sent to your email.',
    });
  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

