'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extensions'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link2, Undo2, Redo2, RemoveFormatting,
  Heading2, Heading3, Highlighter, Quote,
} from 'lucide-react'

const FONT_SIZES = [
  { label: 'Small',  value: '0.875rem' },
  { label: 'Normal', value: '' },
  { label: 'Large',  value: '1.125rem' },
  { label: 'X-Large', value: '1.375rem' },
]

const FONT_FAMILIES = [
  { label: 'Default (Jost)',   value: '' },
  { label: 'Cormorant Serif',  value: "'Cormorant Garamond', Georgia, serif" },
  { label: 'DM Serif Display', value: "'DM Serif Display', Georgia, serif" },
  { label: 'Playfair Display', value: "'Playfair Display', Georgia, serif" },
  { label: 'Monospace',        value: "'DM Mono', monospace" },
]

const TEXT_COLORS = [
  '#A0830E', '#77610A', '#C9847C', '#7C68B7', '#4E7A5A', '#3E6B8C', '#8C3E3E', '#555555',
]
const HIGHLIGHT_COLORS = ['#FBF3D9', '#F3E3E0', '#E5E0F3', '#DFEDE4', '#DDE9F2']

function ToolButton({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-35 flex-shrink-0"
      style={{
        color: active ? 'var(--gold)' : 'var(--text-secondary)',
        background: active ? 'rgba(var(--gold-rgb),0.12)' : 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const currentSize = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''
  const currentFont = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? ''

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-card)', color: 'var(--text-secondary)',
    borderColor: 'var(--border)', fontFamily: 'var(--font-jost)',
  }

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-muted, var(--bg-secondary))' }}>

      {/* Font family + size */}
      <select
        value={currentFont}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontFamily(v).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
        title="Font"
        className="h-8 rounded-lg border px-1.5 text-xs outline-none cursor-pointer max-w-[9.5rem]"
        style={selectStyle}
      >
        {FONT_FAMILIES.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <select
        value={currentSize}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontSize(v).run()
          else editor.chain().focus().unsetFontSize().run()
        }}
        title="Font size"
        className="h-8 rounded-lg border px-1.5 text-xs outline-none cursor-pointer"
        style={selectStyle}
      >
        {FONT_SIZES.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
      </select>

      <Divider />

      <ToolButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolButton>
      <ToolButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolButton>
      <ToolButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></ToolButton>
      <ToolButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolButton>

      <Divider />

      {/* Text colour */}
      <div className="relative flex items-center" title="Text colour">
        <label className="w-8 h-8 rounded-lg flex flex-col items-center justify-center cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}>
          <span className="text-[13px] font-bold leading-none" style={{ fontFamily: 'var(--font-jost)' }}>A</span>
          <span className="w-4 h-1 rounded-sm mt-0.5"
            style={{ background: (editor.getAttributes('textStyle').color as string) ?? 'var(--text-secondary)' }} />
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={(editor.getAttributes('textStyle').color as string) ?? '#555555'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            aria-label="Custom text colour"
          />
        </label>
        <div className="flex items-center gap-1 ml-0.5">
          {TEXT_COLORS.map((c) => (
            <button key={c} type="button" title={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor(c).run()}
              className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125"
              style={{ background: c, borderColor: 'rgba(0,0,0,0.15)' }} />
          ))}
          <button type="button" title="Remove colour"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="w-3.5 h-3.5 rounded-full border text-[8px] leading-none flex items-center justify-center"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            ✕
          </button>
        </div>
      </div>

      <Divider />

      {/* Highlight */}
      <ToolButton title="Highlight" active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLORS[0] }).run()}>
        <Highlighter size={15} />
      </ToolButton>
      {HIGHLIGHT_COLORS.map((c) => (
        <button key={c} type="button" title={`Highlight ${c}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setHighlight({ color: c }).run()}
          className="w-3.5 h-3.5 rounded-sm border transition-transform hover:scale-125 flex-shrink-0"
          style={{ background: c, borderColor: 'rgba(0,0,0,0.12)' }} />
      ))}

      <Divider />

      <ToolButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolButton>
      <ToolButton title="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolButton>
      <ToolButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolButton>
      <ToolButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolButton>
      <ToolButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolButton>

      <Divider />

      <ToolButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></ToolButton>
      <ToolButton title="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></ToolButton>
      <ToolButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></ToolButton>

      <Divider />

      <ToolButton title="Link" active={editor.isActive('link')} onClick={setLink}><Link2 size={15} /></ToolButton>
      <ToolButton title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={15} /></ToolButton>
      <ToolButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></ToolButton>
      <ToolButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></ToolButton>
    </div>
  )
}

export default function RichTextEditor({
  value, onChange, placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write something…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-text focus:outline-none min-h-[10rem] px-4 py-3 text-sm',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? '' : e.getHTML())
    },
  })

  // Keep in sync if the parent resets the value from outside (e.g. form reset).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) {
    return (
      <div className="rounded-xl border min-h-[13rem]"
        style={{ borderWidth: '1.5px', borderColor: 'var(--border)', background: 'var(--bg-card)' }} />
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden rich-text-editor"
      style={{ borderWidth: '1.5px', borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
