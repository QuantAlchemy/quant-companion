/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentSetup from '@/components/agents/AgentSetup'

const setup = {
  url: 'https://example.convex.site/mcp',
  prompt: 'Connect this agent to the Quant Companion MCP server.',
}

afterEach(cleanup)

describe('AgentSetup', () => {
  it('copies the setup prompt from the server', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<AgentSetup setup={setup} />)

    expect(screen.getByText(setup.prompt)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Copy setup prompt' }))
    expect(await screen.findByText('Copied')).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith(setup.prompt)
  })

  it('shows the steps for the chosen agent with the server URL', () => {
    render(<AgentSetup setup={setup} />)

    expect(
      screen.getByText(
        `claude mcp add --transport http --scope user quant-companion ${setup.url}`,
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Codex' }))
    expect(
      screen.getByText(`codex mcp add quant-companion --url ${setup.url}`),
    ).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Codex' }), {
      key: 'ArrowRight',
    })
    expect(
      screen
        .getByRole('tab', { name: 'Claude app' })
        .getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('explains when the server is not configured', () => {
    render(<AgentSetup setup={null} />)

    expect(
      screen.getByText(
        'Agent connections are not available on this server yet.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
  })
})
