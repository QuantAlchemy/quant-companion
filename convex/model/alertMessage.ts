import type { Doc } from '../_generated/dataModel'

/**
 * The words of a stop or target alert, shared by the browser notification and
 * the email. Pure, so tests can read the output.
 */

/** Up to 8 decimals for crypto, 2 for prices of 1 or more. */
export const formatPrice = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: value >= 1 ? 2 : 0,
    maximumFractionDigits: value >= 1 ? 2 : 8,
  })

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

type AlertFacts = Pick<
  Doc<'alerts'>,
  'kind' | 'assetName' | 'tradeType' | 'level' | 'price'
> & { quantity: number; entryPrice: number }

/** "Stop hit: NVDA long at 182.00" */
export const alertTitle = (alert: AlertFacts) =>
  `${alert.kind === 'stop' ? 'Stop' : 'Target'} hit: ${alert.assetName} ${
    alert.tradeType === 'buy' ? 'long' : 'short'
  } at ${formatPrice(alert.level)}`

/** One line for a notification. */
export const alertSummary = (alert: AlertFacts) =>
  `Last price ${formatPrice(alert.price)}. ${alert.quantity} at ${formatPrice(
    alert.entryPrice,
  )}. This is an alert, not an order.`

/** The email in plain text and HTML. The link opens the journal, when the app URL is known. */
export const alertEmail = (alert: AlertFacts, journalUrl?: string) => {
  const subject = alertTitle(alert)
  const position = alert.tradeType === 'buy' ? 'long' : 'short'
  const levelName = alert.kind === 'stop' ? 'stop' : 'target'
  const rows: [string, string][] = [
    [alert.kind === 'stop' ? 'Stop' : 'Target', formatPrice(alert.level)],
    ['Last price', formatPrice(alert.price)],
    ['Size', `${alert.quantity}, entry ${formatPrice(alert.entryPrice)}`],
  ]
  const footer =
    'This is an alert, not an order. Turn off emails in the alerts panel.'
  const text = [
    `Your ${position} ${alert.assetName} position reached its ${levelName}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    ...(journalUrl ? [`Open the journal: ${journalUrl}`, ''] : []),
    footer,
  ].join('\n')
  const html = `<div style="font-family:system-ui,sans-serif;color:#1b1d27;max-width:480px">
<h2 style="margin:0 0 8px">${escapeHtml(subject)}</h2>
<p>Your ${position} ${escapeHtml(alert.assetName)} position reached its ${levelName}.</p>
<table style="border-collapse:collapse;width:100%;font-family:ui-monospace,monospace;font-size:14px">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;border-bottom:1px solid #e3ded5">${label}</td><td style="padding:4px 0;border-bottom:1px solid #e3ded5;text-align:right">${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>
${journalUrl ? `<p><a href="${escapeHtml(journalUrl)}" style="display:inline-block;background:#7C5CFF;color:#fff;border-radius:8px;padding:8px 14px;text-decoration:none;font-weight:600">Open the journal</a></p>` : ''}
<p style="font-size:12px;color:#5d6178">${footer}</p>
</div>`
  return { subject, text, html }
}

/**
 * Posts one email to Resend. Throws with the provider's words when it refuses;
 * the caller logs that and moves on.
 */
export const sendResendEmail = async ({
  apiKey,
  from,
  to,
  email,
}: {
  apiKey: string
  from: string
  to: string
  email: { subject: string; text: string; html: string }
}) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, ...email }),
  })
  if (!response.ok) {
    throw new Error(
      `Resend returned ${response.status}: ${(await response.text()).slice(0, 200)}`,
    )
  }
}
