export interface ControlSet {
  variantOptions?: string[]
  sizeOptions?: string[]
  hasTextEdit?: boolean
  colorTargets?: Array<'bg' | 'text'>
  borderRadiusOptions?: string[]
  shadowOptions?: string[]
  llmOnly?: boolean
  /** 'inline' = inject style={{}} into JSX; 'css-module' = edit CSS module file */
  colorEditMode?: 'inline' | 'css-module'
  /** Path to CSS module file, relative to project root */
  cssModuleFile?: string
  /** Fixed CSS class to target when colorEditMode='css-module' */
  cssClass?: string
  /** CSS class names driven by variant; active class detected from element's classList via fuzzy match */
  cssVariantClasses?: string[]
  /** 'prop' = swap JSX prop near text; 'data-status' = swap status field in data array (Badge) */
  variantEditMode?: 'prop' | 'data-status'
}

const CONFIG: Record<string, ControlSet> = {
  Button: {
    variantOptions: ['primary', 'secondary', 'ghost'],
    sizeOptions: ['sm', 'md'],
    hasTextEdit: true,
    colorTargets: ['bg', 'text'],
    colorEditMode: 'inline',
    variantEditMode: 'prop',
  },
  Badge: {
    // Variant controls the data-driven status field in ClientsList.tsx
    variantOptions: ['active', 'pending', 'inactive', 'overdue'],
    variantEditMode: 'data-status',
    cssVariantClasses: ['active', 'pending', 'inactive', 'overdue'],
  },
  Input: { llmOnly: true },
  Card: { llmOnly: true },
  Avatar: {
    sizeOptions: ['sm', 'md'],
    cssVariantClasses: ['sm', 'md'],
  },
  TextLabel: {
    hasTextEdit: true,
  },
  SideNav: {
    hasTextEdit: true,
    colorTargets: ['bg', 'text'],
    colorEditMode: 'css-module',
    cssModuleFile: 'src/components/SideNav/SideNav.module.css',
    cssVariantClasses: ['navItemActive', 'navItem', 'sideNav'],
  },
  Table: {
    hasTextEdit: true,
  },
  Modal: { llmOnly: true },
  EmptyState: { llmOnly: true },
}

export function getControlSet(componentName: string): ControlSet {
  return CONFIG[componentName] ?? { llmOnly: true }
}
