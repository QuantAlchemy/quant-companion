import {
  Check,
  Copy,
  MessageSquareQuote,
  Plug,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { KeyboardEvent } from 'react'

/** Server URL and setup prompt from convex/mcp/setup.ts. Null when the server is not configured. */
export interface AgentSetupData {
  url: string
  prompt: string
}

/** One setup step. `command` renders as a copyable line, `link` as an install button. */
interface Step {
  text: string
  command?: string
  link?: string
}

interface Client {
  id: string
  label: string
  steps: (url: string) => Step[]
  note?: string
}

const CONNECTION_NAME = 'quant-companion'

// Each app changes its menus over time. Keep the wording short, and check it
// when an app updates. Mirrors the client list in ClickAlchemy's Agents page.
const clients: Client[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    steps: (url) => [
      {
        text: 'Run this in your terminal:',
        command: `claude mcp add --transport http --scope user ${CONNECTION_NAME} ${url}`,
      },
      {
        text: `In Claude Code, type /mcp, choose ${CONNECTION_NAME}, then choose Authenticate.`,
      },
      { text: 'Approve access in the browser window that opens.' },
    ],
    note: 'Use a current Claude Code version for automatic OAuth setup.',
  },
  {
    id: 'codex',
    label: 'Codex',
    steps: (url) => [
      {
        text: 'Run this in your terminal. Codex opens a sign-in page when it adds the server.',
        command: `codex mcp add ${CONNECTION_NAME} --url ${url}`,
      },
      { text: 'Approve access in the browser window that opens.' },
    ],
    note: `Use a current Codex version for automatic OAuth setup. If sign-in succeeds but the tools are missing, restart Codex. To sign in again later, run codex mcp login ${CONNECTION_NAME}.`,
  },
  {
    id: 'claude-app',
    label: 'Claude app',
    steps: (url) => [
      {
        text: 'In Claude, open Customize, then Connectors. Select Add, then Add custom connector.',
      },
      { text: 'Name it Quant Companion and paste this URL:', command: url },
      { text: 'Select Add, then Connect, and approve access.' },
    ],
    note: 'On Team and Enterprise plans, an owner adds the connector in Organization settings first.',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    steps: (url) => [
      {
        text: 'Go to chatgpt.com/plugins, select +, then Add custom MCP server.',
      },
      {
        text: 'Name it Quant Companion, paste this URL, and choose OAuth:',
        command: url,
      },
      { text: 'Select Create as a plugin, then sign in and approve access.' },
    ],
    note: 'Custom MCP servers need a paid ChatGPT plan.',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    steps: (url) => [
      { text: 'Install in one click:', link: vscodeInstallLink(url) },
      {
        text: 'Or add this to .vscode/mcp.json:',
        command: JSON.stringify({
          servers: { [CONNECTION_NAME]: { type: 'http', url } },
        }),
      },
      {
        text: 'Start the server from the MCP list and approve access when VS Code asks.',
      },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    steps: (url) => [
      {
        text: 'Add this as a remote HTTP (Streamable HTTP) MCP server:',
        command: url,
      },
      { text: 'Select Authenticate or Sign in, and approve access.' },
    ],
    note: 'Your agent must support OAuth sign-in for MCP with Client ID Metadata Documents (CIMD). Agents that only accept an API key or a local (stdio) server cannot connect.',
  },
]

function vscodeInstallLink(url: string) {
  const server = { name: CONNECTION_NAME, type: 'http', url }
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify(server))}`
}

// Keep in sync with the tools registered in convex/mcp/server.ts.
const capabilities = [
  {
    access: 'Read',
    title: 'Accounts and positions',
    body: 'Account names and the open lots in each one.',
  },
  {
    access: 'Read',
    title: 'Trades and stats',
    body: 'Trades with filters, and your performance summary.',
  },
  {
    access: 'Write',
    title: 'Broker fills',
    body: 'Closes the oldest lots first. It checks a preview before it saves, and asks when something is unclear.',
  },
  {
    access: 'Write',
    title: 'Edit and import',
    body: 'Add, edit, close, delete, and import trades.',
  },
] as const

/** The Agents page body: setup, capabilities, an example, and access rules. */
export default function AgentSetup({
  setup,
}: {
  setup: AgentSetupData | null | undefined
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="rise-in mb-8 max-w-2xl">
        <p className="kicker">Agents</p>
        <h1 className="font-display mt-2 text-3xl md:text-4xl">
          Let your agent <span className="gold-text">keep the journal</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Connect Claude, ChatGPT, Codex, or another AI agent to your trade
          journal. Paste a broker confirmation and the agent records the trade
          in the right account. You sign in with this account. You do not need
          an API key.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {setup === undefined ? (
            <section className="panel p-6 text-sm text-muted-foreground">
              Loading setup…
            </section>
          ) : setup === null ? (
            <section className="panel p-6">
              <h2 className="font-semibold">Setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Agent connections are not available on this server yet.
              </p>
            </section>
          ) : (
            <>
              <section className="panel p-6">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Plug className="size-4 text-primary" />
                  Setup prompt
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Paste this into your agent. It adds the server and opens
                  sign-in.
                </p>
                <pre className="font-mono rounded-xl border border-border bg-background/60 p-4 text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {setup.prompt}
                </pre>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <CopyButton
                    text={setup.prompt}
                    label="Copy setup prompt"
                    primary
                  />
                  <span className="text-xs text-muted-foreground">
                    Works in agents that support remote MCP with OAuth.
                  </span>
                </div>
              </section>
              <ClientSetup url={setup.url} />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="panel p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Wrench className="size-4 text-primary" />
              What your agent can do
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              The same rules as the journal page.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <p className="font-mono text-[0.65rem] tracking-widest text-gold uppercase">
                    {item.access}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              It can also run the position size calculator.
            </p>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageSquareQuote className="size-4 text-primary" />
              Try this
            </h2>
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 text-sm">
              <p className="kicker">You</p>
              <p className="mt-1">
                Update my trade log. This is my Vanguard account.
              </p>
              <pre className="font-mono mt-2 text-xs whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
                {
                  'Transaction type: Sell\nSecurity: STRATEGY INC PERPETUAL STRETCH PFD SER A VAR (STRC)\nQuantity: 53 share(s)\nPrice: $97.95'
                }
              </pre>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Access and safety
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>The agent sees only your journal.</li>
              <li>
                It uses your existing account names, and asks before it adds a
                new one.
              </li>
              <li>
                Removing the server from an agent does not end its access. To
                end it, contact Quant Alchemy through{' '}
                <a href="https://quantalchemy.io">quantalchemy.io</a>.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Per-agent steps in a tab list. Arrow keys, Home, and End move between tabs. */
function ClientSetup({ url }: { url: string }) {
  const [selected, setSelected] = useState(clients[0].id)
  const client = clients.find((c) => c.id === selected) ?? clients[0]
  const idPrefix = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const tabId = (id: string) => `${idPrefix}-tab-${id}`
  const panelId = `${idPrefix}-panel`

  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    const last = clients.length - 1
    const targets: Partial<Record<string, number>> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    const next = targets[event.key]
    if (next === undefined) return
    event.preventDefault()
    setSelected(clients[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="panel p-6">
      <h2 className="font-semibold">Step by step</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Or set it up yourself. Choose your agent.
      </p>
      <div
        role="tablist"
        aria-label="Choose your agent"
        className="flex flex-wrap gap-1.5"
      >
        {clients.map((c, index) => (
          <button
            key={c.id}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            id={tabId(c.id)}
            type="button"
            role="tab"
            aria-selected={selected === c.id}
            aria-controls={panelId}
            tabIndex={selected === c.id ? 0 : -1}
            onClick={() => setSelected(c.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              selected === c.id
                ? 'border-primary bg-primary/20 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(client.id)}
        className="pt-5"
      >
        <ol className="list-decimal space-y-4 pl-5 text-sm marker:text-muted-foreground">
          {client.steps(url).map((step) => (
            <li key={step.text} className="min-w-0 space-y-2">
              <p>{step.text}</p>
              {step.command && <Command text={step.command} />}
              {step.link && (
                <Button render={<a href={step.link} />} size="sm">
                  Add to {client.label}
                </Button>
              )}
            </li>
          ))}
        </ol>
        {client.note && (
          <p className="mt-4 text-sm text-muted-foreground">{client.note}</p>
        )}
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-xs text-muted-foreground">Server URL</p>
        <Command text={url} />
      </div>
    </section>
  )
}

function Command({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 py-2 pr-2 pl-4">
      <code className="font-mono min-w-0 flex-1 overflow-x-auto text-xs whitespace-nowrap">
        {text}
      </code>
      <CopyButton text={text} label="Copy" />
    </div>
  )
}

function CopyButton({
  text,
  label,
  primary = false,
}: {
  text: string
  label: string
  primary?: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  // The clipboard API can be missing or denied. The text stays on screen, so
  // a failure only asks the user to copy it by hand.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    setTimeout(() => setStatus('idle'), 2000)
  }
  const Icon = status === 'copied' ? Check : Copy

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg font-medium transition-colors',
        primary
          ? 'bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/80'
          : 'border border-border px-2.5 py-1 text-xs hover:bg-muted',
      )}
    >
      <Icon className="size-3.5" />
      {status === 'copied'
        ? 'Copied'
        : status === 'failed'
          ? 'Copy failed. Select the text.'
          : label}
    </button>
  )
}
