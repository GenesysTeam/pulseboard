# Claude Code Prompt: Generate PulseBoard

Paste everything below the line into Claude Code as a single prompt.

---

Create a complete React + TypeScript project called **PulseBoard** — a client management dashboard for freelance consultants. This is a vertical SaaS app with a strict, opinionated design system. Every component must use design tokens exclusively. No Tailwind. No arbitrary values. Every pixel value, color, weight, and radius must come from the token system defined below.

## Setup

- Vite + React + TypeScript
- CSS Modules for component styles (`.module.css`)
- Storybook 8 with autodocs
- All tokens in `/src/tokens/tokens.css` imported globally
- All components in `/src/components/[ComponentName]/` with: `ComponentName.tsx`, `ComponentName.module.css`, `index.ts` (barrel export), `ComponentName.stories.tsx`
- Three app pages in `/src/pages/`

## Design Tokens (`/src/tokens/tokens.css`)

Define these as CSS custom properties on `:root`. These are the ONLY allowed values in the entire project. No component may use a raw value that isn't one of these tokens.

```css
:root {
  /* Colors */
  --color-primary: #1B65A6;
  --color-primary-light: #E8F1FA;
  --color-secondary: #F28C38;
  --color-error: #C93B3B;
  --color-success: #2D8659;
  --color-neutral-50: #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-300: #D1D5DB;
  --color-neutral-400: #9CA3AF;
  --color-neutral-500: #6B7280;
  --color-neutral-600: #4B5563;
  --color-neutral-700: #374151;
  --color-neutral-900: #111827;
  --color-white: #FFFFFF;

  /* Spacing — 4px base unit. ONLY these values exist. */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Border Radius — ONLY two values */
  --radius-sm: 4px;
  --radius-md: 8px;

  /* Typography — Inter only, 4 sizes, 2 weights */
  --font-family: 'Inter', sans-serif;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 18px;
  --text-xl: 24px;
  --weight-regular: 400;
  --weight-semibold: 600;
  --leading-sm: 1.4;
  --leading-base: 1.5;
  --leading-lg: 1.5;
  --leading-xl: 1.3;

  /* Shadows — ONLY two levels */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
}
```

CRITICAL CONSTRAINTS:
- No `font-weight: 500` or `700` — only 400 and 600 exist
- No `font-size: 14px` or `16px` — only 13, 15, 18, 24 exist
- No `padding: 10px` or `gap: 20px` — only the 8-step spacing scale exists
- No `border-radius: 6px` or `12px` — only 4px and 8px exist
- No colors outside the palette — no `#ccc`, no `#f5f5f5`, no `rgba()` grays
- No `opacity` for disabled states — use specific token colors
- No additional shadows — only `--shadow-sm` and `--shadow-md`

## Components

### Button (`/src/components/Button/`)

Props: `variant: 'primary' | 'secondary' | 'ghost'`, `size: 'sm' | 'md'`, `disabled?: boolean`, `children`, `onClick`

- `primary`: `--color-primary` background, `--color-white` text
- `secondary`: `--color-neutral-100` background, `--color-neutral-700` text
- `ghost`: transparent background, `--color-neutral-700` text
- `sm`: `--text-sm`, `--space-1` vertical padding, `--space-3` horizontal
- `md`: `--text-base`, `--space-2` vertical padding, `--space-4` horizontal
- Disabled: `--color-neutral-300` background, `--color-neutral-500` text. NOT opacity. Applies to all variants.
- Border radius: `--radius-sm`
- Font weight: `--weight-semibold`
- NO other variants exist. No `lg`, no `outline`, no `destructive`.

### Input (`/src/components/Input/`)

Props: `label: string`, `placeholder?: string`, `helperText?: string`, `error?: string`, `disabled?: boolean`, `value`, `onChange`

- Label: `--text-sm`, `--weight-semibold`, `--color-neutral-700`, margin-bottom `--space-1`
- Input field: `--text-base`, `--color-neutral-900` text, `--color-neutral-300` border (1px solid), `--radius-sm`, `--space-2` vertical padding, `--space-3` horizontal
- Helper text: `--text-sm`, `--color-neutral-500`
- Error state: `--color-error` left border (2px solid) on the input, NOT a red outline around all sides. Error message in `--text-sm`, `--color-error`
- Disabled: `--color-neutral-50` background, `--color-neutral-400` text
- Focus: `--color-primary` border

### Card (`/src/components/Card/`)

Props: `children`

- Background: `--color-white`
- Shadow: `--shadow-sm`
- Border radius: `--radius-md`
- Padding: `--space-4`
- No variants. No header/body/footer sub-components. Just a padded elevated box.

### Badge (`/src/components/Badge/`)

Props: `variant: 'active' | 'pending' | 'inactive' | 'overdue'`

- `active`: `--color-success` text, light success background (use `#EBF5F0`)... WAIT. We need to stay in the token system. Use `--color-success` as text on a `--color-neutral-50` background.

Actually, define these additional semantic background tokens for Badge only:

```css
/* Add to tokens.css for Badge backgrounds */
--color-success-light: #EBF5F0;
--color-secondary-light: #FEF3E7;
--color-error-light: #FBEAEA;
```

- `active`: `--color-success` text, `--color-success-light` background
- `pending`: `--color-secondary` text, `--color-secondary-light` background
- `inactive`: `--color-neutral-500` text, `--color-neutral-100` background
- `overdue`: `--color-error` text, `--color-error-light` background
- Always `--text-sm`, `--weight-semibold`
- Always `--radius-sm`
- Padding: `--space-1` vertical, `--space-2` horizontal
- Display: inline-flex

### Avatar (`/src/components/Avatar/`)

Props: `src?: string`, `name: string`, `size: 'sm' | 'md'`

- `sm`: 32px, `--text-sm` initials
- `md`: 48px, `--text-base` initials
- Circle (border-radius 50%)
- Image: `object-fit: cover`
- Fallback: first letter of first and last name, `--color-primary` text on `--color-primary-light` background, `--weight-semibold`
- No `lg`. No square. No status dot.

### Table (`/src/components/Table/`)

Props: `columns: { key: string, label: string, render?: (value, row) => ReactNode }[]`, `data: Record<string, any>[]`

- Header row: `--color-neutral-100` background, `--weight-semibold`, `--text-sm`, `--color-neutral-700`
- Body rows: alternate `--color-white` and `--color-neutral-50`
- Cell padding: `--space-3`
- Text: `--text-base`, `--weight-regular`, `--color-neutral-900`
- Border bottom on each row: `1px solid var(--color-neutral-100)`
- No sticky header. No sortable columns. No row selection. No hover highlight.

### Modal (`/src/components/Modal/`)

Props: `isOpen: boolean`, `onClose: () => void`, `title: string`, `children`, `primaryAction: { label: string, onClick: () => void }`, `secondaryAction: { label: string, onClick: () => void }`

- Overlay: semi-transparent dark backdrop
- Content: `--color-white` background, `--shadow-md`, `--radius-md`, max-width 480px, centered
- Title: `--text-lg`, `--weight-semibold`, `--color-neutral-900`, padding `--space-5`
- Body: padding `--space-5` (top 0)
- Footer: padding `--space-5`, flex with gap `--space-3`, justify-end. Secondary Button on left, Primary Button on right.
- Close icon: top-right corner, `--space-4` from edges, `--color-neutral-400`, size 20px
- No size prop. One size only.

### EmptyState (`/src/components/EmptyState/`)

Props: `heading: string`, `description: string`, `action?: { label: string, onClick: () => void }`, `illustration?: ReactNode`

- Centered layout, `--space-7` top padding
- Illustration area: 120px height placeholder
- Heading: `--text-lg`, `--weight-semibold`, `--color-neutral-900`, margin-top `--space-5`
- Description: `--text-base`, `--weight-regular`, `--color-neutral-600`, margin-top `--space-2`, max-width 360px
- Action: `primary` `md` Button, margin-top `--space-5`

### SideNav (`/src/components/SideNav/`)

Props: `items: { label: string, key: string }[]`, `activeKey: string`, `onSelect: (key: string) => void`

- Width: 240px
- Background: `--color-white`
- Border right: `1px solid var(--color-neutral-100)`
- Items: text only, NO icons. `--text-base`, `--weight-regular`
- Active item: `2px` left border in `--color-primary`, `--color-primary-light` background, `--color-primary` text, `--weight-semibold`
- Inactive item: `--color-neutral-700` text
- Hover (inactive): `--color-neutral-50` background
- Item padding: `--space-2` vertical, `--space-4` horizontal (active has `--space-4` minus 2px left to account for border)
- Item spacing: `--space-1` gap between items

## Pages

### ClientsList (`/src/pages/ClientsList.tsx`)

Layout: SideNav on left (items: Clients, Settings). Main area on right.

Main area:
- Header row: "Clients" heading (`--text-xl`, `--weight-semibold`), "Add Client" primary md Button on the right
- Table with columns: Name (plain text), Email (plain text), Status (Badge), Last Contact (date string)
- Use mock data: 5-6 clients with a mix of active, pending, inactive, overdue statuses
- "Add Client" opens a Modal with two Inputs (Name, Email) and the standard Modal button pair (Cancel / Add Client)
- Include an empty state version: when toggled (use a simple state toggle for demo purposes), show EmptyState with heading "No clients yet", description "Add your first client to get started", and an "Add Client" action

### ClientDetail (`/src/pages/ClientDetail.tsx`)

Layout: Same SideNav. Main area shows a single client.

Main area:
- Top section: Avatar (md) + client name (`--text-xl`) + status Badge, in a row
- Below: three Cards in a grid (2 columns, third full width)
  - Contact Info card: label/value pairs for email, phone, company
  - Project History card: simple list of 2-3 project names with dates
  - Notes card (full width): a text block of notes

### Settings (`/src/pages/Settings.tsx`)

Layout: Same SideNav.

Main area:
- Heading: "Settings" (`--text-xl`)
- Card containing a form: Inputs for Full Name, Email, Company Name
- Save button: `primary` `md` Button
- Danger zone at bottom (outside the card): a horizontal rule, "Delete Account" section with a `ghost` Button styled with `--color-error` text. This is a COMPOSITION RULE — it uses the existing `ghost` Button variant but applies error color through a wrapper class. NOT a new Button variant.

## Storybook

### Stories for each component

Every component gets a `.stories.tsx` that covers:
- All variants (e.g., Button: primary, secondary, ghost × sm, md)
- All states (default, hover, disabled, error, active, empty)
- Composition examples where relevant (e.g., Modal with form Inputs inside)

Use Storybook CSF3 format. Add `tags: ['autodocs']` to each meta so docs pages are auto-generated.

### Tokens Documentation Page

Create `/src/stories/Tokens.mdx` — a Storybook docs page that visually displays:
- Color swatches with variable names and hex values
- Spacing scale as visual blocks
- Typography samples at each size/weight
- Border radius examples
- Shadow examples

### Storybook Theme

Create a custom Storybook theme (`.storybook/theme.ts`) using `@storybook/theming`:
- Brand title: "PulseBoard Design System"
- Use `--color-primary` (#1B65A6) for the sidebar active state
- Font: Inter
- Light theme base

### Storybook Config

In `.storybook/main.ts`:
- Include `../src/**/*.stories.@(ts|tsx)` and `../src/**/*.mdx`
- Add `@storybook/addon-essentials` and `@storybook/addon-docs`

In `.storybook/preview.ts`:
- Import `../src/tokens/tokens.css` globally so all stories have access to tokens
- Import Inter from Google Fonts (add a `<link>` in preview-head.html or import in preview.ts)

## File Structure

```
pulseboard/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   ├── preview-head.html
│   └── theme.ts
├── src/
│   ├── tokens/
│   │   └── tokens.css
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Table/
│   │   ├── Modal/
│   │   ├── EmptyState/
│   │   └── SideNav/
│   ├── pages/
│   │   ├── ClientsList.tsx
│   │   ├── ClientDetail.tsx
│   │   └── Settings.tsx
│   ├── stories/
│   │   └── Tokens.mdx
│   ├── App.tsx
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## App Shell

`App.tsx` should use simple hash-based routing (no react-router needed — just state tracking which page is active). The SideNav is shared across all pages. Add a way to navigate to ClientDetail by clicking a row in the clients table.

## Final Checks

After generating everything:
1. Run `npm install`
2. Run `npm run dev` to verify the app renders
3. Run `npm run storybook` to verify Storybook launches and all stories render
4. Grep the entire `/src/components/` directory for any raw pixel values, hex colors, or font values that don't reference a CSS custom property. Flag anything that doesn't come from tokens.
