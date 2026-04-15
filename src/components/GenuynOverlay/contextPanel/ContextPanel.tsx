import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getControlSet } from './componentConfig'
import { applyDirectEdit, extractTextContent, injectInstanceStyle, isLiteralText, readFile, removeInlineStyleFromInstance, swapCssClassProperty, swapNavItemLabel, swapPropNearText, swapPropOnComponent, swapStatusForClient, swapTextContent } from './directEdit'
import PillToggle from './controls/PillToggle'
import ColorSwatch from './controls/ColorSwatch'
import TextEdit from './controls/TextEdit'

const ACCENT = '#6C6FFF'

interface SelEl { el: Element; file: string; editFile: string; name: string }

interface ContextPanelProps {
  sessionId: string
  selected: SelEl
  selRect: DOMRect | null
  canUndo: boolean
  onClose: () => void
  onUndo: () => void
  onLLMSubmit: (command: string, file: string, rect: DOMRect, name: string, html: string) => void
  onEditDone: () => void
  onEditError: (msg: string) => void
}

const PANEL_W = 300

/** CSS Modules hash class names (e.g. 'active' → 'Badge_active__2xKp1').
 *  Match the local class name as a whole word segment separated by '_'. */
function matchesCssModuleClass(domClassList: string[], localName: string): boolean {
  const re = new RegExp('(?:^|_)' + localName + '(?:_|$)')
  return domClassList.some(cls => re.test(cls))
}

function smartPosition(selRect: DOMRect | null, panelW: number, panelH: number) {
  const margin = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!selRect) return { top: margin, left: vw - panelW - margin }

  // Try right side
  if (selRect.right + margin + panelW <= vw) {
    return {
      left: selRect.right + margin,
      top: Math.max(margin, Math.min(vh - panelH - margin, selRect.top)),
    }
  }
  // Try left side
  if (selRect.left - margin - panelW >= 0) {
    return {
      left: selRect.left - margin - panelW,
      top: Math.max(margin, Math.min(vh - panelH - margin, selRect.top)),
    }
  }
  // Try above
  if (selRect.top - margin - panelH >= 0) {
    return {
      top: selRect.top - margin - panelH,
      left: Math.max(margin, Math.min(vw - panelW - margin, selRect.left)),
    }
  }
  // Fallback: below
  return {
    top: Math.min(vh - panelH - margin, selRect.bottom + margin),
    left: Math.max(margin, Math.min(vw - panelW - margin, selRect.left)),
  }
}

export default function ContextPanel({
  sessionId, selected, selRect, canUndo,
  onClose, onUndo, onLLMSubmit, onEditDone, onEditError,
}: ContextPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 12, left: window.innerWidth - PANEL_W - 12 })
  const [editFileContent, setEditFileContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [llmInput, setLlmInput] = useState('')

  // UI state — derived from DOM on mount, not from source files
  const [variant, setVariantState] = useState<string | null>(null)
  const [size, setSizeState] = useState<string | null>(null)
  const [textVal, setTextVal] = useState('')
  const [bgVar, setBgVar] = useState<string | null>(null)
  const [textColorVar, setTextColorVar] = useState<string | null>(null)
  const [pendingText, setPendingText] = useState('')
  // Active CSS class for css-module color editing (e.g. 'active' for Badge)
  const [activeCssClass, setActiveCssClass] = useState<string | null>(null)

  const controls = getControlSet(selected.name)

  // Load state from DOM + read edit file for text-literal check
  useEffect(() => {
    setLoading(true)
    const el = selected.el as HTMLElement

    // All class detection uses fuzzy matching — CSS Modules hash class names in the DOM
    const classList = Array.from(el.classList)
    setVariantState((controls.variantOptions ?? []).find(v => matchesCssModuleClass(classList, v)) ?? null)
    setSizeState((controls.sizeOptions ?? []).find(s => matchesCssModuleClass(classList, s)) ?? null)
    const activeClass = (controls.cssVariantClasses ?? []).find(c => matchesCssModuleClass(classList, c)) ?? null
    setActiveCssClass(activeClass)

    // Text: read from DOM
    const raw = extractTextContent(el.outerHTML)
    setTextVal(raw)
    setPendingText(raw)

    // Color: read from element's inline style (set by previous direct edits)
    const bg = el.style.backgroundColor
    const txt = el.style.color
    setBgVar(bg.match(/var\(([^)]+)\)/)?.[1] ?? null)
    setTextColorVar(txt.match(/var\(([^)]+)\)/)?.[1] ?? null)

    // Read the edit file only for the isLiteralText check in text commits
    readFile(sessionId, selected.editFile)
      .then(c => setEditFileContent(c))
      .catch(() => setEditFileContent(null))
      .finally(() => setLoading(false))
  }, [selected.editFile, selected.name])

  // Position panel to avoid covering selected element
  useLayoutEffect(() => {
    if (!panelRef.current) return
    const h = panelRef.current.offsetHeight
    setPos(smartPosition(selRect, PANEL_W, h))
  }, [loading, selRect])

  async function runEdit(filePath: string, transform: (c: string) => string) {
    if (applying) return
    setApplying(true)
    try {
      await applyDirectEdit(sessionId, filePath, transform)
      onEditDone()
    } catch (err) {
      onEditError((err as Error).message)
    } finally {
      setApplying(false)
    }
  }

  function handleVariant(val: string) {
    if (controls.variantEditMode === 'data-status') {
      // Badge: variant is data-driven; find the client name from the table row
      const tr = (selected.el as HTMLElement).closest('tr')
      const nameCell = tr?.querySelector('td')
      const clientName = nameCell?.textContent?.trim()
      if (!clientName || !activeCssClass) { onEditError('Cannot identify row to update'); return }
      setVariantState(val)
      setActiveCssClass(val)
      runEdit(selected.editFile, c => swapStatusForClient(c, clientName, activeCssClass, val))
    } else {
      setVariantState(val)
      setBgVar(null)
      setTextColorVar(null)
      runEdit(selected.editFile, c => {
        const swapped = swapPropNearText(c, selected.name, 'variant', val, textVal)
        return removeInlineStyleFromInstance(swapped, selected.name, textVal)
      })
    }
  }

  function handleSize(val: string) {
    setSizeState(val)
    runEdit(selected.editFile, c => {
      const result = swapPropNearText(c, selected.name, 'size', val, textVal)
      // Fallback for components without text content (e.g. Avatar)
      if (result !== c) return result
      return swapPropOnComponent(c, selected.name, 'size', val)
    })
  }

  function handleTextCommit() {
    if (pendingText === textVal) return
    if (editFileContent && !isLiteralText(editFileContent, textVal)) {
      onEditError('Text is dynamic — use the prompt instead')
      return
    }
    const old = textVal
    setTextVal(pendingText)
    if (selected.name === 'SideNav') {
      runEdit(selected.editFile, c => swapNavItemLabel(c, old, pendingText))
    } else {
      runEdit(selected.editFile, c => swapTextContent(c, old, pendingText))
    }
  }

  function getCssClassToEdit(): string | null {
    return controls.cssClass ?? activeCssClass ?? null
  }

  function handleBgColor(cssVar: string) {
    if (cssVar === bgVar) return
    setBgVar(cssVar)
    if (controls.colorEditMode === 'css-module' && controls.cssModuleFile) {
      const cssClass = getCssClassToEdit()
      if (!cssClass) { onEditError('Cannot determine CSS class to edit'); return }
      runEdit(controls.cssModuleFile, c => swapCssClassProperty(c, cssClass, 'background-color', `var(${cssVar})`))
    } else {
      runEdit(selected.editFile, c => injectInstanceStyle(c, selected.name, textVal, 'backgroundColor', `var(${cssVar})`))
    }
  }

  function handleTextColor(cssVar: string) {
    if (cssVar === textColorVar) return
    setTextColorVar(cssVar)
    if (controls.colorEditMode === 'css-module' && controls.cssModuleFile) {
      const cssClass = getCssClassToEdit()
      if (!cssClass) { onEditError('Cannot determine CSS class to edit'); return }
      runEdit(controls.cssModuleFile, c => swapCssClassProperty(c, cssClass, 'color', `var(${cssVar})`))
    } else {
      runEdit(selected.editFile, c => injectInstanceStyle(c, selected.name, textVal, 'color', `var(${cssVar})`))
    }
  }

  function handleLLMSend() {
    if (!llmInput.trim()) return
    onLLMSubmit(llmInput.trim(), selected.editFile, selected.el.getBoundingClientRect(), selected.name, selected.el.outerHTML.slice(0, 800))
    setLlmInput('')
    onClose()
  }

  const divider = (
    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
  )

  return (
    <div
      ref={panelRef}
      data-genuyn-overlay="true"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: PANEL_W,
        zIndex: 10000,
        pointerEvents: 'all',
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(0,0,0,0.09)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06)',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        animation: 'g-chip 180ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 12px 8px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 8px ${ACCENT}88`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.65)', flex: 1, letterSpacing: '0.01em' }}>
          {selected.name}
          {activeCssClass && (
            <span style={{ fontWeight: 400, color: 'rgba(0,0,0,0.35)', marginLeft: 4 }}>· {activeCssClass}</span>
          )}
        </span>
        {applying && (
          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>saving…</span>
        )}
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(0,0,0,0.25)', fontSize: 14, lineHeight: 1, padding: '0 2px',
          transition: 'color 100ms',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.55)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.25)' }}
        >✕</button>
      </div>

      {/* Controls */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', textAlign: 'center', padding: '8px 0' }}>Loading…</div>
        ) : controls.llmOnly ? (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', padding: '4px 0' }}>
            Use the prompt below to describe changes to this component.
          </div>
        ) : (
          <>
            {controls.variantOptions && (
              <PillToggle label="Variant" options={controls.variantOptions} value={variant} onChange={handleVariant} disabled={applying} />
            )}
            {controls.sizeOptions && (
              <PillToggle label="Size" options={controls.sizeOptions} value={size} onChange={handleSize} disabled={applying} />
            )}
            {controls.hasTextEdit && (
              <TextEdit
                label={selected.name === 'Table' ? 'Content' : 'Label'}
                value={pendingText}
                onChange={setPendingText}
                disabled={applying}
                placeholder="Edit text…"
              />
            )}
            {controls.hasTextEdit && pendingText !== textVal && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleTextCommit}
                  style={{
                    background: ACCENT, color: '#fff', border: 'none', borderRadius: 5,
                    padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >Apply ↵</button>
              </div>
            )}
            {controls.colorTargets?.includes('bg') && (
              <ColorSwatch label="Fill" activeVar={bgVar} onChange={handleBgColor} disabled={applying} />
            )}
            {controls.colorTargets?.includes('text') && (
              <ColorSwatch label="Text" activeVar={textColorVar} onChange={handleTextColor} disabled={applying} />
            )}
          </>
        )}
      </div>

      {divider}

      {/* LLM prompt row */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          value={llmInput}
          onChange={e => setLlmInput(e.target.value)}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleLLMSend() }}
          placeholder="Describe a change…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 11, color: 'rgba(0,0,0,0.6)', fontFamily: 'system-ui, sans-serif',
          }}
        />
        {llmInput.trim() && (
          <button onClick={handleLLMSend} style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 5,
            width: 22, height: 22, cursor: 'pointer', fontSize: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 10px ${ACCENT}55`,
          }}>↑</button>
        )}
      </div>

      {/* Revert row */}
      {canUndo && (
        <>
          {divider}
          <div style={{ padding: '6px 12px 8px' }}>
            <button onClick={onUndo} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 10, color: 'rgba(0,0,0,0.35)', fontFamily: 'system-ui, sans-serif',
              display: 'flex', alignItems: 'center', gap: 4, transition: 'color 100ms',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.65)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.35)' }}
            >↩ Revert last change</button>
          </div>
        </>
      )}
    </div>
  )
}
