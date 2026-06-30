import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Generates OG (1200×630) and Pinterest (1000×1500) images on demand.
// Usage: /api/og?title=...&subtitle=...&image=...&variant=og|pin

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title    = searchParams.get('title') ?? 'Arwign Planners'
  const subtitle = searchParams.get('subtitle') ?? 'Premium Digital & Printable Planners'
  const imageUrl = searchParams.get('image') ?? ''
  const variant  = searchParams.get('variant') === 'pin' ? 'pin' : 'og'

  const width  = variant === 'pin' ? 1000 : 1200
  const height = variant === 'pin' ? 1500 : 630

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#FAF8F4',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Gold top accent bar */}
        <div style={{ width: '100%', height: 8, background: '#C9A84C', flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: variant === 'pin' ? 'column' : 'row',
            alignItems: 'center',
            padding: variant === 'pin' ? '60px 80px' : '0 80px',
            gap: 60,
          }}
        >
          {/* Product image */}
          {imageUrl && (
            <div
              style={{
                width:  variant === 'pin' ? 700 : 320,
                height: variant === 'pin' ? 700 : 320,
                borderRadius: 24,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                display: 'flex',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} width={variant === 'pin' ? 700 : 320} height={variant === 'pin' ? 700 : 320}
                style={{ objectFit: 'cover' }} alt="" />
            </div>
          )}

          {/* Text block */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: variant === 'pin' ? 'center' : 'flex-start' }}>
            {/* Brand */}
            <div style={{ fontSize: 20, color: '#C9A84C', fontWeight: 700, letterSpacing: 3, marginBottom: 20, textTransform: 'uppercase' }}>
              Arwign Planners
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: variant === 'pin' ? 56 : 52,
                fontWeight: 800,
                color: '#1A1820',
                lineHeight: 1.15,
                textAlign: variant === 'pin' ? 'center' : 'left',
                marginBottom: 20,
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 24,
                color: '#6B6577',
                lineHeight: 1.5,
                textAlign: variant === 'pin' ? 'center' : 'left',
              }}
            >
              {subtitle}
            </div>

            {/* CTA pill */}
            {variant === 'pin' && (
              <div
                style={{
                  marginTop: 40,
                  background: '#C9A84C',
                  color: '#fff',
                  borderRadius: 50,
                  padding: '16px 40px',
                  fontSize: 22,
                  fontWeight: 700,
                  display: 'flex',
                }}
              >
                Shop Now →
              </div>
            )}
          </div>
        </div>

        {/* Bottom brand bar */}
        <div style={{ padding: '16px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E8E4DB' }}>
          <span style={{ fontSize: 16, color: '#9B9199' }}>arwignplanners.com</span>
          <span style={{ fontSize: 14, color: '#C9A84C', fontWeight: 600 }}>Digital & Printable Planners</span>
        </div>
      </div>
    ),
    { width, height }
  )
}
