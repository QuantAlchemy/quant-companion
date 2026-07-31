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

  test('robots points to the sitemap and excludes authenticated entry points', () => {
    expect(robots).toContain(
      'Sitemap: https://www.quant-companion.quantalchemy.io/sitemap.xml',
    )
    expect(robots).toContain('Disallow: /journal')
    expect(robots).toContain('Disallow: /sign-in')
    expect(robots).toContain('Disallow: /sign-up')
  })
})
