# Hostname manifest

- Canonical production hostname: `www.quant-companion.quantalchemy.io`
- Canonical origin: `https://www.quant-companion.quantalchemy.io`
- Parent brand: `https://quantalchemy.io`
- Hosting provider: Vercel
- Vercel project: `tradingview-companion`
- Authentication provider: Clerk
- Sign-in path: `/sign-in`
- New-access path: `/waitlist`
- Authenticated application path: `/journal`
- Sitemap: `/sitemap.xml`
- Robots policy: `/robots.txt`
- Social image: `/og.png`
- Primary favicon: `/favicon.svg`

If the hostname changes, update `src/lib/seo.ts`, the public discovery files,
Clerk authorized origins and redirects, Convex Clerk issuer configuration, and
the Vercel domain attachment before deploying.
