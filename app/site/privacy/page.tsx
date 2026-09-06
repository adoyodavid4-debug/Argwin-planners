import type { Metadata } from 'next'
import LegalShell, { LSection } from '@/components/legal/LegalShell'

const BASE = 'https://www.arwignplanners.com'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Arwign Planners collects, uses, and protects your personal information, and the rights you have over your data (GDPR & CCPA).',
  alternates: { canonical: `${BASE}/privacy` },
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="6 September 2026"
      intro="Arwign Planners (“we”, “us”, “our”) respects your privacy. This policy explains what information we collect when you visit arwignplanners.com or buy from us, how we use it, who we share it with, and the choices and rights you have."
    >
      <LSection title="1. Who we are">
        <p>Arwign Planners is a digital storefront selling downloadable and printable planners, notebooks, and related tools. For any privacy question, contact us at <a href="mailto:support@arwignplanners.com" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a>. We are the data controller for the information described here.</p>
      </LSection>

      <LSection title="2. Information we collect">
        <ul>
          <li><strong>Information you give us</strong> — your name, email address, and (if you opt in to SMS briefings) your phone number; the contents of messages you send us; and account details if you create an account.</li>
          <li><strong>Order information</strong> — the products you buy, order totals, and your billing email. <strong>We never see or store your full card number</strong> — payments are processed directly by our payment providers.</li>
          <li><strong>Automatically collected information</strong> — device and browser type, IP address, pages viewed, referring links, and similar usage data collected through cookies and analytics.</li>
        </ul>
      </LSection>

      <LSection title="3. How we use your information">
        <ul>
          <li>To deliver your purchase — generate your download links and email your receipt and files.</li>
          <li>To provide the Arwign Calendar features you enable (e.g. the email/SMS Daily Briefing).</li>
          <li>To process payments, prevent fraud, and keep your account secure.</li>
          <li>To send marketing emails (new releases, tips, discounts) <strong>only where you have opted in</strong> — you can unsubscribe at any time.</li>
          <li>To respond to your enquiries and provide support.</li>
          <li>To understand and improve our site, and to meet legal and tax obligations.</li>
        </ul>
        <p>Our lawful bases are: performance of a contract (delivering your order), your consent (marketing and SMS), our legitimate interests (securing and improving the service), and legal obligation (tax and accounting).</p>
      </LSection>

      <LSection title="4. Cookies & analytics">
        <p>We use essential cookies to run the cart and checkout, and analytics cookies (such as Google Analytics 4 and the Meta/Facebook pixel) to understand how the site is used. You can block or delete cookies in your browser settings; essential cookies are required for checkout to work.</p>
      </LSection>

      <LSection title="5. Who we share it with">
        <p>We do <strong>not</strong> sell your personal information. We share it only with the service providers who help us run the store, and only as needed:</p>
        <ul>
          <li><strong>Payment processors</strong> — Stripe, PayPal, Pesapal, and Paystack process your payment securely.</li>
          <li><strong>Email</strong> — we send transactional and (opt-in) marketing email through our email provider.</li>
          <li><strong>Hosting & database</strong> — our site and data are hosted with Vercel and Supabase.</li>
          <li><strong>Analytics</strong> — Google and Meta, as described above.</li>
          <li><strong>SMS</strong> — Twilio, if you opt in to SMS briefings.</li>
        </ul>
        <p>We may also disclose information where required by law, or to protect our rights, users, or the public.</p>
      </LSection>

      <LSection title="6. Data retention">
        <p>We keep order and account records for as long as your account is active and as required for tax and legal purposes. Marketing contacts are kept until you unsubscribe. You can ask us to delete your data at any time (see your rights below).</p>
      </LSection>

      <LSection title="7. Your rights">
        <p>Depending on where you live, you have rights over your personal data:</p>
        <ul>
          <li><strong>UK / EU (GDPR)</strong> — access, correct, delete, restrict, or object to processing, and data portability.</li>
          <li><strong>US / California (CCPA/CPRA)</strong> — know what we collect, request deletion, and opt out of “sale” (we do not sell your data). We will never discriminate against you for exercising these rights.</li>
        </ul>
        <p>To exercise any right, email <a href="mailto:support@arwignplanners.com" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a> and we will respond within the timeframe required by law.</p>
      </LSection>

      <LSection title="8. Security & international transfers">
        <p>We use encryption in transit (HTTPS) and reputable providers with their own security programmes. Because our providers operate globally (including in the US and EU/UK), your data may be processed outside your country under appropriate safeguards. No method of transmission is 100% secure, but we work to protect your information.</p>
      </LSection>

      <LSection title="9. Children">
        <p>Our store is intended for adults. We do not knowingly collect personal information from anyone under 16. If you believe a child has provided us data, contact us and we will delete it.</p>
      </LSection>

      <LSection title="10. Changes to this policy">
        <p>We may update this policy from time to time. The “last updated” date above shows the latest revision; material changes will be highlighted on this page.</p>
      </LSection>
    </LegalShell>
  )
}
