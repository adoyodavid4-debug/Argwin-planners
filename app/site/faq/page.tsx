import type { Metadata } from 'next'
import LegalShell, { LSection } from '@/components/legal/LegalShell'
import { FaqSchema } from '@/components/seo/JsonLd'

const BASE = 'https://www.arwignplanners.com'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Answers about Arwign Planners: what you receive, delivery, compatible apps, sizes, payments, refunds, and licensing.',
  alternates: { canonical: `${BASE}/faq` },
}

const GROUPS: { title: string; qa: { q: string; a: string }[] }[] = [
  {
    title: 'Orders & delivery',
    qa: [
      { q: 'What will I receive?', a: 'A high-resolution, fully hyperlinked PDF planner in A4, ready to use in your favourite app or to print at home. Your planners are undated, so you can start any time and reuse them year after year.' },
      { q: 'How fast is delivery?', a: 'Instant. A secure download link is emailed to you the moment your payment clears, and every purchase is also saved to your account so you can re-download it any time.' },
      { q: 'I didn’t receive my download — what should I do?', a: 'First check your spam or promotions folder, then log in to your account where all your files are stored. If it’s still missing, email support@arwignplanners.com with your order number and we’ll sort it out quickly.' },
    ],
  },
  {
    title: 'Using your planner',
    qa: [
      { q: 'Which apps and devices does it work with?', a: 'Any PDF annotation app — GoodNotes, Notability, and Xodo are the most popular. You can use it on an iPad, Android tablet, or Windows/Mac, or simply print it at home.' },
      { q: 'What size are the planners?', a: 'A4. The layouts are designed for that page ratio so nothing is cropped or stretched, on screen or in print.' },
      { q: 'Do the hyperlinks actually work?', a: 'Yes. Tap any tab or contents line to jump straight to that page, and tap the footer mark to glide back — it works seamlessly in GoodNotes and Notability.' },
      { q: 'Can I print my planner?', a: 'Absolutely. Print the A4 PDF at home or at a print shop, as many times as you like for your personal use.' },
    ],
  },
  {
    title: 'Payment & refunds',
    qa: [
      { q: 'What payment methods do you accept?', a: 'You can pay securely by card, PayPal, and our other supported providers at checkout. Your card details are handled directly by the payment processor — we never see or store them.' },
      { q: 'What is your refund policy?', a: 'Because these are instant digital downloads, sales are generally final — but we offer a 30-day happiness guarantee: if anything is wrong with your file, we’ll fix it or refund you. See our Refund Policy for details.' },
      { q: 'Is checkout secure?', a: 'Yes. The whole site runs over encrypted HTTPS, and payments are processed by trusted providers (Stripe, PayPal, Pesapal, and Paystack).' },
    ],
  },
  {
    title: 'Account & licence',
    qa: [
      { q: 'Do I need an account?', a: 'Your purchases are saved to an account so you can re-download them whenever you need. Your receipt and links are also emailed to you at checkout.' },
      { q: 'Can I share the files with friends?', a: 'Your purchase is licensed for your own personal use. Please don’t resell, share, or redistribute the files — it’s what lets a small studio keep making beautiful planners.' },
      { q: 'How do I get more help?', a: 'Email support@arwignplanners.com or use our contact page — we’re happy to help.' },
    ],
  },
]

export default function FaqPage() {
  const allQa = GROUPS.flatMap((g) => g.qa).map((x) => ({ question: x.q, answer: x.a }))
  return (
    <>
      <FaqSchema items={allQa} />
      <LegalShell
        title="Frequently Asked Questions"
        intro="Everything you need to know about buying and using Arwign planners. Can’t find your answer? Email support@arwignplanners.com."
      >
        {GROUPS.map((g) => (
          <LSection key={g.title} title={g.title}>
            <div className="space-y-5">
              {g.qa.map((item) => (
                <div key={item.q}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.q}</p>
                  <p className="mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </LSection>
        ))}
      </LegalShell>
    </>
  )
}
