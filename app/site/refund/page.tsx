import type { Metadata } from 'next'
import LegalShell, { LSection } from '@/components/legal/LegalShell'

const BASE = 'https://www.arwignplanners.com'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Our refund policy for digital downloads, including the Arwign Planners 30-day happiness guarantee and how to request help.',
  alternates: { canonical: `${BASE}/refund` },
}

export default function RefundPage() {
  return (
    <LegalShell
      title="Refund Policy"
      updated="6 September 2026"
      intro="We want you to love your planner. Because our products are instant digital downloads, we can’t offer refunds for change of mind — but our 30-day happiness guarantee means we’ll always make it right if something is wrong."
    >
      <LSection title="1. Digital products are non-returnable">
        <p>Once a digital file has been delivered it can’t be “returned”, so <strong>all sales are generally final</strong>. Please read the product description — including formats, page count, and size (A4) — before you buy, and reach out with any questions first. We’re happy to help.</p>
      </LSection>

      <LSection title="2. Our 30-day happiness guarantee">
        <p>If there’s a genuine problem with your purchase, contact us within <strong>30 days</strong> and we’ll fix it or refund you. This covers, for example:</p>
        <ul>
          <li>A file that is corrupt, won’t open, or is missing pages;</li>
          <li>The wrong item delivered, or a file that doesn’t match its description;</li>
          <li>A duplicate or accidental purchase (before the file is used);</li>
          <li>Non-delivery — you paid but never received your download link.</li>
        </ul>
        <p>In most cases we’ll first try to resolve the issue (for example, re-sending your file or fixing it). If we can’t, we’ll issue a full refund.</p>
      </LSection>

      <LSection title="3. What isn’t covered">
        <ul>
          <li>Change of mind after you’ve downloaded the file;</li>
          <li>Buying the wrong product when the details were clearly listed (contact us — we’ll usually swap it);</li>
          <li>Lack of a compatible device or app (our files work in GoodNotes, Notability, Xodo, and any standard PDF app).</li>
        </ul>
      </LSection>

      <LSection title="4. How to request a refund or help">
        <p>Email <a href="mailto:support@arwignplanners.com" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a> with your <strong>order number</strong> and a short description of the problem (a screenshot helps). We aim to reply within 1–2 business days.</p>
      </LSection>

      <LSection title="5. How refunds are processed">
        <p>Approved refunds are returned to your original payment method (card, PayPal, Pesapal, or Paystack). It can take a few business days for your bank or provider to post the refund. If you believe you were charged in error, please contact us before opening a chargeback so we can resolve it quickly.</p>
      </LSection>
    </LegalShell>
  )
}
