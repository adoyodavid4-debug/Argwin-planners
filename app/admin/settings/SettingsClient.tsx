'use client'
import { useState } from 'react'
import {
  Store, Bell, Plug, FileText, ChevronRight,
  CheckCircle, XCircle, CreditCard, Mail, Database,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  settings:     Record<string, unknown>
  integrations: { stripe: boolean; supabase: boolean; resend: boolean }
}

type Section = 'general' | 'notifications' | 'integrations' | 'policies'

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v : fallback
}
function bool(v: unknown, fallback = false) {
  return typeof v === 'boolean' ? v : fallback
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
          <Icon size={15} style={{ color: 'var(--gold)' }} />
        </div>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start py-4 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    />
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--gold)' : 'var(--border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function SaveButton({ onClick, loading, label = 'Save Changes' }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
        style={{ background: 'var(--gold)' }}
      >
        {loading ? 'Saving…' : label}
      </button>
    </div>
  )
}

function IntegrationRow({
  name, connected, icon: Icon, description,
}: { name: string; connected: boolean; icon: React.ElementType; description: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: connected ? 'rgba(134,239,172,0.12)' : 'rgba(148,163,184,0.08)' }}
      >
        <Icon size={18} style={{ color: connected ? '#16a34a' : '#94a3b8' }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {connected
          ? <><CheckCircle size={14} style={{ color: '#16a34a' }} /><span className="text-xs font-medium" style={{ color: '#16a34a' }}>Connected</span></>
          : <><XCircle   size={14} style={{ color: '#94a3b8' }} /><span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Not configured</span></>
        }
      </div>
    </div>
  )
}

export default function SettingsClient({ settings, integrations }: Props) {
  // General
  const [storeName,    setStoreName]    = useState(str(settings.store_name, 'Arwign Planners'))
  const [tagline,      setTagline]      = useState(str(settings.store_tagline))
  const [contactEmail, setContactEmail] = useState(str(settings.contact_email))
  const [supportEmail, setSupportEmail] = useState(str(settings.support_email))
  const [currency,     setCurrency]     = useState(str(settings.default_currency, 'USD'))
  const [locale,       setLocale]       = useState(str(settings.default_locale, 'en'))
  const [savingGeneral, setSavingGeneral] = useState(false)

  // Notifications
  const [notifyOrder,      setNotifyOrder]      = useState(bool(settings.notify_new_order, true))
  const [notifySubscriber, setNotifySubscriber] = useState(bool(settings.notify_new_subscriber, true))
  const [savingNotif, setSavingNotif] = useState(false)

  // Policies
  const [returnPolicy, setReturnPolicy] = useState(str(settings.return_policy))
  const [shippingInfo, setShippingInfo] = useState(str(settings.shipping_info))
  const [savingPolicies, setSavingPolicies] = useState(false)

  async function save(data: Record<string, unknown>, setSaving: (v: boolean) => void) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Settings saved')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function saveGeneral() {
    save({
      store_name:       storeName.trim(),
      store_tagline:    tagline.trim(),
      contact_email:    contactEmail.trim(),
      support_email:    supportEmail.trim(),
      default_currency: currency,
      default_locale:   locale,
    }, setSavingGeneral)
  }

  function saveNotifications() {
    save({
      notify_new_order:      notifyOrder,
      notify_new_subscriber: notifySubscriber,
    }, setSavingNotif)
  }

  function savePolicies() {
    save({
      return_policy: returnPolicy.trim(),
      shipping_info: shippingInfo.trim(),
    }, setSavingPolicies)
  }

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'general',       label: 'General',       icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations',  label: 'Integrations',  icon: Plug },
    { id: 'policies',      label: 'Store Policies', icon: FileText },
  ]

  const [activeSection, setActiveSection] = useState<Section>('general')

  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <nav className="w-48 flex-shrink-0 hidden md:block">
        <div className="rounded-2xl border overflow-hidden sticky top-24" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium border-b last:border-0 transition-colors"
              style={{
                borderColor: 'var(--border)',
                background:  activeSection === item.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                color:       activeSection === item.id ? 'var(--gold)' : 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={14} />
                {item.label}
              </div>
              {activeSection === item.id && <ChevronRight size={13} />}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 space-y-6">

        {/* Mobile tab strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background:  activeSection === item.id ? 'var(--gold)' : 'var(--bg-card)',
                color:       activeSection === item.id ? '#fff' : 'var(--text-secondary)',
                borderColor: activeSection === item.id ? 'var(--gold)' : 'var(--border)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ── General ─────────────────────────────────────────── */}
        {activeSection === 'general' && (
          <SectionCard title="General" icon={Store}>
            <Field label="Store Name" hint="Appears in emails and the admin header">
              <Input value={storeName} onChange={setStoreName} placeholder="Arwign Planners" />
            </Field>
            <Field label="Tagline" hint="Short brand statement shown on the homepage">
              <Input value={tagline} onChange={setTagline} placeholder="Capture the chaos. Find the clarity." />
            </Field>
            <Field label="Contact Email" hint="Displayed publicly for customer enquiries">
              <Input type="email" value={contactEmail} onChange={setContactEmail} placeholder="info@arwignplanners.com" />
            </Field>
            <Field label="Support Email" hint="Used as reply-to in transactional emails">
              <Input type="email" value={supportEmail} onChange={setSupportEmail} placeholder="support@arwignplanners.com" />
            </Field>
            <Field label="Default Currency">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
              </select>
            </Field>
            <Field label="Default Locale">
              <select
                value={locale}
                onChange={e => setLocale(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </Field>
            <SaveButton onClick={saveGeneral} loading={savingGeneral} />
          </SectionCard>
        )}

        {/* ── Notifications ────────────────────────────────────── */}
        {activeSection === 'notifications' && (
          <SectionCard title="Notifications" icon={Bell}>
            <Field label="New Order Alert" hint="Email the support address when a new order is placed">
              <Toggle checked={notifyOrder} onChange={setNotifyOrder} />
            </Field>
            <Field label="New Subscriber" hint="Email when someone joins the newsletter">
              <Toggle checked={notifySubscriber} onChange={setNotifySubscriber} />
            </Field>
            <SaveButton onClick={saveNotifications} loading={savingNotif} />
          </SectionCard>
        )}

        {/* ── Integrations ─────────────────────────────────────── */}
        {activeSection === 'integrations' && (
          <SectionCard title="Integrations" icon={Plug}>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Integration status is read from environment variables. Configure them in your <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-muted)' }}>.env.local</code> file or Vercel project settings.
            </p>
            <IntegrationRow
              name="Stripe"
              connected={integrations.stripe}
              icon={CreditCard}
              description="Payments, subscriptions, and webhooks"
            />
            <IntegrationRow
              name="Supabase"
              connected={integrations.supabase}
              icon={Database}
              description="Database, auth, and file storage"
            />
            <IntegrationRow
              name="Resend"
              connected={integrations.resend}
              icon={Mail}
              description="Transactional and marketing email delivery"
            />
          </SectionCard>
        )}

        {/* ── Store Policies ───────────────────────────────────── */}
        {activeSection === 'policies' && (
          <SectionCard title="Store Policies" icon={FileText}>
            <Field label="Return Policy" hint="Shown on checkout and the FAQ page">
              <textarea
                value={returnPolicy}
                onChange={e => setReturnPolicy(e.target.value)}
                rows={5}
                placeholder="All digital downloads are final sale. If you experience a technical issue with your download, contact support within 14 days..."
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-y"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </Field>
            <Field label="Shipping Info" hint="Shown for print / physical products">
              <textarea
                value={shippingInfo}
                onChange={e => setShippingInfo(e.target.value)}
                rows={5}
                placeholder="Print products are fulfilled via Lulu Direct. Standard delivery takes 5–10 business days..."
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-y"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </Field>
            <SaveButton onClick={savePolicies} loading={savingPolicies} label="Save Policies" />
          </SectionCard>
        )}

      </div>
    </div>
  )
}
