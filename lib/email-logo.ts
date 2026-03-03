/**
 * Logo block for HTML emails (admin notify, verification, welcome, resend).
 * Uses absolute URL so email clients can load the image.
 */
export function getEmailLogoHtml(siteUrl: string): string {
  const logoUrl = `${siteUrl.replace(/\/$/, '')}/primate-logo.png`;
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: #ffffff; padding: 8px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e4e4e7;">
        <img src="${logoUrl}" alt="Primate Research" width="40" height="40" style="display: block;" />
      </div>
    </div>
  `;
}
