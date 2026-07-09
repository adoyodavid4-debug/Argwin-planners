import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Arwign brand palette — sophisticated & editorial
        ivory:    { DEFAULT: '#FAF8F4', 50: '#FDFCFA', 100: '#FAF8F4', 200: '#F2EDE4' },
        gold:     { DEFAULT: '#A0830E', light: '#C4A538', dark: '#77610A', muted: '#B8993C' },
        lavender: { DEFAULT: '#B8A9D4', soft: '#D6CEEB', deep: '#7B6FAE', mist: '#EDE9F6' },
        blush:    { DEFAULT: '#E8C5C0', soft: '#F5E3E0', deep: '#C9847C' },
        cream:    { DEFAULT: '#F7F2E8', warm: '#EDE4D3' },
        sage:     { DEFAULT: '#A8B5A0', light: '#C8D4C0', dark: '#6E7E66' },
        charcoal: { DEFAULT: '#2C2A35', soft: '#3D3A4A', light: '#5A5668' },
        // Dark mode surfaces
        dark: {
          base:    '#1A1820',
          surface: '#231F2E',
          card:    '#2D2839',
          border:  '#3D3850',
          muted:   '#4D4860',
        }
      },
      fontFamily: {
        display:  ['var(--font-cormorant)', 'Georgia', 'serif'],
        heading:  ['var(--font-dm-serif)', 'Georgia', 'serif'],
        body:     ['var(--font-jost)', 'system-ui', 'sans-serif'],
        mono:     ['var(--font-dm-mono)', 'monospace'],
        accent:   ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Fluid display sizes — scale down on phones, full size on desktop
        'display-2xl': ['clamp(2.75rem, 8vw, 5.5rem)',  { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-xl':  ['clamp(2.5rem, 7vw, 4.5rem)',   { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-lg':  ['clamp(2.25rem, 6vw, 3.5rem)',  { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-md':  ['clamp(1.9rem, 5vw, 2.75rem)',  { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-sm':  ['clamp(1.65rem, 4.5vw, 2.25rem)', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':   'radial-gradient(at 30% 0%, rgba(160,131,14,0.06) 0px, transparent 55%), radial-gradient(at 85% 12%, rgba(160,131,14,0.04) 0px, transparent 50%), var(--bg-neutral)',
        'gradient-gold':   'linear-gradient(135deg, #A0830E 0%, #C4A538 50%, #A0830E 100%)',
        'gradient-brand':  'linear-gradient(135deg, #B8A9D4 0%, #E8C5C0 50%, #F7F2E8 100%)',
        'gradient-dark':   'linear-gradient(135deg, #231F2E 0%, #1A1820 100%)',
      },
      boxShadow: {
        'glass':     '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
        'glass-md':  '0 16px 48px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
        'glass-lg':  '0 24px 64px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
        'gold':      '0 4px 24px rgba(160,131,14,0.25)',
        'gold-lg':   '0 8px 40px rgba(160,131,14,0.35)',
        'product':   '0 2px 8px rgba(44,42,53,0.06), 0 8px 32px rgba(44,42,53,0.08)',
        'product-hover': '0 4px 16px rgba(44,42,53,0.1), 0 16px 48px rgba(44,42,53,0.14)',
        'nav':       '0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04)',
        'card':      '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl':   '1.5rem',
        '4xl':   '2rem',
        '5xl':   '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      animation: {
        'fade-up':        'fadeUp 0.7s ease forwards',
        'fade-in':        'fadeIn 0.5s ease forwards',
        'slide-right':    'slideRight 0.6s ease forwards',
        'scale-in':       'scaleIn 0.4s ease forwards',
        'float':          'float 6s ease-in-out infinite',
        'float-delayed':  'float 6s ease-in-out 2s infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'pulse-gold':     'pulseGold 2s ease-in-out infinite',
        'marquee':        'marquee 30s linear infinite',
        'grain':          'grain 8s steps(10) infinite',
      },
      keyframes: {
        fadeUp:     { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideRight: { '0%': { opacity: '0', transform: 'translateX(-24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:    { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float:      { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGold:  { '0%,100%': { boxShadow: '0 0 0 0 rgba(160,131,14,0.4)' }, '50%': { boxShadow: '0 0 0 12px rgba(160,131,14,0)' } },
        marquee:    { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } },
        grain:      { '0%,100%': { transform: 'translate(0,0)' }, '10%': { transform: 'translate(-2%,-3%)' }, '20%': { transform: 'translate(3%,2%)' }, '30%': { transform: 'translate(-1%,4%)' }, '40%': { transform: 'translate(2%,-1%)' }, '50%': { transform: 'translate(-3%,2%)' }, '60%': { transform: 'translate(1%,-4%)' }, '70%': { transform: 'translate(-2%,3%)' }, '80%': { transform: 'translate(3%,-2%)' }, '90%': { transform: 'translate(-1%,1%)' } },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'spring':  'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth':  'cubic-bezier(0.4, 0, 0.2, 1)',
        'elegant': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
}

export default config
