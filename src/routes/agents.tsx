import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQuery } from 'convex/react'

import { api } from '@/../convex/_generated/api'
import AgentSetup from '@/components/agents/AgentSetup'
import { seo } from '@/lib/seo'

const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: '/sign-in/$' })
  }
})

export const Route = createFileRoute('/agents')({
  beforeLoad: async () => await authStateFn(),
  head: () =>
    seo({
      title: 'Agents · Quant Companion',
      description:
        'Connect Claude, ChatGPT, Codex, or another AI agent to your trade journal with browser sign-in.',
      path: '/agents',
    }),
  component: AgentsRoute,
})

function AgentsRoute() {
  const { convexClient } = Route.useRouteContext()
  // Without Convex there is no provider for useQuery, and no MCP server.
  if (!convexClient) return <AgentSetup setup={null} />
  return <ConnectedAgentSetup />
}

function ConnectedAgentSetup() {
  const setup = useQuery(api.mcp.setup.get)
  return <AgentSetup setup={setup} />
}
