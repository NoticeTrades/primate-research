'use client';

import Navigation from '../components/Navigation';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navigation />
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-8">
            Terms of Service
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-8">
              These Terms of Service ("Terms") govern your access to and use of all websites, applications, dashboards, APIs, alerts, newsletters, data feeds, community areas, and other offerings provided by Primate Trading (collectively, the "Services"). By creating an account, accessing the Services, or continuing to use the Services after updates take effect, you agree to be bound by these Terms, our Privacy Policy, and any supplemental policies referenced herein. If you do not agree, do not access or use the Services.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                1. Eligibility & Account Responsibilities
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                You represent that you are at least eighteen (18) years old, legally capable of entering binding contracts, and not barred from receiving services under applicable law. You agree to provide accurate registration details and promptly update them if they change. You are solely responsible for safeguarding your credentials, MFA tokens, devices, and API keys. All actions taken through your account are deemed authorized by you. Notify us immediately at{' '}
                <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  nickthomasfx@gmail.com
                </a>{' '}
                if you suspect unauthorized activity; we may suspend or terminate accounts to protect the platform.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                2. Permitted Use & Prohibited Conduct
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                We grant you a limited, revocable, non-transferable license to access the Services for your personal analysis or internal business evaluation. You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>Scrape, crawl, spider, harvest, mine, screenshot, or otherwise copy data (including via AI training sets) without our written consent.</li>
                <li>Reverse engineer, decompile, disassemble, translate, or create derivative works from any portion of the Services.</li>
                <li>Use automation, bots, or rate-abusive tooling to generate requests exceeding normal user behavior; we may throttle or block suspicious traffic.</li>
                <li>Use the Services to provide competing analytics, advisory services, trading signals, or marketing for competing platforms.</li>
                <li>Upload malicious code, disrupt infrastructure, bypass security controls, or access non-public areas.</li>
                <li>Violate applicable laws, sanctions, or regulations (SEC, FINRA, CFTC, FCA, OFAC, BIS, etc.).</li>
              </ul>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                We monitor usage and may suspend, terminate, or refer activity to authorities if we detect abuse or illegal conduct.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                3. Market Data, Third-Party Inputs & Accuracy
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                The Services aggregate information from regulatory filings, exchanges, vendors, public APIs, and community contributions. Data may be delayed, incomplete, inaccurate, or withdrawn without notice. Vendors can change licensing terms, latency, or coverage at any time. You accept full responsibility for independently validating data before relying on it and for monitoring any disclosures referenced on the site.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                4. No Investment Advice; Independent Research Required
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                Primate Trading is not a broker-dealer, investment adviser, fiduciary, or commodity trading advisor.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>No output, message, portfolio tool, chart, or communication constitutes a recommendation or solicitation to buy or sell securities or digital assets.</li>
                <li>You remain solely responsible for evaluating securities, determining suitability, executing trades, and complying with all applicable laws.</li>
                <li>Past performance does not guarantee future results. Investments involve risk, including loss of principal. Always conduct your own due diligence and consult licensed professionals.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                5. Intellectual Property & Feedback
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                All content, trademarks, service marks, algorithms, datasets, trade secrets, and software underlying the Services are owned by Primate Trading or our licensors and protected by law. No ownership rights transfer to you. By submitting feedback or suggestions you grant us a perpetual, irrevocable, royalty-free license to use the feedback without restriction or obligation.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                6. Anti-Scraping, Anti-Extraction & Monitoring
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Unauthorized scraping, bulk downloading, exporting, screen recording, or redistribution of our content is prohibited. We may watermark, seed honeypot data, rate-limit, or pursue legal action to protect our platform. Removing proprietary notices or circumventing access controls is a material breach.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                7. Disclaimers
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                The Services are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, express or implied.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-lg text-zinc-700 dark:text-zinc-300">
                <li>We do not warrant that the Services will be uninterrupted, timely, secure, or error-free, or that data will be accurate or reliable.</li>
                <li>You assume all risk for decisions made based on the Services. We are not responsible for third-party services, integrations, or linked content.</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                To the fullest extent permitted by law, Primate Trading and its affiliates, directors, officers, employees, agents, suppliers, and partners will not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including trading losses, lost profits, lost data, or service interruptions. Our aggregate liability for all claims arising out of or related to the Services will not exceed the greater of (a) one hundred (100) U.S. dollars or (b) the total amount you paid to Primate Trading in the twelve (12) months preceding the event giving rise to the claim, if any.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                9. Indemnification
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Primate Trading, its affiliates, directors, officers, employees, contractors, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to your access to the Services, violation of these Terms, infringement of third-party rights, or content you submit.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                10. Binding Arbitration & Class-Action Waiver
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Any dispute, claim, or controversy arising out of or relating to these Terms or the Services will be resolved exclusively through final and binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. Arbitration will occur in Wilmington, Delaware before a single arbitrator, and the Federal Arbitration Act will govern interpretation and enforcement. You and Primate Trading waive the right to a jury trial and to participate in class, collective, or representative actions. Claims must be brought solely in an individual capacity. Either party may seek injunctive or equitable relief in court to prevent actual or threatened intellectual property infringement or misuse of confidential information.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                11. Governing Law & Venue
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                These Terms, and any disputes not subject to arbitration, are governed by the laws of the State of Delaware and the United States without regard to conflict-of-law principles. Subject to the arbitration clause above, you consent to the exclusive jurisdiction of the state and federal courts located in New Castle County, Delaware.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                12. Continuous Updates & Policy Hierarchy
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                We may modify these Terms, our Privacy Policy, acceptable use rules, or feature-specific policies at any time. Material changes will be communicated via email, product banners, or updated effective dates. Updated terms supersede prior versions. Your continued use after changes become effective constitutes acceptance. Supplemental agreements (e.g., for edge functions or beta programs) control to the extent of a conflict.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                13. Content Ownership & No Unauthorized Distribution
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                All articles, videos, templates, models, graphics, and other deliverables remain the property of Primate Trading or our licensors. You may download limited excerpts for personal reference but may not resell, republish, mirror, or redistribute our content without a written license. Copying gated research, providing it to another firm, or training AI models on our proprietary materials is strictly prohibited.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                14. User Content, Feedback & License Grant
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                If you submit comments, files, strategies, code, or other content, you represent that you have all necessary rights and that the content does not violate law or third-party rights. You grant Primate Trading a worldwide, royalty-free, sublicensable license to host, store, reproduce, modify, publish, translate, adapt, distribute, and display such content as needed to operate and improve the Services. We may remove content that violates these Terms or legal requirements.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                15. Confidentiality & Security
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                You may gain access to non-public information such as upcoming features, models, or private discussions. You agree to protect that information, use it solely in connection with the Services, and refrain from disclosing it without our written consent. Report suspected vulnerabilities or incidents to{' '}
                <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  nickthomasfx@gmail.com
                </a>{' '}
                and refrain from exploiting them.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                16. Compliance, Sanctions & Export Control
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                You represent that you are not located in, residing in, or organized under the laws of any embargoed country and that you are not on any U.S. government list of prohibited or restricted parties. You will comply with all applicable export control, anti-corruption, anti-money laundering, and sanctions regulations. The Services may not be used for unlawful surveillance, weapons development, or other prohibited activities.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                17. Data Retention & Deletion
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                We may retain account records, usage logs, and derived analytics as needed to operate the Services, comply with legal obligations, enforce agreements, and resolve disputes. Following termination we may delete or anonymize your data pursuant to internal policies, but are not obligated to store backups beyond statutory requirements. Export any needed information before closing your account.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                18. Beta, Experimental & Third-Party Features
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Beta or experimental features are provided "as is," may lack full security or support, and may be discontinued at any time. Integrations or links to third-party services are governed by the third party's terms and privacy statements. Use them at your own risk.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                19. Force Majeure
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Neither party will be liable for delays or failures resulting from events beyond reasonable control, including natural disasters, pandemics, power failures, labor disputes, governmental actions, civil disturbances, acts of terror, supply chain interruptions, or failures of third-party networks. We will use commercially reasonable efforts to resume performance as soon as practicable.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                20. Severability & Waiver
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                If any provision of these Terms is held unenforceable, the remaining provisions remain in full force and effect, and the unenforceable portion will be modified to the minimum extent necessary. Failure to enforce any provision does not constitute a waiver of that provision.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                21. Entire Agreement & Assignment
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                These Terms, together with incorporated policies, constitute the entire agreement between you and Primate Trading regarding the Services and supersede prior agreements. You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations in connection with a merger, acquisition, or sale of assets.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                22. Contact
              </h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Questions or concerns about these Terms may be directed to{' '}
                <a href="mailto:nickthomasfx@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  nickthomasfx@gmail.com
                </a>
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
