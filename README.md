# EduFlow — Frontend Web Application

EduFlow is a modern multi-branch coaching center management platform built specifically for school, college, and admission coaching centers in Bangladesh. It supports five core roles: **SUPER_ADMIN**, **ADMIN**, **TEACHER**, **STUDENT**, and **GUARDIAN**, providing automated batch scheduling, exam and quiz tracking, routine planning, attendance logging, and fee collection.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 with CSS Design Tokens
- **Icons:** Lucide React
- **Forms & Validation:** React Hook Form + Zod (`@hookform/resolvers`)
- **Theme:** Next Themes (Light & Dark mode support)
- **Notifications:** Sonner

---

## Environment Variables

Configure your local environment variables in `.env.local` (see `.env.example`):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base backend server URL (**without** `/api` suffix) | `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID *(to be added later)* | `your-google-client-id.apps.googleusercontent.com` |
| `NEXT_PUBLIC_APP_NAME` | Platform brand display name | `EduFlow` |
| `NEXT_PUBLIC_DEV_SHORTCUTS` | Enable quick demo role login shortcuts on `/login` (active only when `NODE_ENV !== 'production'`) | `true` |

> **Important:** Never append `/api` to `NEXT_PUBLIC_API_URL`. Next.js rewrites in `next.config.ts` automatically forward `/api/:path*` to `${NEXT_PUBLIC_API_URL}/api/:path*`.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`.

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

4. **Run design system showcase (development only):**
   Visit [http://localhost:3000/design-system](http://localhost:3000/design-system) to inspect all shared UI components, states, and responsive token implementations.

5. **Typecheck & Lint:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```

---

## Folder Map

```text
frontend/
├── app/
│   ├── (auth)/                    # Public authentication pages (login, register)
│   ├── (protected)/               # Role-protected dashboard routes
│   │   ├── attendance/            # Attendance marking & records
│   │   ├── batches/               # Batch management & details
│   │   ├── branches/              # Branch configuration
│   │   ├── dashboard/             # Role-specific overview dashboards
│   │   ├── guardians/             # Guardian linkage & portal
│   │   ├── notices/               # Center announcements
│   │   ├── payments/              # Fee transactions & receipts
│   │   ├── students/              # Student roster & profiles
│   │   ├── subjects/              # Subject & curriculum lists
│   │   ├── super-admin/           # Multi-tenant branch administration
│   │   └── tests/                 # Exam taker, results, & leaderboards
│   ├── design-system/             # Component showcase & token testbed (dev only)
│   ├── error.tsx                  # Root error boundary
│   ├── layout.tsx                 # Root layout with fonts, theme & toast providers
│   ├── not-found.tsx              # Root 404 handler
│   └── page.tsx                   # Public marketing landing page
├── components/
│   ├── landing/                   # Marketing landing sections
│   ├── providers/                 # Theme and client context providers
│   └── ui/                        # Reusable token-styled component library
│       ├── accordion.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── batch-card.tsx
│       ├── breadcrumbs.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── container.tsx
│       ├── data-table.tsx
│       ├── dropdown-menu.tsx
│       ├── empty-state.tsx
│       ├── error-state.tsx
│       ├── form-field.tsx
│       ├── form-helpers.tsx
│       ├── input.tsx
│       ├── modal.tsx
│       ├── page-header.tsx
│       ├── pagination.tsx
│       ├── rating.tsx
│       ├── section.tsx
│       ├── select.tsx
│       ├── skeleton.tsx
│       ├── spinner.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── theme-toggle.tsx
│       └── tooltip.tsx
├── docs/
│   └── DESIGN_SYSTEM.md           # Tokens, contrast metrics, & component rules
├── lib/
│   ├── api.ts                     # Fetch wrapper with credentials and typed ApiError
│   ├── auth.ts                    # Server-side authentication verification
│   ├── client-auth.ts             # Client-side session retrieval
│   └── cn.ts                      # Class variance & tailwind-merge helper
├── next.config.ts                 # Next.js config with rewrites & remote image domains
└── package.json
```
