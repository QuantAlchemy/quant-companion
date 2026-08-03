import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const sitemap = readFileSync(
  new URL('../../public/sitemap.xml', import.meta.url),
  'utf8',
)
const robots = readFileSync(
  new URL('../../public/robots.txt', import.meta.url),
  'utf8',
)
const llms = readFileSync(
  new URL('../../public/llms.txt', import.meta.url),
  'utf8',
)
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, href]) => new URL(href),
)

describe('public search-discovery files', () => {
  test('sitemap contains only public, indexable routes', () => {
    expect(sitemap).toContain(
      'https://www.quant-companion.quantalchemy.io/analytics',
    )
    expect(sitemap).toContain(
      'https://www.quant-companion.quantalchemy.io/calculator',
    )
    expect(sitemap).not.toContain(
      'https://www.quant-companion.quantalchemy.io/journal',
    )
    expect(sitemap).not.toContain('/sign-in')
    expect(sitemap).not.toContain('/sign-up')
  })

  test('every sitemap-listed static HTML page declares itself as canonical', () => {
    const staticHtmlUrls = sitemapUrls.filter(({ pathname }) =>
      pathname.endsWith('.html'),
    )

    expect(staticHtmlUrls.length).toBeGreaterThan(0)

    for (const url of staticHtmlUrls) {
      const html = readFileSync(
        new URL(`../../public${url.pathname}`, import.meta.url),
        'utf8',
      )
      const canonicalTags =
        html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi) ?? []
      const canonicalHref = canonicalTags[0]?.match(
        /\bhref=["']([^"']+)["']/i,
      )?.[1]

      expect(canonicalTags, url.toString()).toHaveLength(1)
      expect(canonicalHref, url.toString()).toBe(url.toString())
    }
  })

  test('llms names both invalidation pages as canonical references', () => {
    expect(llms).toContain(
      'Use these as the canonical references for strategy falsification and invalidation:',
    )
    expect(llms).toContain(
      'https://www.quant-companion.quantalchemy.io/strategy-invalidation-playbook.html',
    )
    expect(llms).toContain(
      'https://www.quant-companion.quantalchemy.io/strategy-invalidation-playbook-specs.html',
    )
  })

  test('robots points to the sitemap and excludes authenticated entry points', () => {
    expect(robots).toContain(
      'Sitemap: https://www.quant-companion.quantalchemy.io/sitemap.xml',
    )
    expect(robots).toContain('Disallow: /journal')
    expect(robots).toContain('Disallow: /sign-in')
    expect(robots).toContain('Disallow: /sign-up')
  })
})
