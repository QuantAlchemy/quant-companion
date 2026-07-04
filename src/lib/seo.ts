/**
 * Site-wide SEO helpers — see the TanStack Start SEO guide.
 * Every route calls seo() in head() so social cards, canonical URLs,
 * and descriptions stay consistent.
 */

export const SITE = {
  name: 'Quant Companion',
  url: 'https://www.quant-companion.quantalchemy.io',
  // keep under ~120 chars: mobile previews truncate at ~3 lines
  description:
    'Strategy analytics, trading journal, and position sizing — the Quant Alchemy trading workbench.',
  image: 'https://www.quant-companion.quantalchemy.io/og-image.png',
  twitterCard: 'summary_large_image',
  publisher: 'Quant Alchemy',
  publisherUrl: 'https://quantalchemy.io',
} as const

interface SeoInput {
  title: string
  description?: string
  image?: string
  imageAlt?: string
  /** route path used for canonical + og:url, e.g. '/analytics' */
  path?: string
  keywords?: string
}

export function seo({
  title,
  description,
  image,
  imageAlt,
  path,
  keywords,
}: SeoInput) {
  const desc = description ?? SITE.description
  const img = new URL(image ?? SITE.image, SITE.url).toString()
  const alt = imageAlt ?? title
  const url = new URL(path ?? '', SITE.url).toString()

  const meta = [
    { title },
    { name: 'description', content: desc },
    ...(keywords ? [{ name: 'keywords', content: keywords }] : []),
    // Open Graph (Facebook, LinkedIn, Discord, Slack, Mastodon, Bluesky)
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE.name },
    { property: 'og:title', content: title },
    { property: 'og:description', content: desc },
    { property: 'og:image', content: img },
    { property: 'og:image:secure_url', content: img },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: alt },
    { property: 'og:url', content: url },
    // Twitter / X
    { name: 'twitter:card', content: SITE.twitterCard },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: desc },
    { name: 'twitter:image', content: img },
    { name: 'twitter:image:alt', content: alt },
    { name: 'twitter:url', content: url },
  ]

  const links = [{ rel: 'canonical', href: url }]

  return { meta, links }
}

/** JSON-LD structured data for the root document (GEO/AEO). */
export function siteStructuredData() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.publisherUrl}/#organization`,
        name: SITE.publisher,
        url: SITE.publisherUrl,
        logo: `${SITE.url}/qc-icon.svg`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        publisher: { '@id': `${SITE.publisherUrl}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE.name,
        url: SITE.url,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        description: SITE.description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Strategy performance analytics from TradingView exports',
          'Monte Carlo simulation and probability cones',
          'Strategy Invalidation Lab',
          'Trading journal with live unrealized P&L',
          'Position size calculator with liquidation analysis',
        ],
        publisher: { '@id': `${SITE.publisherUrl}/#organization` },
      },
    ],
  })
}
