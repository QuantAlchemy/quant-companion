# Generate with: pnpm run env:generate:local  (requires 1Password CLI)

# Clerk authentication (created by `clerk init`)
VITE_CLERK_PUBLISHABLE_KEY={{ op://code-env/quant-companion-local/VITE_CLERK_PUBLISHABLE_KEY }}
CLERK_JWT_ISSUER_DOMAIN={{ op://code-env/quant-companion-local/CLERK_JWT_ISSUER_DOMAIN }}
CLERK_SECRET_KEY={{ op://code-env/quant-companion-local/CLERK_SECRET_KEY }}

# Convex backend (used by `pnpm dev:convex`)
CONVEX_DEPLOY_KEY={{ op://code-env/quant-companion-local/CONVEX_DEPLOY_KEY }}
CONVEX_DEPLOYMENT={{ op://code-env/quant-companion-local/CONVEX_DEPLOYMENT }}
VITE_CONVEX_URL={{ op://code-env/quant-companion-local/VITE_CONVEX_URL }}

# Live market prices (optional — journal works without them)
COINMARKETCAP_API_KEY={{ op://code-env/quant-companion-local/COINMARKETCAP_API_KEY }}
ALPACA_API_KEY_ID={{ op://code-env/quant-companion-local/ALPACA_API_KEY_ID }}
ALPACA_SECRET_KEY={{ op://code-env/quant-companion-local/ALPACA_SECRET_KEY }}

# MCP server for agents (docs/mcp.md). Copy this and CLERK_SECRET_KEY to the
# Convex deployment's environment; generating this file does not set them.
MCP_RESOURCE_URL=https://formal-badger-214.convex.site/mcp
