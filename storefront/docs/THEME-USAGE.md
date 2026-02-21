# Theme usage

All colors used across the app **must** come from semantic theme tokens (CSS variables exposed to Tailwind). No component may introduce custom hex values or Tailwind default palettes (e.g. gray, slate) except where explicitly tokenized.

## Approved Tailwind class patterns

Use only these color-related classes (and opacity variants, e.g. `bg-primary/90`):

### Backgrounds
- `bg-background`, `bg-card`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-muted`, `bg-popover`, `bg-destructive`
- `hover:bg-primary`, `hover:bg-primary/90`, `hover:bg-muted`, etc.

### Text
- `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-secondary-foreground`, `text-accent-foreground`, `text-destructive-foreground`, `text-card-foreground`, `text-popover-foreground`

### Borders
- `border-border`, `border-input`
- `border-primary`, `border-destructive` where needed

### Focus
- `focus:ring-ring`, `focus:border-primary`, `focus:border-input`, `focus:ring-2`, `focus:ring-ring`, `focus-visible:ring-ring`, etc.

### Rare (logos / illustrations only)
- `bg-brand-1` … `bg-brand-5`, `text-brand-1` … `text-brand-5`

## Forbidden
- Arbitrary colors: `text-[#...]`, `bg-[#...]`, `border-[#...]`, `ring-[#...]`
- Non-token Tailwind colors: `text-gray-*`, `bg-gray-*`, `border-gray-*`, `text-slate-*`, `bg-slate-*`, `border-slate-*`, and other default palette roots (e.g. `red-*`, `amber-*`, `emerald-*`, `rose-*`) unless they are the tokenized destructive token.

## Examples

**Button (primary)**
```tsx
<button className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Save
</button>
```

**Card**
```tsx
<div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

**Input**
```tsx
<input className="w-full rounded-md border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
```

---

## Migration (incremental)

Do **not** mass-edit the entire app in one go. Migrate page-by-page or component-by-component. The `check-theme` script (or ESLint) will catch new violations.

### Class replacement checklist
- `bg-white` / `bg-gray-*` → `bg-background` / `bg-card` / `bg-muted`
- `text-gray-900` / `text-slate-900` → `text-foreground`
- `text-gray-500` / `text-slate-500` → `text-muted-foreground`
- `border-gray-200` / `border-slate-200` → `border-border`
- `focus:ring-*` (non-token) → `focus:ring-ring` (and keep focus border/outline tokens)
- Buttons: `bg-primary text-primary-foreground hover:bg-primary/90` (or `hover:bg-primary-hover` if using that token)

### Example: Button (before → after)
**Before (palette-specific):**
```tsx
const variants = {
  primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
  secondary: "bg-sage_green text-white shadow-sm hover:bg-sage_green-600",
  ghost: "border border-sage_green-300 text-sage_green-700 hover:bg-sage_green-50 hover:border-sage_green-400"
}
```

**After (semantic tokens):**
```tsx
const variants = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90",
  ghost: "border border-border text-foreground hover:bg-muted hover:border-input"
}
```

### Example: Header (before → after)
**Before:**
```tsx
<header className="border-b border-apricot_cream-200">
  <Link href="/" className="text-lg font-semibold text-sage_green-700 transition hover:text-yellow_green-600">
    Hunger Hankerings
  </Link>
  <nav className="text-sm text-sage_green-600">...</nav>
</header>
```

**After:**
```tsx
<header className="border-b border-border">
  <Link href="/" className="text-lg font-semibold text-foreground transition hover:text-primary">
    Hunger Hankerings
  </Link>
  <nav className="text-sm text-muted-foreground">...</nav>
</header>
```

### Example: Form input (before → after)
**Before:**
```tsx
<input className="rounded-md border border-apricot_cream-200 px-4 py-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
```

**After:**
```tsx
<input className="rounded-md border border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
```

The rest of the app will be migrated incrementally; the theme check script will fail on any file that still uses forbidden patterns until those files are updated.
