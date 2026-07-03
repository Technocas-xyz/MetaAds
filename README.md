# AI Ads Supervisor — Frontend

React + Vite frontend for the AI Ads Supervisor platform. Tracks competitor ads, runs AI analysis, surfaces insights, and manages creative review workflows.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| UI primitives | Radix UI |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Testing | Vitest + Testing Library + Playwright |

---

## Prerequisites

- Node.js 20+
- npm 10+
- A running backend API (see `/api` in this repo), or set `VITE_USE_MOCKS=true`

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL

# 3. Start development server
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL, no trailing slash |
| `VITE_USE_MOCKS` | No | `true` to use local fixture data (default dev mode) |

See [.env.example](.env.example) for a documented template.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start local dev server (hot reload) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit + integration tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:ui` | Vitest browser UI |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:snapshots` | Run visual regression snapshots |
| `npm run test:snapshots:update` | Update snapshot baselines |
| `npm run test:all` | Run unit, integration, and e2e tests |

---

## Project Structure

```
src/
├── api/               # Axios client, transport layer, API modules, fixtures
├── components/
│   ├── layout/        # AppShell, Sidebar, Topbar, Breadcrumb
│   ├── shared/        # KPICard, ConfidenceBadge, FilterBar, AdThumbnail …
│   └── ui/            # Button, Input, Modal, Table, Pagination, Badge …
├── features/          # Page-level feature modules (one folder per route)
├── hooks/
│   ├── queries/       # TanStack Query hooks (useAds, useReview, useAI …)
│   └── useDebounce.ts
├── lib/               # confidence.js, formatters.js, validators.js, utils.js
├── routes/            # AppRoutes.jsx — all route definitions
├── store/             # Zustand UI store (sidebar state)
├── test/              # Vitest setup, MSW handlers, render utilities
└── main.jsx
```

---

## Building for Production

```bash
npm run build
```

Output lands in `dist/`. All assets are hashed. Sourcemaps are generated but excluded from serving (configure your CDN/server to block `*.map` files).

---

## Deployment

### Netlify

Add a `_redirects` file in `public/` (already included):

```
/*  /index.html  200
```

Set build command to `npm run build` and publish directory to `dist`.

### Vercel

A `vercel.json` is included at the project root. Deploy by running:

```bash
vercel --prod
```

### Nginx (self-hosted)

```nginx
server {
  root /var/www/decoinks-frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Block sourcemaps from public access
  location ~ \.map$ { deny all; }
}
```

---

## Testing

### Unit & Integration (Vitest)

```bash
npm run test           # single run
npm run test:watch     # watch mode
npm run test:coverage  # with lcov + html coverage
```

Coverage output: `coverage/`

### End-to-End (Playwright)

Requires the dev server to be running (`npm run dev`) or set `webServer` in `playwright.config.js`.

```bash
npm run test:e2e
npm run test:e2e:ui    # interactive mode
```

### Visual Regression

```bash
npm run test:snapshots           # compare against baselines
npm run test:snapshots:update    # update baselines after intentional changes
```

Snapshots stored in `e2e/snapshots/`.

---

## Code Quality

```bash
npm run lint    # ESLint (no warnings allowed in CI)
```

Prettier is configured via `.prettierrc`. Run `npx prettier --write src/` to format.
