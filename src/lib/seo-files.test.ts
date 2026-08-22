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
const llmsFull = readFileSync(
  new URL('../../public/llms-full.txt', import.meta.url),
  'utf8',
)
const ai = readFileSync(new URL('../../public/ai.txt', import.meta.url), 'utf8')
const claimReceipts = JSON.parse(
  readFileSync(
    new URL('../../public/claim-receipts.json', import.meta.url),
    'utf8',
  ),
) as { claims: Array<{ claim: string; evidence: string }> }
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

  test('AI discovery files describe access and provide evidence links', () => {
    expect(llms).toContain('/llms-full.txt')
    expect(llmsFull).toContain('/waitlist')
    expect(ai).toContain('/claim-receipts.json')
    expect(claimReceipts.claims.length).toBeGreaterThan(0)
    for (const receipt of claimReceipts.claims) {
      expect(receipt.claim.length).toBeGreaterThan(20)
      const evidence = new URL(receipt.evidence)
      expect(evidence.protocol).toBe('https:')
      expect(evidence.hostname).toBe('www.quant-companion.quantalchemy.io')
    }
  })

  test('robots points to the sitemap and excludes authenticated entry points', () => {
    expect(robots).toContain(
      'Sitemap: https://www.quant-companion.quantalchemy.io/sitemap.xml',
    )
    expect(robots).toContain('Disallow: /journal')
    expect(robots).toContain('Disallow: /sign-in')
    expect(robots).toContain('Disallow: /sign-up')
    expect(robots).toContain('User-agent: GPTBot')
    expect(robots).toContain('User-agent: OAI-SearchBot')
    const policy = robots.slice(0, robots.indexOf('Sitemap:'))
    expect(policy.match(/Disallow: \/journal/g)).toHaveLength(1)
    expect(policy.indexOf('User-agent: Google-Extended')).toBeLessThan(
      policy.indexOf('Disallow: /journal'),
    )
  })
})
