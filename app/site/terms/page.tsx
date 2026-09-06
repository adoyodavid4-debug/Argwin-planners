import type { Metadata } from 'next'
import LegalShell, { LSection } from '@/components/legal/LegalShell'

const BASE = 'https://www.arwignplanners.com'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions for using Arwign Planners and purchasing our digital and printable products.',
  alternates: { canonical: `${BASE}/terms` },
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="6 September 2026"
      intro="These Terms of Service (“Terms”) govern your use of arwignplanners.com and your purchase of our products. By using the site or placing an order, you agree to these Terms."
    >
      <LSection title="1. Our products">
        <p>Arwign Planners sells <strong>digital downloads</strong> (hyperlinked PDF planners and notebooks) and printable files. Products are delivered electronically — there is no physical item shipped unless a listing explicitly says so. After a successful payment, your download links are emailed to you and saved to your account.</p>
      </LSection>

      <LSection title="2. Accounts">
        <p>You may need an account to access downloads or the Arwign Calendar. You are responsible for keeping your login details secure and for all activity under your account. Provide accurate information and keep it up to date.</p>
      </LSection>

      <LSection title="3. Orders, pricing & payment">
        <ul>
          <li>Prices are shown in US dollars (USD) unless stated otherwise and may change at any time before purchase.</li>
          <li>Payment is taken at checkout through our providers (Stripe, PayPal, Pesapal, or Paystack). Your order is confirmed once payment clears.</li>
          <li>You are responsible for any taxes or fees that apply in your country.</li>
        </ul>
      </LSection>

      <LSection title="4. Licence to use our products">
        <p>When you buy a product, we grant you a <strong>personal, non-exclusive, non-transferable licence</strong> for your own personal use. You <strong>may</strong> download the files to your devices and print them for personal use. You <strong>may not</strong>:</p>
        <ul>
          <li>Resell, sublicense, share, or redistribute the files, in whole or in part;</li>
          <li>Claim the designs as your own or use them commercially without written permission;</li>
          <li>Upload the files to file-sharing sites or forward them to others.</li>
        </ul>
        <p>All intellectual property in our products and site — designs, layouts, text, and branding — remains owned by Arwign Planners.</p>
      </LSection>

      <LSection title="5. Delivery & access">
        <p>Digital products are delivered instantly by email and in your account. Please keep your download links private. If a link expires or you have trouble accessing a file, contact support and we will help.</p>
      </LSection>

      <LSection title="6. Refunds">
        <p>Because our products are instant digital downloads, sales are generally final. However, we stand behind our work — please see our <a href="/refund" style={{ color: 'var(--gold)' }}>Refund Policy</a> for our 30-day guarantee and how to request help.</p>
      </LSection>

      <LSection title="7. Acceptable use">
        <p>You agree not to misuse the site — including attempting to breach security, disrupt the service, scrape content, or use it for anything unlawful.</p>
      </LSection>

      <LSection title="8. Disclaimers">
        <p>Our products are provided “as is”. They are planning and organisational <strong>tools</strong> and are not professional financial, medical, legal, or mental-health advice. You are responsible for how you use them. We do not warrant that the site will be uninterrupted or error-free.</p>
      </LSection>

      <LSection title="9. Limitation of liability">
        <p>To the fullest extent permitted by law, Arwign Planners will not be liable for any indirect, incidental, or consequential damages arising from your use of the site or products. Where liability cannot be excluded, it is limited to the amount you paid for the product in question.</p>
      </LSection>

      <LSection title="10. Third-party links">
        <p>The site may link to third-party services (such as GoodNotes, Notability, or our payment providers). We are not responsible for their content or practices; their own terms and privacy policies apply.</p>
      </LSection>

      <LSection title="11. Changes & governing law">
        <p>We may update these Terms from time to time; the “last updated” date shows the latest version, and continued use means you accept the changes. These Terms are governed by the laws applicable to Arwign Planners’ place of business, without regard to conflict-of-law rules.</p>
      </LSection>
    </LegalShell>
  )
}
