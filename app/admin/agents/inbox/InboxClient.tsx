'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, User, Send, Clock, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Conversation {
  id: string
  channel: string
  status: string
  human_takeover: boolean
  last_message_at: string | null
  created_at: string
  sa_leads: { id: string; name: string | null; market: string; status: string } | null
}

interface Message {
  id: number
  direction: 'in' | 'out'
  body: string
  sent_by: 'agent' | 'human' | 'lead'
  status: string
  template_key: string | null
  created_at: string
}

interface Props {
  conversations:   Conversation[]
  selectedId:      string | null
  messages:        Message[]
  windowExpiresAt: string | null
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', messenger: '💭',
}

function windowCountdown(expiresAt: string | null): { label: string; colour: string } {
  if (!expiresAt) return { label: 'Window closed', colour: '#C9847C' }
  const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000
  if (hoursLeft <= 0) return { label: 'Window closed', colour: '#C9847C' }
  if (hoursLeft < 4)  return { label: `Window: ${Math.round(hoursLeft * 60)} min left`, colour: '#C9847C' }
  return { label: `Window: ${Math.round(hoursLeft)} h left`, colour: hoursLeft < 12 ? '#C9A84C' : '#6E7E66' }
}

export default function InboxClient({ conversations, selectedId, messages, windowExpiresAt }: Props) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [pending, startTransition] = useTransition()

  const selected = conversations.find(c => c.id === selectedId) ?? null
  const win = windowCountdown(windowExpiresAt)

  const toggleTakeover = () => {
    if (!selected) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/inbox/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeover: !selected.human_takeover }),
      })
      if (res.ok) {
        toast.success(selected.human_takeover ? 'Returned to agent' : 'You have taken over')
        router.refresh()
      } else toast.error('Failed to update')
    })
  }

  const sendReply = () => {
    if (!selected || !reply.trim()) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/inbox/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim() }),
      })
      if (res.ok) {
        setReply('')
        toast.success('Queued — sends on the next dispatch tick')
        router.refresh()
      } else toast.error('Failed to send')
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Sales conversations across WhatsApp, Instagram and Messenger.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="p-12 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <MessageCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No conversations yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            When leads message you on WhatsApp, Instagram or Messenger, conversations appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 480 }}>
          {/* Conversation list */}
          <div className="rounded-2xl border overflow-y-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: 600 }}>
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/admin/agents/inbox?c=${c.id}`)}
                className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-black/5"
                style={{
                  borderColor: 'var(--border)',
                  background: c.id === selectedId ? 'rgba(201,168,76,0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {CHANNEL_ICONS[c.channel] ?? '💬'} {c.sa_leads?.name ?? 'Unknown lead'}
                  </span>
                  {c.human_takeover && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(123,111,174,0.15)', color: '#7B6FAE' }}>
                      Human
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {c.sa_leads?.market.toUpperCase() ?? '—'} · {c.sa_leads?.status ?? '—'}
                  {c.last_message_at && ` · ${new Date(c.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </p>
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="lg:col-span-2 rounded-2xl border flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {selected ? (
              <>
                {/* Thread header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selected.sa_leads?.name ?? 'Unknown lead'}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: win.colour }}>
                      <Clock size={11} /> {win.label}
                    </span>
                  </div>
                  <button
                    onClick={toggleTakeover}
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={{
                      borderColor: selected.human_takeover ? '#6E7E66' : '#7B6FAE',
                      color:       selected.human_takeover ? '#6E7E66' : '#7B6FAE',
                      opacity:     pending ? 0.6 : 1,
                    }}
                  >
                    {selected.human_takeover
                      ? <><Bot size={12} /> Return to agent</>
                      : <><User size={12} /> Take over</>}
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: 420 }}>
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                        style={{
                          background: m.direction === 'out' ? 'rgba(201,168,76,0.12)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {m.direction === 'out' ? (m.sent_by === 'human' ? 'You' : 'Agent') : 'Lead'}
                          {' · '}{m.status}
                          {' · '}{new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
                  )}
                </div>

                {/* Reply box (human reply; queued through the pacer) */}
                <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder={selected.human_takeover ? 'Type your reply…' : 'Take over first to reply manually'}
                    disabled={!selected.human_takeover || pending}
                    className="input-field flex-1 !py-2.5"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!selected.human_takeover || !reply.trim() || pending}
                    className="btn-primary !px-4"
                    style={{ opacity: (!selected.human_takeover || !reply.trim()) ? 0.5 : 1 }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
