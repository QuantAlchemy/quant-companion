# Quant Companion

The unified **Quant Alchemy** workbench: strategy performance analytics, a
trading journal, and position sizing with liquidation analysis, in one app.

This app merges three previously separate projects:

| Tool                     | Route         | Formerly                               |
| ------------------------ | ------------- | -------------------------------------- |
| Performance Analytics    | `/analytics`  | quant-companion (SolidJS)              |
| Trading Journal          | `/journal`    | trading-journal (React + Convex)       |
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

SheetJS CE is pinned to the vendor's official 0.20.3 tarball because the npm
registry package stops at the vulnerable 0.18.5 release. See the
[SheetJS installation guide](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/).

## Development

```bash
pnpm install
pnpm dev              # frontend at http://localhost:3000
pnpm dev:convex       # Convex backend (first run configures the deployment)
pnpm build            # deploys Convex only in Vercel production; UI-only elsewhere
pnpm build:ui         # production build only, no Convex deploy
pnpm brand:assets     # regenerate favicons, app icons, and the social card
pnpm lint             # eslint
pnpm test             # vitest
pnpm generate-routes  # regenerate the route tree after adding routes
```

## Environment

Committed templates `.env.local.tpl` / `.env.production.tpl` follow the
1Password `op://` convention. Generate a real env file with:

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

`convex/` holds the trades schema and functions. Every journal operation is
scoped by Clerk's stable `identity.tokenIdentifier`. To bring it up:

1. `pnpm dev:convex`: first run creates or links the Convex deployment and
   generates `convex/_generated`.
2. In the Clerk dashboard, create a JWT template named `convex`, then set
   `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment
   (see https://docs.convex.dev/auth/clerk).

The journal UI reads and writes these Convex functions through
`ConvexProviderWithClerk`. Imports use stable source keys, so the same file can
be imported again without duplicating a trade.

## Data & privacy

Analytics uploads are processed entirely in the browser. Journal entries sync
to an account-scoped Convex database. Gamification progress and analytics
header mappings remain in browser storage. The journal supports lossless JSON
export/import for backup and migration.

Live prices and benchmark bars use authenticated server functions in
`src/lib/prices.ts`, so provider keys never reach the client. New account access
goes through Clerk's waitlist at `/waitlist`.

## Architecture notes

- `src/lib/stats.ts`, `monteCarlo.ts`, `invalidation.ts`, `headerMappings.ts`:
  analytics math ported from the original app (Solid signals → TanStack Store)
- `src/lib/journal.ts`: validated JSON/JSONL import, portable export, and stable
  import keys
- `src/lib/gamification.ts`: XP, ranks, streaks, achievements
- `src/lib/positionSize.ts`: position sizing and liquidation math
- `src/components/Plot.tsx`: client-only, code-split Plotly wrapper
- `src/routes/journal.tsx`: Clerk-protected Convex journal UI

The legacy Chrome-extension build (TradingView page scraping) was retired with
the SolidJS app; the git history (`main` prior to this replacement) retains it.
