# Quant Companion

The unified **Quant Alchemy** workbench — strategy performance analytics, a
trading journal, and position sizing with liquidation analysis, in one app.

This app merges three previously separate projects:

| Tool | Route | Formerly |
| --- | --- | --- |
| Performance Analytics | `/analytics` | quant-companion (SolidJS) |
| Trading Journal | `/journal` | trading-journal (React + Convex) |
| Position Size Calculator | `/calculator` | position-size-calculator (static HTML) |

Plus a gamification layer (`/achievements`): XP, alchemy-themed ranks
(Lead Seeker → Philosopher's Stone), daily streaks, and achievements tied to
disciplined trading habits.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, Vite) with TanStack
  Router, Query, Table, Form, and Store
- [Clerk](https://clerk.com) authentication (`@clerk/tanstack-react-start`)
- Tailwind CSS v4 + shadcn/ui components
- Plotly for charts, Papa Parse + SheetJS for CSV/XLSX import

## Development

```bash
pnpm install
pnpm dev              # frontend — http://localhost:3000
pnpm dev:convex       # Convex backend (first run configures the deployment)
pnpm build            # production build (Nitro — deploys to Vercel as-is)
pnpm lint             # eslint
pnpm test             # vitest
pnpm generate-routes  # regenerate the route tree after adding routes
```

## Environment

Committed templates `.env.local.tpl` / `.env.production.tpl` follow the
1Password `op://` convention — generate a real env file with:

```bash
pnpm run env:generate:local   # op inject -i .env.local.tpl -o .env.local
```

Keys: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk),
`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL` (Convex), and optional
`COINMARKETCAP_API_KEY`, `ALPACA_API_KEY_ID`, `ALPACA_SECRET_KEY` for live
prices and the Invalidation Lab's benchmark tests. Without the price keys the
journal still works; it just skips live unrealized P&L. Never expose
`CLERK_SECRET_KEY` or price API keys to the client.

For Vercel, mirror the same variables into the project's Preview/Production
environments (`vercel env add …`).

## Convex backend

`convex/` holds the trades schema and functions (Clerk-authenticated via
`identity.subject`). To bring it up:

1. `pnpm dev:convex` — first run creates/links the Convex deployment and
   generates `convex/_generated`.
2. In the Clerk dashboard, create a JWT template named `convex`, then set
   `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment
   (see https://docs.convex.dev/auth/clerk).

The journal UI currently persists to localStorage; switching its data plane to
these Convex functions is the intended next step (see `src/lib/journal.ts`).

## Data & privacy

Local-first: analytics uploads are processed entirely in the browser, and the
journal + gamification progress persist in `localStorage`, namespaced per
Clerk user id (`qc:<userId>:journal`, `qc:<userId>:progress`). The journal
supports lossless JSON export/import for backup and migration. The only
server-side calls are Clerk auth and the price-lookup server function
(`src/lib/prices.ts`), which keeps API keys off the client.

To move the journal to a hosted database later, replace the `load`/`persist`
pair in `src/lib/journal.ts` and make the operations async — the operation
semantics intentionally mirror the original Convex backend.

## Architecture notes

- `src/lib/stats.ts`, `monteCarlo.ts`, `invalidation.ts`, `headerMappings.ts` —
  analytics math ported from the original app (Solid signals → TanStack Store)
- `src/lib/journal.ts` — journal store with close/split P&L math
- `src/lib/gamification.ts` — XP, ranks, streaks, achievements
- `src/lib/positionSize.ts` — position sizing + liquidation math
- `src/components/Plot.tsx` — client-only, code-split Plotly wrapper
- `src/routes/journal.tsx` — Clerk-protected via `beforeLoad` server function

The legacy Chrome-extension build (TradingView page scraping) was retired with
the SolidJS app; the git history (`main` prior to this replacement) retains it.
