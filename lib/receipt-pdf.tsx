// lib/receipt-pdf.tsx — server-side PDF receipt via @react-pdf/renderer.
// Uses the shared data/format from lib/receipt so the PDF matches the web page.
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { RC, receiptView, type Receipt } from './receipt'

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: RC.ink, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: RC.gold, letterSpacing: 1 },
  sub: { fontSize: 9, color: RC.muted, marginTop: 3 },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  badge: { marginTop: 6, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9 },
  badgeText: { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  metaBox: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: RC.bg, borderWidth: 1, borderColor: RC.border, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24 },
  metaCell: { width: '50%', marginBottom: 8 },
  k: { fontSize: 8, color: RC.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  v: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  th: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: RC.border, paddingBottom: 6 },
  thText: { fontSize: 8, color: RC.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: RC.border, paddingVertical: 9 },
  colDesc: { flex: 1, paddingRight: 8 }, colQty: { width: 40, textAlign: 'center', color: RC.muted }, colAmt: { width: 75, textAlign: 'right' },
  totals: { marginTop: 10, alignSelf: 'flex-end', width: 210 },
  trow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  tlabel: { color: RC.muted },
  taxNote: { fontSize: 8, color: RC.muted, textAlign: 'right', paddingVertical: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: RC.border, paddingTop: 8, marginTop: 6 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  totalVal: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: RC.gold },
  note: { fontSize: 9, color: RC.muted, marginTop: 26, lineHeight: 1.5 },
  foot: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: RC.border, lineHeight: 1.6 },
  footStrong: { fontSize: 9, color: RC.ink, fontFamily: 'Helvetica-Bold' },
  footText: { fontSize: 8, color: RC.muted },
})

function ReceiptDoc({ receipt }: { receipt: Receipt }) {
  const { order, items } = receipt
  const v = receiptView(order)
  return (
    <Document title={`Receipt ${v.invoice} — Arwign Planners`} author="Arwign Planners">
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>ARWIGN PLANNERS</Text>
            <Text style={s.sub}>arwignplanners.com</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.h1}>Receipt</Text>
            <View style={[s.badge, { backgroundColor: v.refunded ? RC.danger : RC.green }]}>
              <Text style={s.badgeText}>{v.refunded ? 'REFUNDED' : 'PAID'}</Text>
            </View>
          </View>
        </View>

        <View style={s.metaBox}>
          <View style={s.metaCell}><Text style={s.k}>Invoice number</Text><Text style={s.v}>{v.invoice}</Text></View>
          <View style={s.metaCell}><Text style={s.k}>Date</Text><Text style={s.v}>{v.date}</Text></View>
          <View style={s.metaCell}><Text style={s.k}>Paid with</Text><Text style={s.v}>{v.payment}</Text></View>
          <View style={s.metaCell}><Text style={s.k}>Billed to</Text><Text style={s.v}>{order.email}</Text></View>
        </View>

        <View style={s.th}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colQty]}>Qty</Text>
          <Text style={[s.thText, s.colAmt]}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View style={s.row} key={i}>
            <Text style={s.colDesc}>{it.title}</Text>
            <Text style={s.colQty}>{String(it.quantity)}</Text>
            <Text style={s.colAmt}>{v.money(it.price * it.quantity)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.trow}><Text style={s.tlabel}>Subtotal</Text><Text>{v.money(order.amount_subtotal ?? order.amount_total)}</Text></View>
          {v.hasDiscount && (
            <View style={s.trow}><Text style={s.tlabel}>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</Text><Text style={{ color: RC.green }}>- {v.money(order.amount_discount)}</Text></View>
          )}
          <Text style={s.taxNote}>Digital goods — no tax applied</Text>
          <View style={s.totalRow}><Text style={s.totalLabel}>Total</Text><Text style={s.totalVal}>{v.money(order.amount_total)} {v.currency}</Text></View>
        </View>

        <Text style={s.note}>Digital delivery — your download links were sent to {order.email} and are saved to your account. Links remain valid for 12 months.</Text>
        <View style={s.foot}>
          <Text style={s.footStrong}>Arwign Planners</Text>
          <Text style={s.footText}>Premium digital &amp; printable planners · arwignplanners.com</Text>
          <Text style={s.footText}>Questions about this receipt? support@arwignplanners.com</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderReceiptPdf(receipt: Receipt): Promise<Buffer> {
  return renderToBuffer(<ReceiptDoc receipt={receipt} />)
}
