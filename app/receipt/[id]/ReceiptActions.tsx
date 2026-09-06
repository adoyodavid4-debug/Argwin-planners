'use client'
import Link from 'next/link'
import { Printer, Download } from 'lucide-react'

// Screen-only toolbar above the receipt. Hidden when printing (.no-print).
export default function ReceiptActions({ downloadHref }: { downloadHref: string }) {
  return (
    <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
      <Link
        href={downloadHref}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 10, border: '1px solid #E8E4DB', color: '#1A1820', background: '#fff', textDecoration: 'none' }}
      >
        <Download size={14} /> Downloads
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 10, border: 'none', color: '#fff', background: '#C9A84C', cursor: 'pointer' }}
      >
        <Printer size={14} /> Print / Save as PDF
      </button>
    </div>
  )
}
