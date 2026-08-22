// Generates every committed brand asset from brand/mark.svg and brand/brand.json.
// Node 24 runs this TypeScript file directly.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

interface BrandSpec {
  name: string
  tagline: string
  description: string
  ogSubtitle: string
  url: string
  themeColor: string
  background: string
  ink: string
  ink2: string
  ink3: string
  fonts: Record<string, string>
}

const spec: BrandSpec = JSON.parse(
  readFileSync(resolve(root, 'brand/brand.json'), 'utf8'),
)
const mark = readFileSync(resolve(root, 'brand/mark.svg'), 'utf8')
const fontFiles = Object.values(spec.fonts).map((file) => resolve(root, file))
const out = resolve(root, 'public')

function renderPng(svg: string, width: number): Buffer {
  return Buffer.from(
    new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
      font: { fontFiles, loadSystemFonts: false },
    })
      .render()
      .asPng(),
  )
}

function buildIco(pngs: ReadonlyArray<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const directory = Buffer.alloc(16 * pngs.length)
  let offset = header.length + directory.length

  pngs.forEach(({ size, png }, index) => {
    const entry = index * 16
    directory.writeUInt8(size, entry)
    directory.writeUInt8(size, entry + 1)
    directory.writeUInt8(0, entry + 2)
    directory.writeUInt8(0, entry + 3)
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(png.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })

  return Buffer.concat([header, directory, ...pngs.map(({ png }) => png)])
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function ogSvg(brand: BrandSpec): string {
  const markContents = mark
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<svg[^>]*>|<\/svg>/g, '')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgViolet" cx="0" cy="0" r="1.15"><stop offset="0" stop-color="#342567"/><stop offset=".58" stop-color="${brand.background}"/></radialGradient>
    <radialGradient id="bgGold" cx="1" cy="1" r=".75"><stop offset="0" stop-color="#3A2D1C" stop-opacity=".7"/><stop offset="1" stop-color="${brand.background}" stop-opacity="0"/></radialGradient>
    <linearGradient id="chart" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#B48CFF"/></linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="#929BCD" stroke-opacity=".08"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="${brand.background}"/>
  <rect width="1200" height="630" fill="url(#bgViolet)"/>
  <rect width="1200" height="630" fill="url(#bgGold)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <path d="M30 544 190 496 318 514 450 445 580 472 735 384 875 416 1170 282" fill="none" stroke="url(#chart)" stroke-width="8" stroke-opacity=".22"/>
  <g transform="translate(90 170) scale(3.9)">${markContents}</g>
  <text x="430" y="274" font-family="Fraunces" font-style="italic" font-weight="850" font-size="72" fill="${brand.ink}" letter-spacing="-2">Quant</text>
  <text x="430" y="354" font-family="Fraunces" font-style="italic" font-weight="850" font-size="72" fill="#B48CFF" letter-spacing="-2">Companion</text>
  <text x="432" y="410" font-family="Instrument Sans" font-size="27" fill="${brand.ink2}">${escapeXml(brand.ogSubtitle)}</text>
  <text x="90" y="565" font-family="Instrument Sans" font-size="21" fill="${brand.ink3}">${escapeXml(brand.url)}</text>
</svg>`
}

mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'favicon.svg'), mark)
writeFileSync(
  resolve(out, 'favicon.ico'),
  buildIco([16, 32, 48].map((size) => ({ size, png: renderPng(mark, size) }))),
)
writeFileSync(resolve(out, 'apple-touch-icon.png'), renderPng(mark, 180))
writeFileSync(resolve(out, 'icon-192.png'), renderPng(mark, 192))
writeFileSync(resolve(out, 'icon-512.png'), renderPng(mark, 512))
writeFileSync(resolve(out, 'og.png'), renderPng(ogSvg(spec), 1200))
writeFileSync(
  resolve(out, 'site.webmanifest'),
  `${JSON.stringify(
    {
      name: spec.name,
      short_name: spec.name,
      description: spec.tagline,
      start_url: '/',
      display: 'standalone',
      background_color: spec.background,
      theme_color: spec.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )}\n`,
)

console.log('Brand assets written to public/')
