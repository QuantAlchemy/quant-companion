# Connect an agent to Quant Companion

Quant Companion has a hosted MCP server. An agent connects with the server URL
only. You sign in with your Quant Companion (Clerk) account in the browser and
approve access. There is no API key. The server runs on the Convex HTTP origin
at `/mcp`.

| Deployment  | MCP URL                                       |
| ----------- | --------------------------------------------- |
| Production  | `https://opulent-spaniel-556.convex.site/mcp` |
| Development | `https://formal-badger-214.convex.site/mcp`   |

Signed-in users find the setup on the **Agents** page (`/agents`). It shows
the setup prompt and server URL for the current deployment, steps for Claude
Code, Codex, the Claude app, ChatGPT, VS Code, and other agents, and what the
agent can do. Keep its client steps and capability list in
`src/components/agents/AgentSetup.tsx` in sync with this document and
`convex/mcp/server.ts`.

`/mcp-setup` on the same origin returns the same setup prompt as plain text. Give it
to the agent, and the agent adds the server and starts sign-in. You can also
add the server yourself:

```bash
claude mcp add --transport http quant-companion https://opulent-spaniel-556.convex.site/mcp
codex mcp add quant-companion --url https://opulent-spaniel-556.convex.site/mcp
```

The client needs Streamable HTTP, OAuth discovery, the authorization code flow
with PKCE S256, resource indicators, and Client ID Metadata Documents (CIMD).
Current Claude Code and Codex versions support these. A client that only
supports stdio or a static bearer token cannot connect.

## Record trades from broker emails

Paste the confirmation and tell the agent whose account it is. For example:

> Update my trade log. This is my (Ralph's) Vanguard account.
>
> Account: 0961, Transaction type: Sell, Order type: Market,
> Security: STRATEGY INC PERPETUAL STRETCH PFD SER A VAR (STRC),
> Quantity: 53 share(s), Price: $97.95

The server instructions tell the agent to:

1. Call `list_accounts` and pick the existing account name, for example
   `Vanguard - Ralph`. Names follow `<Broker> - <Owner>`. Account numbers in
   emails are not stored. The agent asks when more than one account could
   match.
2. Read the symbol, side, quantity, price, fees, and date. If the email has no
   trade date, the agent uses today's date and says so.
3. Call `record_execution` with `dryRun: true`. A sell closes the open long lots
   in that account, oldest first. If the sale is smaller than a lot, the lot
   splits: the sold part closes and the rest stays open. A buy closes open
   short lots the same way, or opens a new lot.
4. Apply the plan with `dryRun: false`, the same `requestId`, and the `planId`
   from the dry run. If the lots changed after the dry run, for example because
   you closed one in the app, the apply fails and the agent runs the dry run
   again. A retry with the same `requestId` returns the first result and does
   not write again.

The server refuses an account name that does not exist, a sale larger than the
open position, a sell with no open long, and a fill dated before every open lot
it would close. Each error tells the agent what to
ask you. The agent can create a new account name or open a short only after you
confirm it.

## Tools

The `quantcompanion:read` permission allows these tools:

| Tool                      | Use                                                             |
| ------------------------- | --------------------------------------------------------------- |
| `list_accounts`           | Account names, trade counts, and open positions with their lots |
| `list_trades`             | Trades with filters for account, symbol, status, and dates      |
| `get_trade`               | One trade                                                       |
| `get_performance_summary` | The journal statistics the app shows, net of commission         |
| `calculate_position_size` | The position size calculator. It saves nothing.                 |

The `quantcompanion:write` permission adds these tools:

| Tool               | Use                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------- |
| `record_execution` | Record a broker fill. It closes or opens lots as described above.                      |
| `add_trade`        | Open a trade directly                                                                  |
| `update_trade`     | Change only the supplied fields of one trade                                           |
| `close_trade`      | Close all or part of one trade, with an optional exit fee                              |
| `delete_trades`    | Delete up to 100 trades. This cannot be undone.                                        |
| `import_trades`    | Import up to 1,000 trades in the app's export format in one call. Repeats add nothing. |

`add_trade` and `close_trade` also need a `requestId`, so a retried call does
not add or split a trade twice. `update_trade` and `delete_trades` are safe to
repeat.

The tools use the same validation and P&L rules as the app
(`convex/model/trades.ts`). Changes show in the open journal page at once.

The agent cannot read or change data that only exists in your browser:
analytics uploads, saved column mappings, journal column choices, and XP and
achievements. Live prices are not available to the agent, so the summary
covers closed trades only.

## Security

- Every request checks the token with Clerk. A revoked grant fails on the next
  call. Removing the server from an agent does not revoke its grant. Users ask
  Quant Alchemy to revoke it, and an administrator revokes the grant in Clerk.
- The server accepts only opaque Clerk OAuth tokens issued for this server's
  URL. It refuses JWT access tokens, because Clerk cannot revoke them.
- The agent works as the signed-in user. It uses the same journal owner key as
  the browser (`issuer|subject`), so it sees only that user's trades.
- When Clerk is down or rejects the server credential, the server returns 503,
  not 401, so agents do not ask you to sign in again.
- Logs record a fixed stage name. They never record tokens, secrets, or Clerk
  responses.

## Deployment configuration

Do these steps once for each Clerk instance and Convex deployment. Configure
development first. Development settings do not carry over to production.

### Clerk

Open **Configure > Developers > OAuth applications > Scopes** and add:

| Name                    | Key                    | Description                                                  | Advertised |
| ----------------------- | ---------------------- | ------------------------------------------------------------ | ---------- |
| Read your trade journal | `quantcompanion:read`  | Read your journal accounts, trades, and performance summary. | On         |
| Record and edit trades  | `quantcompanion:write` | Add, close, edit, import, and delete trades in your journal. | On         |

In **OAuth applications > Settings**, set:

| Setting                            | Value                                               |
| ---------------------------------- | --------------------------------------------------- |
| Publish CIMD support               | On, `client_id_metadata_documents_advertised: true` |
| Client admission                   | Any compatible CIMD client                          |
| Publish DCR support                | Off, `dynamic_oauth_client_registration: false`     |
| Default scopes for dynamic clients | `quantcompanion:read`, `quantcompanion:write`       |
| Require PKCE                       | On, `pkce_required: true`                           |
| Resource audience claims           | `aud_claim_enabled: true`                           |
| Access token format                | Opaque, `oauth_jwt_access_tokens: false`            |

If a setting is not in the dashboard, set it with Clerk's
`PATCH /v1/instance/oauth_application_settings` Backend API.

### Convex

Set these values on the Convex deployment. Use the `.convex.site` origin, not
`.convex.cloud`.

| Variable           | Value                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| `MCP_RESOURCE_URL` | The MCP URL from the table at the top                                  |
| `CLERK_SECRET_KEY` | The secret key of the same Clerk instance as `CLERK_JWT_ISSUER_DOMAIN` |

The Convex CLI reads `CONVEX_DEPLOY_KEY` from `.env.local` and then ignores
`--prod`. To change production, export the production deploy key in the shell
first, and pass secrets on stdin:

```bash
export CONVEX_DEPLOY_KEY="$(grep '^CONVEX_DEPLOY_KEY=' .env.production | cut -d= -f2-)"
grep '^CLERK_SECRET_KEY=' .env.production | cut -d= -f2- | tr -d '\n' | pnpm exec convex env set CLERK_SECRET_KEY
```

Without both values, `/mcp` returns 503 and the app works as before. Changing
`MCP_RESOURCE_URL` later makes every agent sign in again.

### Verify

1. Open `/.well-known/oauth-protected-resource/mcp` and
   `/.well-known/oauth-authorization-server` on the Convex site origin. Both
   must return JSON.
2. Connect a real client, approve access, and call `list_accounts`.
3. Record a fill with a dry run, then apply it. Check the journal page.
4. Revoke the grant in Clerk. The next tool call must ask for sign-in.

Local tests (`convex/mcp.test.ts`) use the real MCP client and the Convex test
backend with a stubbed Clerk response. They do not prove the hosted browser
sign-in.
