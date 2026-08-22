import { createFileRoute } from '@tanstack/react-router'

import { seo } from '@/lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () =>
    seo({
      title: 'Privacy · Quant Companion',
      description: 'How Quant Companion handles account and trading data.',
      path: '/privacy',
    }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="kicker">Last updated August 21, 2026</p>
      <h1>Privacy</h1>
      <p>
        Quant Companion stores journal entries in a private account-scoped
        database. Strategy files uploaded to the analytics tools are processed
        in your browser and are not uploaded to our servers.
      </p>
      <h2>Information we process</h2>
      <p>
        We process account details provided through Clerk, journal entries you
        choose to save, basic product analytics, and market symbols sent to our
        server when you request live prices or benchmark data.
      </p>
      <h2>How we use information</h2>
      <p>
        We use this information to provide the product, protect accounts,
        diagnose reliability issues, and improve product usability. We do not
        sell personal information.
      </p>
      <h2>Your choices</h2>
      <p>
        You can export your journal from the product. Contact Quant Alchemy to
        request account or journal deletion.
      </p>
      <h2>Contact</h2>
      <p>
        Contact Quant Alchemy through{' '}
        <a href="https://quantalchemy.io">quantalchemy.io</a> with privacy
        questions or requests.
      </p>
    </article>
  )
}
