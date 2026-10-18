# EduFlow Design System (STN-7 Compliant)

This document specifies the design system, CSS design tokens, typography, component specifications, and developer rules for the EduFlow frontend application. All pages and future blocks must strictly adhere to this reference.

---

## 1. Palette & WCAG AA Contrast Ratios

The brand identity is built on exactly 3 brand colors + a neutral slate scale:
- **Primary:** Indigo
- **Secondary:** Teal (also used for Success)
- **Accent:** Amber (also used for Warning; dark text is required)
- **Danger:** Red (semantic error state, not a brand color)
- **Neutral:** Slate scale for backgrounds, surfaces, borders, and text

### Contrast Ratio Verification Table

All foreground/background pairs were computed using WCAG 2.1 relative luminance algorithms. Every pair meets or exceeds the WCAG AA minimum threshold (4.5:1 for normal text, 3:1 for large text and UI borders):

| Token Pair | Element Description | Foreground | Background | Computed Ratio | WCAG AA Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--foreground` on `--background` | Light normal text | `#0F172A` | `#F8FAFC` | **17.06:1** | **PASS (AAA)** |
| `--foreground` on `--surface` | Light card text | `#0F172A` | `#FFFFFF` | **17.85:1** | **PASS (AAA)** |
| `--muted-foreground` on `--background` | Light muted text | `#475569` | `#F8FAFC` | **7.24:1** | **PASS (AA)** |
| `--muted-foreground` on `--surface` | Light muted text | `#475569` | `#FFFFFF` | **7.58:1** | **PASS (AA)** |
| `--primary` on `--surface` | Light primary text on white | `#4338CA` | `#FFFFFF` | **7.90:1** | **PASS (AA)** |
| `--primary-foreground` on `--primary` | Light primary solid button | `#FFFFFF` | `#4338CA` | **7.90:1** | **PASS (AA)** |
| `--secondary-foreground` on `--secondary` | Light secondary solid button | `#FFFFFF` | `#0F766E` | **5.47:1** | **PASS (AA)** |
| `--accent-foreground` on `--accent` | Light accent button (dark text) | `#0F172A` | `#F59E0B` | **8.31:1** | **PASS (AA)** |
| `--danger-foreground` on `--danger` | Light danger button | `#FFFFFF` | `#DC2626` | **4.83:1** | **PASS (AA)** |
| `--foreground` on `--background` | Dark normal text | `#E6EAF5` | `#0B1020` | **15.73:1** | **PASS (AAA)** |
| `--foreground` on `--surface` | Dark card text | `#E6EAF5` | `#121A2E` | **14.39:1** | **PASS (AAA)** |
| `--muted-foreground` on `--background` | Dark muted text | `#9AA6C4` | `#0B1020` | **7.78:1** | **PASS (AA)** |
| `--muted-foreground` on `--surface` | Dark muted text | `#9AA6C4` | `#121A2E` | **7.11:1** | **PASS (AA)** |
| `--primary-foreground` on `--primary` | Dark primary button | `#0B1020` | `#818CF8` | **6.35:1** | **PASS (AA)** |
| `--secondary-foreground` on `--secondary` | Dark secondary button | `#0B1020` | `#2DD4BF` | **10.17:1** | **PASS (AAA)** |
| `--accent-foreground` on `--accent` | Dark accent button (dark text) | `#0B1020` | `#FBBF24` | **11.34:1** | **PASS (AAA)** |
| `--danger-foreground` on `--danger` | Dark danger button | `#0B1020` | `#F87171` | **6.84:1** | **PASS (AA)** |

---

## 2. Design Tokens & CSS Variables

Defined in `frontend/app/globals.css`:

### Color Variables
- `--background`, `--foreground`: Root canvas background and text
- `--surface`, `--surface-hover`: Card, dropdown, and container backgrounds
- `--border`, `--border-hover`: Structural borders and divider lines
- `--ring`: High-visibility focus ring outline
- `--primary`, `--primary-foreground`, `--primary-hover`, `--primary-subtle`
- `--secondary`, `--secondary-foreground`, `--secondary-hover`, `--secondary-subtle`
- `--accent`, `--accent-foreground`, `--accent-hover`, `--accent-subtle`
- `--danger`, `--danger-foreground`, `--danger-hover`, `--danger-subtle`
- `--success`, `--warning`, `--info`

### Radius Scale
- Card Radius: `--radius-card: 1rem` (`16px`)
- Control Radius: `--radius-control: 0.625rem` (`10px`)
- Pill Radius: `--radius-pill: 9999px`

### Shadows
- Small: `shadow-sm`
- Card: `shadow-card`
- Popovers & Modals: `shadow-popover`

### Spacing & Rhythm
- Main Container: `max-w-7xl px-4 sm:px-6 lg:px-8` (via `<Container />`)
- Section Padding: `py-14 md:py-20` (via `<Section />`)

### Z-Index Scale
- Navbar: `var(--z-navbar)` (40)
- Dropdown: `var(--z-dropdown)` (50)
- Modal / Dialog: `var(--z-modal)` (60)
- Toast / Notifications: `var(--z-toast)` (100)

---

## 3. UI Component Catalog & Usage Examples

All shared components are imported from `@/components/ui/*`.

### Button (`components/ui/button.tsx`)
```tsx
import { Button } from '@/components/ui/button';

// Primary with loading state
<Button variant="primary" size="md" isLoading={submitting}>
  Enroll Student
</Button>

// Next.js Link asChild integration
import Link from 'next/link';
<Button asChild variant="outline">
  <Link href="/batches">Back to Batches</Link>
</Button>
```

### FormField, Input & useZodForm (`components/ui/form-field.tsx`, `components/ui/input.tsx`, `components/ui/form-helpers.tsx`)
```tsx
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useZodForm, FormStatus } from '@/components/ui/form-helpers';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters required'),
});

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useZodForm(schema);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email Address" required error={errors.email?.message}>
        <Input type="email" placeholder="you@eduflow.com" {...register('email')} />
      </FormField>

      <FormField label="Password" required error={errors.password?.message}>
        <Input type="password" showPasswordToggle {...register('password')} />
      </FormField>
    </form>
  );
}
```

### BatchCard, Skeleton & Grid (`components/ui/batch-card.tsx`)
```tsx
import { BatchCard, BatchCardSkeleton, BatchCardGrid } from '@/components/ui/batch-card';

// Grid of cards (1 col mobile, 2 col tablet, 3 col laptop, 4 col desktop)
<BatchCardGrid>
  {loading ? (
    Array.from({ length: 4 }).map((_, i) => <BatchCardSkeleton key={i} />)
  ) : (
    batches.map((batch) => <BatchCard key={batch.id} batch={batch} />)
  )}
</BatchCardGrid>
```

### DataTable (`components/ui/data-table.tsx`)
```tsx
import { DataTable, Column } from '@/components/ui/data-table';

const columns: Column<Student>[] = [
  { key: 'name', header: 'Student Name', sortable: true },
  { key: 'roll', header: 'Roll Number', sortable: true },
  { key: 'feeStatus', header: 'Status', render: (row) => <Badge variant="success">{row.feeStatus}</Badge> },
];

<DataTable columns={columns} data={students} isLoading={loading} onSort={handleSort} />
```

### Modal / Dialog (`components/ui/modal.tsx`)
```tsx
import { Modal } from '@/components/ui/modal';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Unenrollment"
  description="Are you sure you want to unenroll this student?"
  footer={<Button onClick={() => setIsOpen(false)}>Done</Button>}
>
  <p className="text-sm">This action will retain past exam records but mark enrollment inactive.</p>
</Modal>
```

### EmptyState & ErrorState (`components/ui/empty-state.tsx`, `components/ui/error-state.tsx`)
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

// Real empty state (no fake data)
<EmptyState
  title="No enrolled students"
  description="No students have registered in this batch yet."
  action={<Button size="sm">Enroll Student</Button>}
/>

// Real error state with retry
<ErrorState
  title="Failed to load payments"
  message="Network timeout while connecting to server."
  onRetry={refetch}
/>
```

---

## 4. Rules for Pages

1. **Use Tokens Only:** Never hardcode HEX colors, custom pixels radii, or ad-hoc font sizes in pages. Always reference CSS variables (`bg-primary`, `text-foreground`, `border-border`, `rounded-[var(--radius-card)]`) or shared components.
2. **One Card Style:** All cards must use `rounded-[var(--radius-card)]`, `border border-border`, `bg-surface`, and `shadow-card`. Never create custom card borders or mismatched padding.
3. **4-Per-Row Grid:** Batch catalogs and card grids must use `<BatchCardGrid>` (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch`) so cards stretch to equal height.
4. **Forms via useZodForm:** All forms must use `useZodForm`, wrap inputs in `<FormField>`, and provide inline validation errors, busy loaders, and toast notifications.
5. **No Fake Data or Lorem Ipsum:** Never use placeholder mock arrays or lorem ipsum text. If an endpoint returns an empty array, show `<EmptyState />`; if an API fails, show `<ErrorState onRetry={...} />`.
6. **Zero Layout Shift Loading:** Always render `<BatchCardSkeleton />` or structured skeletons while data is being fetched.
7. **Accessibility First:** Every button must have a visible focus ring, accessible name (`aria-label` on icon buttons), and proper keyboard navigation.
