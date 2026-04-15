const API = `${window.location.protocol}//${window.location.host}`

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function readFile(sessionId: string, filePath: string): Promise<string> {
  const r = await fetch(`${API}/sessions/${sessionId}/file?path=${encodeURIComponent(filePath)}`)
  if (!r.ok) throw new Error('Could not read file')
  const { content } = await r.json()
  return content
}

export async function writeFileDirect(sessionId: string, filePath: string, content: string): Promise<void> {
  const r = await fetch(`${API}/sessions/${sessionId}/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content }),
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Write failed')
  }
}

export async function applyDirectEdit(
  sessionId: string,
  filePath: string,
  transform: (content: string) => string
): Promise<void> {
  const content = await readFile(sessionId, filePath)
  const next = transform(content)
  if (next === content) return
  await writeFileDirect(sessionId, filePath, next)
}

// ── Path helpers ──────────────────────────────────────────────────────────────

export function cssPathFromTsx(tsxPath: string): string {
  return tsxPath.replace(/\.tsx$/, '.module.css')
}

// ── Pure transform functions ──────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Find the position of textContent in a JSX source, scoped to a specific component.
 *  Iterates all occurrences and returns the one where <componentName> is the immediate
 *  parent (no other elements open between the tag and the text). This prevents false
 *  matches when the same text appears in a different element earlier in the file. */
function findTextInSource(content: string, textContent: string, componentName?: string): number {
  if (!textContent) return -1
  const re = new RegExp(`>\\s*${escapeRegex(textContent)}\\s*<`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (!componentName) return m.index
    const openTagStart = findOpenTagBefore(content, m.index, componentName)
    if (openTagStart === -1) continue
    const tagEnd = findOpenTagEnd(content, openTagStart)
    if (tagEnd === -1) continue
    // Confirm no other element opens between the tag close and the text (direct child check)
    const between = content.slice(tagEnd + 1, m.index)
    if (!/<[A-Za-z]/.test(between)) return m.index
  }
  return -1
}

function findOpenTagBefore(content: string, pos: number, componentName: string): number {
  return content.slice(0, pos + 1).lastIndexOf(`<${componentName}`)
}

function findOpenTagEnd(content: string, openTagStart: number): number {
  let depth = 0
  for (let i = openTagStart; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    else if (content[i] === '>' && depth === 0) return i
  }
  return -1
}

/** Swap a JSX prop string value: variant="primary" → variant="secondary" */
export function swapProp(content: string, prop: string, newVal: string): string {
  const re = new RegExp(`(${prop}=)(?:"[^"]*"|'[^']*'|\\{['"\`][^'"\`]*['"\`]\\})`, 'g')
  return content.replace(re, `$1"${newVal}"`)
}

/** Swap a prop on the specific JSX instance nearest to textContent.
 *  Returns content unchanged (no write) if the instance cannot be located — never falls back to a global swap. */
export function swapPropNearText(
  content: string,
  componentName: string,
  prop: string,
  newVal: string,
  textContent: string,
): string {
  const textIdx = findTextInSource(content, textContent, componentName)
  if (textIdx === -1) return content // can't locate instance — do nothing
  const openTagStart = findOpenTagBefore(content, textIdx, componentName)
  if (openTagStart === -1) return content
  const tagEnd = findOpenTagEnd(content, openTagStart)
  if (tagEnd === -1) return content
  const openTag = content.slice(openTagStart, tagEnd + 1)
  const updated = swapProp(openTag, prop, newVal)
  if (updated === openTag) return content
  return content.slice(0, openTagStart) + updated + content.slice(tagEnd + 1)
}

/** Add or update an inline style prop on the specific JSX instance nearest to textContent. */
export function injectInstanceStyle(
  content: string,
  componentName: string,
  textContent: string,
  styleKey: string,
  newVal: string,
): string {
  const textIdx = findTextInSource(content, textContent, componentName)
  if (textIdx === -1) return content
  const openTagStart = findOpenTagBefore(content, textIdx, componentName)
  if (openTagStart === -1) return content
  const tagEnd = findOpenTagEnd(content, openTagStart)
  if (tagEnd === -1) return content
  const openTag = content.slice(openTagStart, tagEnd) // without closing >
  const styleRe = /\sstyle=\{\{([^}]*)\}\}/
  const existing = openTag.match(styleRe)
  let newOpenTag: string
  if (existing) {
    const inner = existing[1]
    const keyRe = new RegExp(`${escapeRegex(styleKey)}\\s*:[^,}]+`)
    if (keyRe.test(inner)) {
      newOpenTag = openTag.replace(existing[0], ` style={{ ${inner.replace(keyRe, `${styleKey}: '${newVal}'`)} }}`)
    } else {
      newOpenTag = openTag.replace(existing[0], ` style={{ ${inner.trim()}, ${styleKey}: '${newVal}' }}`)
    }
  } else {
    newOpenTag = openTag + ` style={{ ${styleKey}: '${newVal}' }}`
  }
  return content.slice(0, openTagStart) + newOpenTag + '>' + content.slice(tagEnd + 1)
}

/** Remove an inline style prop from the specific JSX instance nearest to textContent.
 *  Used when switching variant so variant's default CSS applies cleanly. */
export function removeInlineStyleFromInstance(
  content: string,
  componentName: string,
  textContent: string,
): string {
  const textIdx = findTextInSource(content, textContent, componentName)
  if (textIdx === -1) return content
  const openTagStart = findOpenTagBefore(content, textIdx, componentName)
  if (openTagStart === -1) return content
  const tagEnd = findOpenTagEnd(content, openTagStart)
  if (tagEnd === -1) return content
  const openTag = content.slice(openTagStart, tagEnd + 1)
  const cleaned = openTag.replace(/\s*style=\{\{[^}]*\}\}/, '')
  if (cleaned === openTag) return content
  return content.slice(0, openTagStart) + cleaned + content.slice(tagEnd + 1)
}

/** Edit a CSS class property in a CSS module file.
 *  e.g. className='active', property='background-color', newVal='var(--color-primary-light)' */
export function swapCssClassProperty(
  content: string,
  className: string,
  property: string,
  newVal: string,
): string {
  const classStartRe = new RegExp(`\\.${escapeRegex(className)}\\s*\\{`)
  const match = classStartRe.exec(content)
  if (!match) return content
  const blockStart = match.index + match[0].length
  let depth = 1
  let i = blockStart
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    i++
  }
  const blockEnd = i - 1
  const blockContent = content.slice(blockStart, blockEnd)
  const propRe = new RegExp(`(${escapeRegex(property)}\\s*:)[^;\\n}]+`)
  let newBlockContent: string
  if (propRe.test(blockContent)) {
    newBlockContent = blockContent.replace(propRe, `$1 ${newVal}`)
  } else {
    newBlockContent = blockContent.trimEnd() + `\n  ${property}: ${newVal};\n`
  }
  return content.slice(0, blockStart) + newBlockContent + content.slice(blockEnd)
}

/** Swap a prop on the first <ComponentName ... prop="..."> in the file (no text-content anchor).
 *  Used for components like Avatar that have no visible text in their JSX usage. */
export function swapPropOnComponent(content: string, componentName: string, prop: string, newVal: string): string {
  const re = new RegExp(`(<${escapeRegex(componentName)}(?:\\s[^>]*)?)\\b${escapeRegex(prop)}=(?:"[^"]*"|'[^']*')`)
  return content.replace(re, `$1${prop}="${newVal}"`)
}

/** Swap a status field for a specific client row (for Badge variant editing).
 *  Finds the object with name: 'clientName' and changes its status: 'oldStatus' → 'newStatus'. */
export function swapStatusForClient(content: string, clientName: string, oldStatus: string, newStatus: string): string {
  const nameRe = new RegExp(`name:\\s*['"]${escapeRegex(clientName)}['"]`)
  const nameMatch = nameRe.exec(content)
  if (!nameMatch) return content
  const searchArea = content.slice(nameMatch.index, nameMatch.index + 300)
  const statusRe = new RegExp(`(status:\\s*['"])${escapeRegex(oldStatus)}(['"])`)
  if (!statusRe.test(searchArea)) return content
  const relMatch = statusRe.exec(searchArea)!
  const abs = nameMatch.index + relMatch.index
  return content.slice(0, abs) + relMatch[0].replace(statusRe, `$1${newStatus}$2`) + content.slice(abs + relMatch[0].length)
}

/** Swap a CSS variable reference in a CSS file */
export function swapCssVar(content: string, oldVar: string, newVar: string): string {
  return content.split(oldVar).join(newVar)
}

/** Replace literal text in JSX. Prefers matching as a JSX text child (>text<) to avoid
 *  accidentally hitting import statements or variable names that share the same substring. */
export function swapTextContent(content: string, oldText: string, newText: string): string {
  const jsxRe = new RegExp(`(>\\s*)${escapeRegex(oldText)}(\\s*<)`)
  if (jsxRe.test(content)) {
    return content.replace(jsxRe, `$1${newText}$2`)
  }
  return content.replace(oldText, newText)
}

/** Swap a nav item label in a navItems / items array definition.
 *  Finds label: 'oldLabel' or label: "oldLabel" and replaces the value. */
export function swapNavItemLabel(content: string, oldLabel: string, newLabel: string): string {
  const re = new RegExp(`(label:\\s*['"])${escapeRegex(oldLabel)}(['"])`)
  return content.replace(re, `$1${newLabel}$2`)
}

// ── Value extraction from JSX source ─────────────────────────────────────────

/** Extract current prop value from JSX source: variant="primary" → "primary" */
export function extractPropValue(content: string, prop: string): string | null {
  const re = new RegExp(`${prop}=(?:"([^"]*)"|'([^']*)'|\\{['"\`]([^'"\`]*)['"\`]\\})`)
  const m = content.match(re)
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null
}

/** Extract text content from rendered HTML snippet */
export function extractTextContent(html: string): string {
  const m = html.match(/>([^<]+)<\//)
  return m ? m[1].trim() : ''
}

/** Check if text content in JSX is a literal (not a variable like {label}).
 *  Handles surrounding whitespace/newlines in multiline JSX. */
export function isLiteralText(tsxContent: string, text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const re = new RegExp(`>\\s*${escapeRegex(t)}\\s*<`)
  return re.test(tsxContent) || tsxContent.includes(`"${t}"`) || tsxContent.includes(`'${t}'`)
}

