import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '../../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = String(code).trim();

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, password_reset_code, password_reset_expires
      FROM users WHERE email = ${trimmedEmail}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      );
    }

    const user = users[0];

    if (user.password_reset_code !== trimmedCode) {
      return NextResponse.json(
        { error: 'Invalid code. Please check the code and try again.' },
        { status: 400 }
      );
    }

    if (!user.password_reset_expires || new Date() > new Date(user.password_reset_expires)) {
      await sql`
        UPDATE users SET password_reset_code = NULL, password_reset_expires = NULL WHERE id = ${user.id}
      `;
      return NextResponse.json(
        { error: 'This code has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users
      SET password = ${hashedPassword}, password_reset_code = NULL, password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Password updated. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
