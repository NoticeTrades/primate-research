'use client';

import Navigation from '../components/Navigation';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navigation />
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-8">
              Primate Trading provides financial ratings, insights, and data tools. This Privacy Policy explains how we collect, use, and protect information when you use our website, web applications, and supporting services. If you have any questions, contact us at{' '}
              <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                nickthomasfx@gmail.com
              </a>
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                Information We Collect
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                We collect information to deliver a secure and tailored research experience. The data we collect includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>
                  <strong>Account information:</strong> name, email address, password (stored in hashed form), and investor profile preferences you choose to share.
                </li>
                <li>
                  <strong>Usage data:</strong> log-ins, device information, IP address, session events, feature interactions, and error diagnostics used to maintain performance and security.
                </li>
                <li>
                  <strong>Financial research inputs:</strong> watchlists, saved securities, ratings, and notes you create inside the product for your personal use.
                </li>
                <li>
                  <strong>Communications:</strong> support requests, survey responses, and notification preferences when you contact us or subscribe to updates.
                </li>
                <li>
                  <strong>Contact and consent records:</strong> your mobile phone number when you choose to receive SMS, the date and time you affirmatively opted in (and opted out, if applicable), and your notification preferences. We retain these records to demonstrate consent for transactional or informational text messages as required by applicable law and carrier policies.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                How We Use Information
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                We process information for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>Authenticate you, deliver account functionality, and personalize dashboards and analytic views.</li>
                <li>Operate, maintain, and improve our research tools, including troubleshooting, debugging, and analytics.</li>
                <li>Send transactional communications such as password resets, service announcements, and updates about our platform.</li>
                <li>
                  Send <strong>optional SMS text messages</strong> about <strong>live trade alerts</strong> only if you separately opt in on the Live Trades or Notifications settings, agree to the in-product consent language, and provide a valid mobile number. Messages are automated, sent only when a new live trade is posted (not on a fixed schedule), and may include symbol, direction, size, entry, and optional stop/target context. Message frequency varies with trading activity. We do not sell your phone number or use it for unrelated marketing without additional consent.
                </li>
                <li>Provide customer support and answer questions you submit through email or in-product forms.</li>
                <li>Protect the platform from fraud, abuse, scraping, and other activity that violates our Terms of Service.</li>
                <li>Comply with applicable laws and enforce our legal agreements.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                How We Share Information
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                We do not sell your personal information. We share information only with trusted service providers who support our operations and are obligated to safeguard your data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>
                  <strong>Infrastructure partners:</strong> Supabase for authentication and data storage, Amazon Web Services for hosting, and analytics vendors that help us understand feature usage and performance.
                </li>
                <li>
                  <strong>Communication providers:</strong> Services that send product emails and notifications on our behalf, including Amazon Web Services (AWS) Simple Email Service, and for optional SMS alerts, Twilio Inc. or a comparable messaging provider that delivers texts only per your preferences.
                </li>
                <li>
                  <strong>Professional advisors:</strong> Legal, compliance, or security consultants engaged to protect our business and users.
                </li>
              </ul>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                We may also disclose information if required by law, in response to valid legal requests, or to protect the rights, property, or safety of our users or the public.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                Data Retention & Security
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                We retain personal information for as long as necessary to deliver services, comply with legal obligations, resolve disputes, and enforce our agreements. We use industry-standard safeguards, including encryption in transit and at rest, access controls, and continuous monitoring. No method of transmission or storage is 100% secure; we will notify you of any material security incidents in accordance with applicable laws.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                SMS / Text Messages (Live trade alerts)
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300 mb-4">
                <li>
                  <strong>Opt-in only:</strong> We send SMS only after you enter a mobile number, turn on live trade SMS in the product, and check the consent box that describes the program. We do not use a pre-checked box for consent.
                </li>
                <li>
                  <strong>What you receive:</strong> Automated texts when a new live trade is published—typically including instrument, side, size, entry, and optional risk levels. This is informational about our own alerts, not third-party ads.
                </li>
                <li>
                  <strong>Frequency and rates:</strong> Message frequency varies with how often trades are posted (sometimes none for extended periods). Message and data rates may apply; your carrier may charge for incoming texts.
                </li>
                <li>
                  <strong>Opt-out:</strong> You may opt out at any time by replying <strong>STOP</strong> to any message (where supported), disabling SMS in Live Trades / Notifications and saving, or emailing{' '}
                  <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    nickthomasfx@gmail.com
                  </a>
                  . After you opt out, we will not send further live trade SMS unless you opt in again.
                </li>
                <li>
                  <strong>Help:</strong> Reply <strong>HELP</strong> for assistance or contact us at the email above.
                </li>
                <li>
                  <strong>Delivery:</strong> We use a messaging API provider (e.g. Twilio) as a processor; they are contractually limited to delivering messages on our behalf. Carriers are not liable for delayed or undelivered messages.
                </li>
                <li>
                  <strong>Records:</strong> We may store your number, consent timestamp, and opt-out requests to comply with telecommunications rules and to resolve disputes.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                Your Choices
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>Update account information and notification preferences within your profile settings.</li>
                <li>
                  Opt out of non-essential emails by using the unsubscribe link in any message or contacting{' '}
                  <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    nickthomasfx@gmail.com
                  </a>
                </li>
                <li>
                  Manage or revoke SMS consent for live trades as described in the SMS section above and in your Live Trades / Notifications settings.
                </li>
                <li>Request a copy or deletion of your personal data by emailing our support team. We may retain certain records if required by law or legitimate business purposes.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                International Users
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Primate Trading is operated from the United States. If you access the services from another region, you consent to transferring and processing your information in the U.S. where data protection laws may differ from those in your jurisdiction.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                Changes to This Policy
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                We may update this Privacy Policy to reflect new features, legal requirements, or operational practices. When we make material changes we will post an updated revision date and, if appropriate, notify you through the product or email. Continued use of the services after changes become effective constitutes acceptance of the revised policy.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
