import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const md = readFileSync(path.join(root, 'public/strategy-invalidation-playbook.md'), 'utf8')

const phases = [
  {
    id: 'reproduce',
    title: 'Phase 1 · Reproduce',
    desc: 'Make the baseline trustworthy before stress testing.',
    tests: [1, 2, 3],
  },
  {
    id: 'randomize',
    title: 'Phase 2 · Randomize',
    desc: 'Build null distributions. If random can match the strategy, it is not special.',
    tests: [4, 5, 6, 7, 8, 9],
  },
  {
    id: 'stress',
    title: 'Phase 3 · Stress',
    desc: 'Keep the same trades, then make the world less friendly.',
    tests: [10, 11, 12],
  },
  {
    id: 'alpha',
    title: 'Phase 4 · Validate alpha',
    desc: 'Separate signal value from beta, drift, or trade distribution luck.',
    tests: [13, 14, 15],
  },
  {
    id: 'robustness',
    title: 'Phase 5 · Robustness',
    desc: 'Performance that survives nearby worlds, not one lucky path.',
    tests: [16, 17, 18],
  },
]

const tags = {
  1: 'tv',
  2: 'tv',
  3: 'partial',
  4: 'tv',
  5: 'tv',
  6: 'tv',
  7: 'partial',
  8: 'partial',
  9: 'partial',
  10: 'tv',
  11: 'tv',
  12: 'partial',
  13: 'partial',
  14: 'partial',
  15: 'partial',
  16: 'tv',
  17: 'tv',
  18: 'partial',
}
const tagLabels = {
  tv: 'TradingView export',
  partial: 'Extended inputs',
  kill: 'Not TV export',
}

const tests = []
const sections = md.split(/^## /m).slice(1)
for (const section of sections) {
  if (section.startsWith('Implementation links')) break
  const lines = section.trim().split('\n')
  const titleLine = lines[0]
  const m = titleLine.match(/^(\d+)\.\s+(.+)$/)
  if (!m) continue
  const num = parseInt(m[1], 10)
  const fields = {}
  for (const line of lines.slice(1)) {
    const fm = line.match(/^- \*\*([^:]+):\*\* (.+)$/)
    if (fm) fields[fm[1]] = fm[2]
  }
  tests.push({ num, name: fields['Name'] || m[2], fields })
}

function requireTest(num) {
  const test = tests.find((x) => x.num === num)
  if (!test) {
    throw new Error(
      `Missing test ${num} in public/strategy-invalidation-playbook.md (referenced by phases config)`
    )
  }
  return test
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')
}

function specCard(t) {
  const tag = tags[t.num] || 'partial'
  const rows = [
    ['What it checks', t.fields['What it checks']],
    ['How to run it', t.fields['How to run it']],
    ['Required inputs', t.fields['Required inputs']],
    ['Metrics to compare', t.fields['Metrics to compare']],
    ['Pass condition', t.fields['Pass condition'], 'pass'],
    ['Fail / invalidate condition', t.fields['Fail / invalidate condition'], 'fail'],
    ['Example', t.fields['Example'], 'code'],
    ['Implementation notes', t.fields['Python/VectorBT/Zipline implementation notes'], 'code'],
  ].filter(([, v]) => v)

  const body = rows
    .map(([label, value, kind]) => {
      const cls = kind ? ` spec-field-${kind}` : ''
      return `<div class="spec-field${cls}"><dt>${esc(label)}</dt><dd>${fmt(value)}</dd></div>`
    })
    .join('\n')

  return `<article class="spec-card card" id="test-${t.num}" data-step="${String(t.num).padStart(2, '0')}">
    <span class="tag ${tag}">${tagLabels[tag]}</span>
    <h3>${t.num}. ${esc(t.name)}</h3>
    <dl class="spec-fields">${body}</dl>
  </article>`
}

const toc = phases
  .map((p) => {
    const items = p.tests
      .map((n) => {
        const t = requireTest(n)
        return `<li><a href="#test-${n}">${n}. ${esc(t.name)}</a></li>`
      })
      .join('')
    return `<div class="toc-phase"><h3>${esc(p.title)}</h3><ol>${items}</ol></div>`
  })
  .join('')

const phaseSections = phases
  .map((p) => {
    const cards = p.tests.map((n) => specCard(requireTest(n))).join('\n')
    return `<section class="section" id="${p.id}">
      <div class="section-title">
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.desc)}</p>
      </div>
      <div class="spec-grid">${cards}</div>
    </section>`
  })
  .join('\n')

const html = readFileSync(path.join(root, 'public/strategy-invalidation-playbook.html'), 'utf8')
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
if (!styleMatch) {
  throw new Error(
    'Could not extract <style> block from public/strategy-invalidation-playbook.html'
  )
}
const baseStyle = styleMatch[1]

const extraStyle = `
      .hero-compact h1 { font-size: clamp(36px, 6vw, 72px); }
      .hero-compact p { font-size: clamp(16px, 1.8vw, 20px); }
      .spec-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
      .spec-card { border-radius: 24px; padding: 24px; position: relative; overflow: hidden; }
      .spec-card::before {
        content: attr(data-step);
        position: absolute; top: 12px; right: 16px;
        color: rgba(255,255,255,0.055); font-size: 62px; font-weight: 1000; line-height: 1;
      }
      .spec-card h3 { margin: 14px 0 16px; font-size: 24px; letter-spacing: -0.035em; }
      .spec-fields { margin: 0; display: grid; gap: 12px; }
      .spec-field { display: grid; gap: 4px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255,255,255,0.025); }
      .spec-field dt { margin: 0; color: var(--ink); font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
      .spec-field dd { margin: 0; color: var(--muted); font-size: 14px; }
      .spec-field-pass { border-color: rgba(107,255,159,0.28); background: rgba(107,255,159,0.06); }
      .spec-field-pass dd { color: #c9f5d4; }
      .spec-field-fail { border-color: rgba(255,106,95,0.28); background: rgba(255,106,95,0.06); }
      .spec-field-fail dd { color: #ffc8c3; }
      .spec-field-code dd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
      .toc { border-radius: 28px; padding: 24px; border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); }
      .toc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-top: 16px; }
      .toc-phase h3 { margin: 0 0 8px; font-size: 14px; color: var(--green); letter-spacing: 0.06em; text-transform: uppercase; }
      .toc-phase ol { margin: 0; padding-left: 18px; color: var(--muted); font-size: 13px; }
      .toc-phase li { margin: 6px 0; }
      .toc-phase a { color: var(--muted); text-decoration: none; }
      .toc-phase a:hover { color: var(--green); }
      .scope-list { margin: 0; padding-left: 18px; color: var(--muted); }
      .scope-list li { margin: 8px 0; font-size: 14px; }
      .format-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 14px; }
      .format-pill { padding: 10px 12px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255,255,255,0.03); color: var(--muted); font-size: 13px; }
      .links-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
      .links-row a { font-size: 13px; }
    `

const out = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Strategy Invalidation Playbook · Full Test Specs · Quant Companion</title>
    <meta name="description" content="Full specifications for all 18 strategy invalidation tests: pass conditions, fail conditions, inputs, metrics, and implementation notes." />
    <link rel="icon" type="image/svg+xml" href="/playbook-favicon.svg" />
    <link rel="apple-touch-icon" href="/iconWhite-48.png" />
    <style>${baseStyle}${extraStyle}</style>
  </head>
  <body>
    <div class="wrap">
      <span class="eyebrow">Quant Companion documentation</span>
      <section class="hero hero-compact">
        <div>
          <h1>Full Test Specifications</h1>
          <p>A strategy is not valid because the equity curve looks good. It is valid only after the simplest ways to explain it away have failed.</p>
          <p><strong>Null hypothesis:</strong> my signal has no edge. Randomized trades, shuffled labels, market beta, cost assumptions, or one lucky regime can explain the result.</p>
          <div class="cta-row">
            <a class="cta" href="/#strategy-invalidation-lab">Open the v1 Invalidation Lab</a>
            <a class="cta secondary" href="/strategy-invalidation-playbook.html">Back to playbook overview</a>
          </div>
        </div>
        <aside class="callout">
          <div>
            <h2>Fresh example</h2>
            <p>Use a simple public TradingView export, such as an <strong>RSI pullback strategy on SPY, QQQ, BTCUSD, or ES</strong>. Use PQN as the implementation reference library and build a Quant Alchemy-owned example.</p>
          </div>
          <div class="metric-row" aria-label="Documentation summary">
            <div class="metric"><b>18</b><span>documented tests</span></div>
            <div class="metric"><b>5</b><span>phases</span></div>
            <div class="metric"><b>TV</b><span>export-first v1</span></div>
          </div>
        </aside>
      </section>

      <section class="section">
        <div class="section-title"><h2>Version scope</h2></div>
        <div class="card" style="border-radius:24px;padding:24px">
          <ul class="scope-list">
            <li><strong>v1 implemented in app:</strong> TradingView List of Trades export tests: baseline, sample size, trade-order shuffle, bootstrap, sign-flip expectancy, outlier dependency, fee haircut, subperiod stability, rolling death watch, and multi-file comparison.</li>
            <li><strong>v1.1 / v2:</strong> OHLC price import and richer multiple-result comparison.</li>
            <li><strong>v3 options:</strong> strategy signal export, TradingView Optimizer/browser automation for reruns, and Pine Script controlled randomization.</li>
          </ul>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><h2>Test format</h2><p>Every invalidation test is documented with the fields below.</p></div>
        <div class="format-grid">
          <div class="format-pill">Name</div>
          <div class="format-pill">What it checks</div>
          <div class="format-pill">How to run it</div>
          <div class="format-pill">Required inputs</div>
          <div class="format-pill">Metrics to compare</div>
          <div class="format-pill">Pass condition</div>
          <div class="format-pill">Fail / invalidate condition</div>
          <div class="format-pill">Example</div>
          <div class="format-pill">Implementation notes</div>
        </div>
      </section>

      <section class="section">
        <div class="section-title"><h2>Table of contents</h2></div>
        <div class="toc"><div class="toc-grid">${toc}</div></div>
      </section>

      ${phaseSections}

      <section class="section artifact-note">
        <h2>Implementation links</h2>
        <div class="links-row">
          <a href="/#strategy-invalidation-lab">In app: Invalidation Lab</a>
          <a href="/strategy-invalidation-playbook.html">Playbook overview</a>
          <a href="/strategy-invalidation-playbook-specs.html">Full test specifications (this page)</a>
        </div>
      </section>
    </div>
  </body>
</html>`

const targets = [
  path.join(root, 'public/strategy-invalidation-playbook-specs.html'),
  path.join(root, 'docs/strategy-invalidation-playbook-specs.html'),
]

for (const target of targets) {
  writeFileSync(target, out)
}

console.log(`Wrote specs HTML (${tests.length} tests) to public/ and docs/`)
