import type { Locale } from './types'

interface TemplateOutput {
  subject: string
  html: string
  text: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.arwignplanners.com'

// Shared branded header (logo) + footer used across all emails. Change these two
// helpers to re-brand every email at once.
export function brandHeader(): string {
  return `<div style="background:#fff;text-align:center;padding:28px 24px;border-bottom:1px solid #E8E4DB">
    <img src="${BASE_URL}/logo.png" alt="Arwign Planners" style="height:40px;width:auto;max-width:200px" />
  </div>`
}

export function brandFooter(locale: Locale): string {
  const year = new Date().getFullYear()
  const line = locale === 'fr'
    ? `Vous recevez cet email car vous êtes inscrit(e) sur Arwign Planners. <a href="{{unsubscribe_url}}" style="color:#888">Se désabonner</a>`
    : `You received this because you signed up at Arwign Planners. <a href="{{unsubscribe_url}}" style="color:#888">Unsubscribe</a>`
  return `<div style="padding:22px 40px;border-top:1px solid #E8E4DB;background:#FAF8F4">
    <p style="font-size:12px;color:#999;margin:0 0 6px">${line}</p>
    <p style="font-size:12px;color:#aaa;margin:0"><a href="${BASE_URL}" style="color:#C9A84C;text-decoration:none">arwignplanners.com</a> · © ${year} Arwign Planners</p>
  </div>`
}

function wrap(locale: Locale, subject: string, body: string): TemplateOutput {
  const html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}a{color:#C9A84C}.wrapper{padding:32px 16px}.container{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E8E4DB}.content{padding:36px 40px}</style></head><body><div class="wrapper"><div class="container"><div style="height:4px;background:#C9A84C"></div>${brandHeader()}<div class="content">${body}</div>${brandFooter(locale)}</div></div></body></html>`
  const text = subject

  return { subject, html, text }
}

const templates: Record<string, (locale: Locale, data: Record<string, unknown>) => TemplateOutput> = {
  'optin.confirm': (locale, data) => {
    const confirmUrl = `${BASE_URL}/api/optin/confirm?token=${data.token}`
    if (locale === 'fr') {
      return wrap(locale, 'Confirmez votre inscription pour recevoir votre ressource gratuite', `
        <h2 style="color:#1A1820">Presque là !</h2>
        <p>Bonjour${data.first_name ? ` ${data.first_name}` : ''},</p>
        <p>Cliquez sur le bouton ci-dessous pour confirmer votre email et recevoir votre <strong>${data.magnet_title ?? 'ressource gratuite'}</strong>.</p>
        <p style="text-align:center;margin:32px 0"><a href="${confirmUrl}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Confirmer mon email →</a></p>
        <p style="font-size:13px;color:#888">Ce lien expire dans 24 heures.</p>
      `)
    }
    return wrap(locale, 'Confirm your email to get your free resource', `
      <h2 style="color:#1A1820">Almost there!</h2>
      <p>Hi${data.first_name ? ` ${data.first_name}` : ''},</p>
      <p>Click the button below to confirm your email and receive your <strong>${data.magnet_title ?? 'free resource'}</strong>.</p>
      <p style="text-align:center;margin:32px 0"><a href="${confirmUrl}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Confirm my email →</a></p>
      <p style="font-size:13px;color:#888">This link expires in 24 hours.</p>
    `)
  },

  'optin.delivery': (locale, data) => {
    if (locale === 'fr') {
      return wrap(locale, `Votre ressource gratuite est prête à télécharger`, `
        <h2 style="color:#1A1820">Votre téléchargement est prêt 🎉</h2>
        <p>Merci d'avoir confirmé votre email !</p>
        <p>Voici votre <strong>${data.magnet_title}</strong> :</p>
        <p style="text-align:center;margin:32px 0"><a href="${data.download_url}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Télécharger maintenant →</a></p>
        <p style="font-size:13px;color:#888">Ce lien expire le ${data.expires_at}.</p>
        <p>Bonne planification !</p>
        <p>— L'équipe Arwign Planners</p>
      `)
    }
    return wrap(locale, `Your free resource is ready to download`, `
      <h2 style="color:#1A1820">Your download is ready 🎉</h2>
      <p>Thank you for confirming your email!</p>
      <p>Here's your <strong>${data.magnet_title}</strong>:</p>
      <p style="text-align:center;margin:32px 0"><a href="${data.download_url}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download now →</a></p>
      <p style="font-size:13px;color:#888">This link expires on ${data.expires_at}.</p>
      <p>Happy planning!</p>
      <p>— The Arwign Planners Team</p>
    `)
  },

  'nurture.welcome': (locale, data) => {
    if (locale === 'fr') {
      return wrap(locale, `Bienvenue dans la famille Arwign 💛`, `
        <h2>Bienvenue !</h2>
        <p>Vous faites maintenant partie de la communauté Arwign Planners.</p>
        <p>Dans les prochains jours, je vais partager avec vous mes meilleures astuces pour planifier votre vie et atteindre vos objectifs.</p>
        <p>En attendant, explorez notre boutique :</p>
        <p><a href="${BASE_URL}/fr/shop">Voir tous nos agendas →</a></p>
      `)
    }
    return wrap(locale, `Welcome to the Arwign family 💛`, `
      <h2>Welcome!</h2>
      <p>You're now part of the Arwign Planners community.</p>
      <p>Over the next few days, I'll share my best tips for planning your life and hitting your goals.</p>
      <p>In the meantime, explore our shop:</p>
      <p><a href="${BASE_URL}/shop">Browse all planners →</a></p>
    `)
  },

  'nurture.value': (locale, data) => {
    if (locale === 'fr') {
      return wrap(locale, `3 erreurs que font la plupart des gens avec leur agenda`, `
        <h2>La vraie raison pour laquelle les agendas ne fonctionnent pas</h2>
        <p>La plupart des gens achètent un agenda, l'utilisent pendant 2 semaines, puis l'abandonnent. Voici pourquoi :</p>
        <ol>
          <li><strong>Trop compliqué</strong> — Un bon agenda doit être simple à remplir.</li>
          <li><strong>Pas adapté à leur vie</strong> — C'est pour ça que nos agendas sont conçus pour des modes de vie réels.</li>
          <li><strong>Pas de routine</strong> — 5 minutes le matin suffisent.</li>
        </ol>
        <p>Nos agendas sont conçus pour corriger exactement ces trois problèmes.</p>
        <p><a href="${BASE_URL}/fr/shop">Trouver l'agenda qui vous correspond →</a></p>
      `)
    }
    return wrap(locale, `3 mistakes most people make with planners`, `
      <h2>The real reason planners don't work</h2>
      <p>Most people buy a planner, use it for 2 weeks, then quit. Here's why:</p>
      <ol>
        <li><strong>Too complicated</strong> — A good planner should take seconds to fill in.</li>
        <li><strong>Not designed for real life</strong> — That's why our planners are built for actual lifestyles.</li>
        <li><strong>No routine</strong> — 5 minutes in the morning is all it takes.</li>
      </ol>
      <p>Our planners are designed to fix exactly those three things.</p>
      <p><a href="${BASE_URL}/shop">Find the planner that fits your life →</a></p>
    `)
  },

  'nurture.offer': (locale, data) => {
    if (locale === 'fr') {
      return wrap(locale, `Notre bundle le plus populaire — et pourquoi il change la donne`, `
        <h2>Le bundle qui change tout</h2>
        <p>Si vous avez aimé votre ressource gratuite, vous allez adorer notre bundle <strong>${data.bundle_name ?? 'Planificateur Complet'}</strong>.</p>
        <p>Il regroupe tout ce dont vous avez besoin pour planifier votre année, votre budget et votre bien-être — dans un seul téléchargement.</p>
        <p style="text-align:center;margin:32px 0"><a href="${data.bundle_url ?? BASE_URL + '/fr/shop'}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Voir le bundle →</a></p>
      `)
    }
    return wrap(locale, `Our most popular bundle — and why it's a game-changer`, `
      <h2>The bundle that changes everything</h2>
      <p>If you loved your free resource, you'll love our <strong>${data.bundle_name ?? 'Complete Planner'}</strong> bundle.</p>
      <p>It brings together everything you need to plan your year, budget, and wellness — in one download.</p>
      <p style="text-align:center;margin:32px 0"><a href="${data.bundle_url ?? BASE_URL + '/shop'}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">See the bundle →</a></p>
    `)
  },

  'pod.shipped': (locale, data) => {
    if (locale === 'fr') {
      return wrap(locale, `Votre commande est en route ! 📦`, `
        <h2>Votre commande a été expédiée !</h2>
        <p>Votre cahier / agenda imprimé est en chemin. Voici vos informations de suivi :</p>
        ${data.tracking_url ? `<p style="text-align:center;margin:32px 0"><a href="${data.tracking_url}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Suivre ma commande →</a></p>` : ''}
        ${data.tracking_number ? `<p style="text-align:center;color:#888;font-size:13px">Numéro de suivi : ${data.tracking_number}</p>` : ''}
        <p>Les délais de livraison internationaux peuvent varier. Des frais de douane peuvent s'appliquer selon votre pays.</p>
      `)
    }
    return wrap(locale, `Your order is on its way! 📦`, `
      <h2>Your order has shipped!</h2>
      <p>Your printed planner / notebook is on its way. Here are your tracking details:</p>
      ${data.tracking_url ? `<p style="text-align:center;margin:32px 0"><a href="${data.tracking_url}" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Track my order →</a></p>` : ''}
      ${data.tracking_number ? `<p style="text-align:center;color:#888;font-size:13px">Tracking number: ${data.tracking_number}</p>` : ''}
      <p>International delivery times vary. Import duties may apply depending on your country.</p>
    `)
  },

  'nurture.discount': (locale, data) => {
    const expiry = data.discount_expires ?? '48 hours'
    if (locale === 'fr') {
      return wrap(locale, `Offre spéciale pour vous — expire bientôt`, `
        <h2>Un cadeau pour vous 🎁</h2>
        <p>En tant que membre de notre communauté, voici un code de réduction exclusif :</p>
        <p style="text-align:center;font-size:28px;font-weight:700;letter-spacing:4px;color:#C9A84C;margin:24px 0">${data.coupon_code}</p>
        <p style="text-align:center">Utilisez-le pour obtenir <strong>${data.discount_value}</strong> sur votre première commande.</p>
        <p style="text-align:center;margin:32px 0"><a href="${BASE_URL}/fr/shop" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Utiliser mon code →</a></p>
        <p style="font-size:13px;color:#888;text-align:center">Expire dans ${expiry}.</p>
      `)
    }
    return wrap(locale, `A special offer for you — expires soon`, `
      <h2>A gift for you 🎁</h2>
      <p>As a community member, here's your exclusive discount code:</p>
      <p style="text-align:center;font-size:28px;font-weight:700;letter-spacing:4px;color:#C9A84C;margin:24px 0">${data.coupon_code}</p>
      <p style="text-align:center">Use it to get <strong>${data.discount_value}</strong> off your first order.</p>
      <p style="text-align:center;margin:32px 0"><a href="${BASE_URL}/shop" style="background:#C9A84C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Use my code →</a></p>
      <p style="font-size:13px;color:#888;text-align:center">Expires in ${expiry}.</p>
    `)
  },
  // Transactional order receipt / invoice — no unsubscribe footer (purchase receipt, not marketing)
  'order.confirmation': (locale, data) => {
    const invoiceNumber = String(data.invoice_number ?? '')
    const orderDate     = String(data.order_date ?? '')
    const currency      = String(data.currency ?? 'USD').toUpperCase()
    const total         = Number(data.total ?? 0)
    const paymentMethod = String(data.payment_method ?? 'Card')
    const supportEmail  = String(data.support_email ?? 'support@arwignplanners.com')
    const receiptUrl    = String(data.receipt_url ?? '')
    const items         = (data.items ?? []) as { title: string; price: number; quantity: number }[]
    const downloads     = (data.downloads ?? []) as { title: string; url: string }[]

    const money = (n: number) =>
      new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n)

    const itemRows = items.map((i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E8E4DB;color:#1A1820;font-size:14px">${i.title}${i.quantity > 1 ? ` <span style="color:#888">× ${i.quantity}</span>` : ''}</td>
        <td style="padding:12px 0;border-bottom:1px solid #E8E4DB;color:#1A1820;font-size:14px;text-align:right;white-space:nowrap">${money(i.price * i.quantity)}</td>
      </tr>`).join('')

    const downloadRows = downloads.map((d) => `
      <tr>
        <td style="padding:10px 0">
          <span style="color:#1A1820;font-size:14px">${d.title}</span>
        </td>
        <td style="padding:10px 0;text-align:right">
          <a href="${d.url}" style="background:#C9A84C;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;display:inline-block;white-space:nowrap">Download ↓</a>
        </td>
      </tr>`).join('')

    const subject = `Your Arwign Planners order ${invoiceNumber} — receipt & downloads`
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}a{color:#C9A84C}.wrapper{padding:32px 16px}.container{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E8E4DB}.content{padding:36px 40px}</style></head><body><div class="wrapper"><div class="container"><div style="height:4px;background:#C9A84C"></div>${brandHeader()}<div class="content">
      <h2 style="color:#1A1820;margin:0 0 24px">Thank you for your order 💛</h2>
      <p style="margin:0 0 24px">Your payment has been received and your planners are ready to download below.</p>

      <table role="presentation" width="100%" style="border-collapse:collapse;background:#FAF8F4;border:1px solid #E8E4DB;border-radius:8px;margin-bottom:24px">
        <tr>
          <td style="padding:16px 20px;font-size:13px;color:#888">Invoice number<br><strong style="color:#1A1820;font-size:14px">${invoiceNumber}</strong></td>
          <td style="padding:16px 20px;font-size:13px;color:#888">Order date<br><strong style="color:#1A1820;font-size:14px">${orderDate}</strong></td>
          <td style="padding:16px 20px;font-size:13px;color:#888">Paid with<br><strong style="color:#1A1820;font-size:14px">${paymentMethod}</strong></td>
        </tr>
      </table>

      <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:8px">
        ${itemRows}
        <tr><td colspan="2" style="padding:8px 0 0;font-size:11px;color:#8A8578;text-align:right">Digital goods — no tax applied</td></tr>
        <tr>
          <td style="padding:14px 0;font-weight:700;color:#1A1820;font-size:15px">Total</td>
          <td style="padding:14px 0;font-weight:700;color:#C9A84C;font-size:15px;text-align:right">${money(total)} ${currency}</td>
        </tr>
      </table>

      ${downloads.length ? `
      <h3 style="color:#1A1820;margin:24px 0 8px">Your downloads</h3>
      <table role="presentation" width="100%" style="border-collapse:collapse">
        ${downloadRows}
      </table>
      <p style="font-size:13px;color:#888;margin-top:16px">Download links are personal to you and expire in 12 months. Please save your files somewhere safe.</p>
      ` : ''}

      ${receiptUrl ? `<p style="margin-top:24px"><a href="${receiptUrl}" style="background:#1A1820;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;display:inline-block">View &amp; print receipt →</a></p>` : ''}

      <p style="margin-top:32px">Need a hand? Just reply to this email or write to <a href="mailto:${supportEmail}">${supportEmail}</a> — we're happy to help.</p>
      <p style="margin:24px 0 0">Happy planning!<br>— The Arwign Planners Team</p>
    </div><div style="padding:20px 40px;border-top:1px solid #E8E4DB;background:#FAF8F4"><p style="font-size:12px;color:#aaa;margin:0"><a href="${BASE_URL}" style="color:#C9A84C;text-decoration:none">arwignplanners.com</a> · © ${new Date().getFullYear()} Arwign Planners</p></div></div></div></body></html>`

    const text = [
      `Thank you for your order — Arwign Planners`,
      `Invoice: ${invoiceNumber}`,
      `Date: ${orderDate}`,
      `Paid with: ${paymentMethod}`,
      '',
      ...items.map((i) => `${i.title}${i.quantity > 1 ? ` x${i.quantity}` : ''} — ${money(i.price * i.quantity)}`),
      `Total: ${money(total)}`,
      '',
      ...(downloads.length ? ['Your downloads (links expire in 12 months):', ...downloads.map((d) => `${d.title}: ${d.url}`)] : []),
      '',
      ...(receiptUrl ? [`View & print receipt: ${receiptUrl}`, ''] : []),
      `Support: ${supportEmail}`,
    ].join('\n')

    return { subject, html, text }
  },

  // ── Arwign Calendar (transactional; no unsubscribe footer) ──
  'calendar.booking': (locale, data) => {
    const role = String(data.role ?? 'guest')
    const title = String(data.title ?? 'Meeting')
    const when = String(data.when ?? '')
    const location = data.location ? String(data.location) : ''
    const joinUrl = data.join_url ? String(data.join_url) : ''
    const cancelUrl = data.cancel_url ? String(data.cancel_url) : ''
    const guestName = data.guest_name ? String(data.guest_name) : ''
    const subject = role === 'owner'
      ? `New booking: ${title} — ${when}`
      : `Confirmed: ${title} — ${when}`
    const heading = role === 'owner' ? 'You have a new booking' : 'Your meeting is confirmed'
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}a{color:#A0830E}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #E8E4DB}.row{padding:8px 0;border-bottom:1px solid #F0ECE2}</style></head><body><div class="container">
      <p style="font-size:18px;font-weight:700;letter-spacing:2px;color:#A0830E;margin:0 0 4px">ARWIGN CALENDAR</p>
      <h2 style="margin:0 0 20px">${heading}</h2>
      <div class="row"><strong>${title}</strong></div>
      <div class="row">🗓️ ${when}</div>
      ${location ? `<div class="row">📍 ${location}</div>` : ''}
      ${guestName ? `<div class="row">👤 ${guestName}</div>` : ''}
      ${joinUrl ? `<p style="margin:24px 0"><a href="${joinUrl}" style="background:#A0830E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Join the meeting →</a></p>` : ''}
      ${cancelUrl ? `<p style="font-size:13px;color:#888">Need to change it? <a href="${cancelUrl}">Cancel or reschedule</a>.</p>` : ''}
      <p style="margin-top:28px;color:#888;font-size:13px">Sent by Arwign Calendar</p>
    </div></body></html>`
    return { subject, html, text: `${heading}: ${title} — ${when}${location ? ` @ ${location}` : ''}` }
  },

  'calendar.reminder': (locale, data) => {
    const title = String(data.title ?? 'Event')
    const when = String(data.when ?? '')
    const location = data.location ? String(data.location) : ''
    const joinUrl = data.join_url ? String(data.join_url) : ''
    const subject = `Reminder: ${title} — ${when}`
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}a{color:#A0830E}.container{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;padding:36px;border:1px solid #E8E4DB}</style></head><body><div class="container">
      <p style="font-size:16px;font-weight:700;letter-spacing:2px;color:#A0830E;margin:0 0 12px">ARWIGN CALENDAR</p>
      <h2 style="margin:0 0 8px">${title}</h2>
      <p style="margin:0 0 4px;color:#5A5668">🗓️ ${when}</p>
      ${location ? `<p style="margin:0;color:#5A5668">📍 ${location}</p>` : ''}
      ${joinUrl ? `<p style="margin:24px 0"><a href="${joinUrl}" style="background:#A0830E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Join now →</a></p>` : ''}
    </div></body></html>`
    return { subject, html, text: subject }
  },

  'calendar.briefing': (locale, data) => {
    const headline = String(data.headline ?? 'Your day ahead')
    const dateLabel = String(data.date_label ?? '')
    const appUrl = String(data.app_url ?? `${BASE_URL}/calendar/app`)
    const items = (data.items ?? []) as { time: string; title: string; flag?: string }[]
    const rows = items.length ? items.map((i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0ECE2;color:#8A869A;font-size:13px;font-family:monospace;width:70px;vertical-align:top">${i.time}</td>
        <td style="padding:10px 0;border-bottom:1px solid #F0ECE2;color:#1A1820;font-size:14px">${i.title}${i.flag ? ` <span style="color:#A0830E;font-size:12px">· ${i.flag}</span>` : ''}</td>
      </tr>`).join('') : `<tr><td style="padding:16px 0;color:#8A869A">Nothing scheduled — enjoy the open day.</td></tr>`
    const subject = `${dateLabel}: ${headline}`
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}a{color:#A0830E}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #E8E4DB}</style></head><body><div class="container">
      <p style="font-size:16px;font-weight:700;letter-spacing:2px;color:#A0830E;margin:0 0 4px">GOOD MORNING</p>
      <h2 style="margin:0 0 6px">${dateLabel}</h2>
      <p style="margin:0 0 20px;color:#5A5668;font-size:15px">${headline}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
      <p style="margin:28px 0 0"><a href="${appUrl}" style="background:#A0830E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open your calendar →</a></p>
    </div></body></html>`
    return { subject, html, text: `${dateLabel}: ${headline}` }
  },

  // Celebratory anniversary / memory email — balloons + confetti. Sent yearly by
  // the /api/cron/moment-anniversaries cron and on demand from the Moments UI.
  'calendar.anniversary': (locale, data) => {
    const title = String(data.title ?? 'A special day')
    const note = data.note ? String(data.note) : ''
    const years = Number(data.years ?? 0)
    const occasion = String(data.occasion ?? '🎉')
    const typeLabel = String(data.type_label ?? 'Special day')
    const whenLabel = data.when_label ? String(data.when_label) : ''
    const fromName = data.from_name ? String(data.from_name) : ''
    const imageUrl = data.image_url ? String(data.image_url) : ''
    const role = String(data.role ?? 'owner')
    const appUrl = String(data.app_url ?? `${BASE_URL}/calendar/plus/moments`)

    // ordinal ("3rd") for the years badge
    const s = ['th', 'st', 'nd', 'rd']; const v = years % 100
    const ordinal = `${years}${s[(v - 20) % 10] || s[v] || s[0]}`
    const yearsLine = years > 0 ? `${ordinal} ${typeLabel.toLowerCase()}` : `It's today!`

    const intro = role === 'invitee'
      ? `${fromName || 'Someone special'} wanted to celebrate this moment with you.`
      : `A moment worth celebrating is here again. 🥳`

    const subject = years > 0
      ? `🎈 ${title} — ${years} year${years > 1 ? 's' : ''} today! 🎉`
      : `🎈 ${title} — celebrate today! 🎉`

    // Confetti pieces: static coloured squares that also fall+spin where CSS
    // animation is supported (Apple Mail / iOS). Gmail strips <style> keyframes
    // but the pieces still render as a festive scatter, so it degrades cleanly.
    const colours = ['#C9A84C', '#E86A6A', '#4C9AC9', '#7BC96F', '#E8B24C', '#B47BE8', '#E86AB0']
    const confetti = Array.from({ length: 16 }, (_, i) => {
      const c = colours[i % colours.length]
      const left = Math.round((i / 16) * 96) + 2
      const delay = ((i % 8) * 0.35).toFixed(2)
      const dur = (2.6 + (i % 5) * 0.4).toFixed(2)
      const size = 7 + (i % 3) * 3
      return `<span class="cf" style="left:${left}%;width:${size}px;height:${size}px;background:${c};animation-delay:${delay}s;animation-duration:${dur}s"></span>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}
  a{color:#A0830E}
  .container{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E8E4DB}
  .banner{position:relative;overflow:hidden;text-align:center;padding:40px 24px 34px;background:linear-gradient(135deg,#FBF3D9 0%,#F4E2A8 45%,#E9CE7A 100%)}
  .balloons{font-size:40px;line-height:1;letter-spacing:6px;animation:float 3.5s ease-in-out infinite}
  .cf{position:absolute;top:-14px;border-radius:2px;opacity:.9;animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}
  @keyframes fall{0%{transform:translateY(-14px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(230px) rotate(540deg);opacity:.15}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
</style></head>
<body>
<div style="padding:28px 16px">
  <div class="container">
    <div class="banner">
      ${confetti}
      <div class="balloons">🎈🎈🎈</div>
      <p style="margin:16px 0 4px;font-size:13px;font-weight:700;letter-spacing:3px;color:#8A6D12">ARWIGN · A MOMENT TO CELEBRATE</p>
      <h1 style="margin:6px 0 0;font-size:26px;color:#1A1820">${occasion} ${title}</h1>
      ${years > 0 ? `<div style="display:inline-block;margin-top:14px;padding:8px 18px;background:#fff;border-radius:999px;border:1px solid #E9CE7A;font-weight:700;color:#8A6D12;font-size:15px">${ordinal} ${typeLabel.toLowerCase()} 🎉</div>` : `<div style="display:inline-block;margin-top:14px;padding:8px 18px;background:#fff;border-radius:999px;border:1px solid #E9CE7A;font-weight:700;color:#8A6D12;font-size:15px">Today 🎉</div>`}
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 14px;font-size:15px;color:#5A5668">${intro}</p>
      ${whenLabel ? `<p style="margin:0 0 14px;color:#8A869A;font-size:14px">🗓️ ${whenLabel}</p>` : ''}
      ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;border:1px solid #E8E4DB;margin:6px 0 18px" />` : ''}
      ${note ? `<div style="background:#FAF8F4;border:1px solid #E8E4DB;border-left:3px solid #C9A84C;border-radius:10px;padding:16px 18px;margin:4px 0 8px;color:#3A3648;font-size:15px;white-space:pre-wrap">${note}</div>` : ''}
      <p style="text-align:center;margin:28px 0 6px"><a href="${appUrl}" style="background:#C9A84C;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Open your Moments →</a></p>
      <p style="text-align:center;margin:18px 0 0;font-size:22px">🎉✨🎊✨🎉</p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #E8E4DB;background:#FAF8F4">
      <p style="font-size:12px;color:#aaa;margin:0"><a href="${BASE_URL}" style="color:#C9A84C;text-decoration:none">arwignplanners.com</a> · Sent by Arwign Calendar Moments</p>
    </div>
  </div>
</div>
</body></html>`

    const text = `${title} — ${yearsLine}. ${intro}${note ? `\n\n${note}` : ''}\n\nCelebrate: ${appUrl}`
    return { subject, html, text }
  },

  // Internal admin notification — no unsubscribe footer (not a subscriber-facing email)
  'contact.admin': (locale, data) => {
    const subject = `New contact form message from ${data.name}${data.subject ? `: ${data.subject}` : ''}`
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #E8E4DB}</style></head><body><div class="container">
      <h2 style="color:#1A1820">New contact form message</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      ${data.subject ? `<p><strong>Subject:</strong> ${data.subject}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;background:#FAF8F4;border:1px solid #E8E4DB;border-radius:8px;padding:16px">${data.message}</p>
    </div></body></html>`
    return { subject, html, text: subject }
  },

  // Internal admin notification — no unsubscribe footer (not a subscriber-facing email)
  'notebook_request.admin': (locale, data) => {
    const subject = `New personalized notebook idea from ${data.name}`
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #E8E4DB}</style></head><body><div class="container">
      <h2 style="color:#1A1820">New custom notebook request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Locale:</strong> ${data.locale}</p>
      <p><strong>Idea:</strong></p>
      <p style="white-space:pre-wrap;background:#FAF8F4;border:1px solid #E8E4DB;border-radius:8px;padding:16px">${data.idea}</p>
    </div></body></html>`
    return { subject, html, text: subject }
  },

  // Internal alert when a production error is captured (lib/error-tracking.ts).
  'system.error': (locale, data) => {
    const subject = `⚠️ Arwign error in ${data.source}: ${String(data.message).slice(0, 80)}`
    const mono = 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:#1A1820;color:#E8E4DB;border-radius:8px;padding:16px;overflow:auto'
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F4;color:#1A1820;margin:0;padding:0}.container{max-width:640px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #E8E4DB}</style></head><body><div class="container">
      <h2 style="color:#B4664A">Production error captured</h2>
      <p><strong>Source:</strong> ${data.source}</p>
      <p><strong>Message:</strong> ${data.message}</p>
      ${data.context && data.context !== '{}' ? `<p><strong>Context:</strong></p><div style="${mono}">${data.context}</div>` : ''}
      ${data.stack ? `<p style="margin-top:16px"><strong>Stack:</strong></p><div style="${mono}">${data.stack}</div>` : ''}
    </div></body></html>`
    return { subject, html, text: subject }
  },
}

export function resolveTemplate(
  templateKey: string,
  locale: Locale,
  data: Record<string, unknown>
): TemplateOutput {
  const fn = templates[templateKey]
  if (!fn) throw new Error(`Unknown email template: ${templateKey}`)
  const out = fn(locale, data)
  const unsubUrl = data.unsubscribe_url as string ?? `${BASE_URL}/api/optin/unsubscribe?token=${data.unsub_token}`
  out.html = out.html.replace(/\{\{unsubscribe_url\}\}/g, unsubUrl)
  return out
}
