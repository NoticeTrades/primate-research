/**
 * Logo block for HTML emails (admin notify, verification, welcome, resend).
 * Uses absolute URL so email clients can load the image.
 * Wrapped with color-scheme: light so dark-mode clients (Apple Mail, Gmail app)
 * don't invert the image — the white-on-blue logo stays correct.
 */
export function getEmailLogoHtml(siteUrl: string): string {
  const logoUrl = `${siteUrl.replace(/\/$/, '')}/primate-logo.png?v=20260324`;
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <!-- Keep light color-scheme to avoid dark-mode image inversion in some mail clients -->
      <div style="display: inline-block; color-scheme: light; -webkit-text-size-adjust: 100%;">
        <img src="${logoUrl}" alt="Primate Trading" width="40" height="40" style="display: block; border: 0; outline: none;" />
      </div>
    </div>
  `;
}
