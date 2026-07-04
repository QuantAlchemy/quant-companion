# Production environment — mirror these into Vercel project env vars
# (vercel env add, or the dashboard). Generate a reference copy with:
#   op inject -i .env.production.tpl -o .env.production

# Clerk authentication — use the PRODUCTION Clerk instance keys
VITE_CLERK_PUBLISHABLE_KEY={{ op://code-env/quant-companion-production/VITE_CLERK_PUBLISHABLE_KEY }}
CLERK_SECRET_KEY={{ op://code-env/quant-companion-production/CLERK_SECRET_KEY }}

# Convex backend (production deployment)
CONVEX_DEPLOYMENT={{ op://code-env/quant-companion-production/CONVEX_DEPLOYMENT }}
VITE_CONVEX_URL={{ op://code-env/quant-companion-production/VITE_CONVEX_URL }}
CONVEX_DEPLOY_KEY={{ op://code-env/quant-companion-production/CONVEX_DEPLOY_KEY }}

# Live market prices (optional — journal works without them)
COINMARKETCAP_API_KEY={{ op://code-env/quant-companion-production/COINMARKETCAP_API_KEY }}
ALPACA_API_KEY_ID={{ op://code-env/quant-companion-production/ALPACA_API_KEY_ID }}
ALPACA_SECRET_KEY={{ op://code-env/quant-companion-production/ALPACA_SECRET_KEY }}
