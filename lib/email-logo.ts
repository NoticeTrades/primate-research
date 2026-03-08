/**
 * Logo block for HTML emails (admin notify, verification, welcome, resend).
 * Uses absolute URL so email clients can load the image.
 * Wrapped with color-scheme: light so dark-mode clients (Apple Mail, Gmail app)
 * don't invert the image — the white-on-blue logo stays correct.
 */
export function getEmailLogoHtml(siteUrl: string): string {
  const logoUrl = `${siteUrl.replace(/\/$/, '')}/primate-logo.png`;
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <!-- color-scheme: light forces this block to render in light mode so the white-on-blue logo is not inverted in dark mode -->
      <div style="display: inline-block; background-color: #2563eb; padding: 10px; border-radius: 8px; color-scheme: light; -webkit-text-size-adjust: 100%;">
        <img src="${logoUrl}" alt="Primate Research" width="40" height="40" style="display: block; border: 0; outline: none;" />
      </div>
    </div>
  `;
}
