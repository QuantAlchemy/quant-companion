import { createFileRoute } from '@tanstack/react-router'

import { seo } from '@/lib/seo'

export const Route = createFileRoute('/terms')({
  head: () =>
    seo({
      title: 'Terms · Quant Companion',
      description: 'Terms for using Quant Companion.',
      path: '/terms',
    }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="kicker">Last updated August 21, 2026</p>
      <h1>Terms</h1>
      <p>
        Quant Companion provides educational trading analysis and recordkeeping
        tools. It does not provide investment, legal, tax, or financial advice.
      </p>
      <h2>Your responsibility</h2>
      <p>
        You are responsible for your trading decisions, the accuracy of the
        information you enter, and maintaining access to your account. Markets
        involve substantial risk, including loss of principal.
      </p>
      <h2>Availability</h2>
      <p>
        Features may change, pause, or become unavailable. Market data can be
        delayed, incomplete, or inaccurate and must not be treated as an order
        execution feed.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not misuse the service, attempt unauthorized access, interfere with
        other users, or use automated access that burdens the service.
      </p>
      <h2>Contact</h2>
      <p>
        Contact Quant Alchemy through{' '}
        <a href="https://quantalchemy.io">quantalchemy.io</a> with questions.
      </p>
    </article>
  )
}
