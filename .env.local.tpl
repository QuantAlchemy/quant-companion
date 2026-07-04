# Generate with: pnpm run env:generate:local  (requires 1Password CLI)

# Clerk authentication (created by `clerk init`)
VITE_CLERK_PUBLISHABLE_KEY={{ op://code-env/quant-companion-local/VITE_CLERK_PUBLISHABLE_KEY }}
CLERK_SECRET_KEY={{ op://code-env/quant-companion-local/CLERK_SECRET_KEY }}

# Convex backend (used by `pnpm dev:convex`)
CONVEX_DEPLOYMENT={{ op://code-env/quant-companion-local/CONVEX_DEPLOYMENT }}
VITE_CONVEX_URL={{ op://code-env/quant-companion-local/VITE_CONVEX_URL }}

# Live market prices (optional — journal works without them)
COINMARKETCAP_API_KEY={{ op://code-env/quant-companion-local/COINMARKETCAP_API_KEY }}
ALPACA_API_KEY_ID={{ op://code-env/quant-companion-local/ALPACA_API_KEY_ID }}
ALPACA_SECRET_KEY={{ op://code-env/quant-companion-local/ALPACA_SECRET_KEY }}
