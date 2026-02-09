import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '../../../../lib/db';
import { Resend } from 'resend';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email, password, name, username } = await request.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json(
        { error: 'Email, password, name, and username are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Check if email already exists
    const existingEmail = await sql`SELECT id, verified FROM users WHERE email = ${email}`;
    if (existingEmail.length > 0) {
      // If the user exists but is NOT verified, let them re-signup (update their info + resend code)
      if (!existingEmail[0].verified) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const code = generateCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

        await sql`
          UPDATE users
          SET name = ${name}, username = ${username}, password = ${hashedPassword},
              verification_code = ${code}, verification_code_expires = ${codeExpires}::timestamptz
          WHERE email = ${email}
        `;

        // Send verification email
        await sendVerificationEmail(email, name, code);

        return NextResponse.json({
          success: true,
          needsVerification: true,
          email,
          message: 'Verification code resent to your email.',
        });
      }

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if username already exists (among verified users)
    const existingUsername = await sql`SELECT id FROM users WHERE username = ${username} AND verified = true`;
    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const code = generateCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Insert new user as unverified
    await sql`
      INSERT INTO users (name, email, username, password, verified, verification_code, verification_code_expires)
      VALUES (${name}, ${email}, ${username}, ${hashedPassword}, false, ${code}, ${codeExpires}::timestamptz)
    `;

    // Send verification email
    await sendVerificationEmail(email, name, code);

    return NextResponse.json({
      success: true,
      needsVerification: true,
      email,
      message: 'Check your email for a verification code.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}

async function sendVerificationEmail(email: string, name: string, code: string) {
  if (!process.env.RESEND_API_KEY) return;

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
              Hey ${name},
            </p>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 24px 0;">
              Enter this code to verify your email and activate your Primate Research account:
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: #09090b; border: 2px solid #3b82f6; border-radius: 12px; padding: 16px 40px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #fafafa; font-family: monospace;">
                ${code}
              </div>
            </div>
            <p style="font-size: 13px; color: #71717a; line-height: 1.7; margin: 0; text-align: center;">
              This code expires in 15 minutes. If you didn't sign up, you can safely ignore this email.
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
    console.error('Verification email failed:', err);
  }
}
