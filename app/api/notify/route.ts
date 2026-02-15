import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb } from '../../../lib/db';
import { getEmailLogoHtml } from '../../../lib/email-logo';

export async function POST(request: Request) {
  try {
    const { title, description, secret } = await request.json();

    // Admin secret check — set NOTIFY_SECRET in your environment variables
    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const sql = getDb();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get all subscriber emails from the database
    const users = await sql`SELECT email, name FROM users ORDER BY created_at DESC`;

    if (users.length === 0) {
      return NextResponse.json({ message: 'No subscribers to notify', sent: 0 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://primate-research.vercel.app';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Primate Research <notifications@resend.dev>';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
        ${getEmailLogoHtml(siteUrl)}
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #fafafa; margin: 0;">Primate Research</h1>
        </div>

        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #3b82f6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">New Research Published</p>
          <h2 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 12px 0;">${title}</h2>
          ${description ? `<p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0;">${description}</p>` : ''}
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${siteUrl}/research"
             style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
            View Report →
          </a>
        </div>

        <div style="border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
          <p style="font-size: 12px; color: #52525b; margin: 0;">
            You're receiving this because you signed up at Primate Research.
          </p>
        </div>
      </div>
    `;

    // Send one at a time with a delay to avoid Resend rate limit (429 Too Many Requests)
    const delayMs = 1100; // ~1 per second to stay under limit
    let totalSent = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: `New Research Drop: ${title}`,
          html: emailHtml,
        });
        totalSent++;
      } catch (err) {
        errors.push(`Failed to send to ${user.email}: ${err}`);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // If NOTIFY_CC_EMAIL is set, always send a copy to the admin (so you get one even if you're not in the users table)
    const ccEmail = process.env.NOTIFY_CC_EMAIL?.trim();
    if (ccEmail) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: ccEmail,
          subject: `New Research Drop: ${title}`,
          html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
                ${getEmailLogoHtml(siteUrl)}
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #fafafa; margin: 0;">Primate Research</h1>
                </div>

                <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #3b82f6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">New Research Published</p>
                  <h2 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 12px 0;">${title}</h2>
                  ${description ? `<p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0;">${description}</p>` : ''}
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${siteUrl}/research"
                     style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                    View Report →
                  </a>
                </div>

                <div style="border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
                  <p style="font-size: 12px; color: #52525b; margin: 0;">
                    You're receiving this because NOTIFY_CC_EMAIL is set (admin copy).
                  </p>
                </div>
              </div>
            `,
        });
      } catch (err) {
        errors.push(`Failed to send admin copy to ${ccEmail}: ${err}`);
      }
    }

    return NextResponse.json({
      message: 'Notifications sent',
      sent: totalSent,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Notify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
