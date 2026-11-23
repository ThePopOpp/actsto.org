# ACT AI agents (Claude Managed Agents + Paperclip)

Five lead-generation agents. **Claude Managed Agents** runs each one, **Paperclip** assigns their work, and **ACTSTO.ORG** is the gate: agents reach ACT only through the MCP server at `https://actsto.org/api/mcp`, and every email or post they write waits for a Super Admin in **Dashboard → AI Agents**.

| Folder | Agent | Environment | What it may do |
|---|---|---|---|
| `ava-research` | Ava, Lead Researcher | `act-research` (public Arizona sources only) | read, add leads |
| `eli-qualify` | Eli, Lead Qualifier | `act-research` | read, update leads |
| `grace-outreach` | Grace, Outreach Writer | `act-workers` (no web) | read, draft emails |
| `micah-social` | Micah, Social Content | `act-workers` | read, draft posts for ACT's official pages |
| `ruth-inbox` | Ruth, Inbox Triage | `act-workers` | read replies, update leads, draft replies |

Each folder holds:
- `agent.md`: the agent definition. The frontmatter is its settings; the body is its instructions.
- `vault.yaml`: holds the agent's ACT token.
- `memory_store-playbook.yaml`: the agent's notes, kept between runs.

No agent can send anything, browse social networks, or use bash.

## One-time setup

Run these in **Git Bash** from the `actsto.org` folder.

### 1. Install and sign in to the Anthropic CLI

Download `ant` for Windows from https://github.com/anthropics/anthropic-cli/releases and put it on your PATH. Then:

```sh
ant auth login        # pick the ACT organization and workspace in the browser
ant auth status       # confirm the workspace before going on
```

### 2. Create the agents, environments, vaults and memory stores

Look at the plan first. Then apply it:

```sh
ant apply --dry-run agents environments
ant apply agents environments
```

`ant apply` writes `claude-lock.json`. **Commit it.** ACTSTO.ORG reads the IDs from it, so you don't have to copy them anywhere.

### 3. Give each agent its ACT token

1. In **Dashboard → AI Agents**, click **Add the starter agents**.
2. On each agent's card, click **Create token** and copy it.
3. Run the block below for that agent, one agent at a time. Paste the token at the silent prompt.

```sh
AGENT=ava-research    # then eli-qualify, grace-outreach, micah-social, ruth-inbox
VAULT_ID=$(node -p "require('./claude-lock.json').resources['./agents/$AGENT/vault.yaml'].id")
read -rs ACT_TOKEN    # paste the token, press Enter (nothing is shown or saved to history)
printf 'display_name: ACT MCP\nauth:\n  type: static_bearer\n  mcp_server_url: https://actsto.org/api/mcp\n  token: %s\n' "$ACT_TOKEN" \
  | ant beta:vaults:credentials create --vault-id "$VAULT_ID"
unset ACT_TOKEN
```

The token never goes in a file, a chat or Git. Replacing it later works the same way: create a new token on the card, archive the old credential, and run the block again.

### 4. Server settings (Coolify → actsto.org → Environment Variables)

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | An API key from the same Claude workspace |
| `PAPERCLIP_API_URL` | Your Paperclip URL, for example `https://paperclip.channelcast.io` |
| `PAPERCLIP_API_KEY` | A Paperclip API key for the ACT company |
| `PAPERCLIP_WEBHOOK_SECRET` | A random string of 32 or more characters (for example, `openssl rand -hex 32`) |
| `ACT_POSTAL_ADDRESS` | ACT's mailing address, which appears in every agent email footer |

Redeploy after saving.

### 5. Test one agent

1. On Ava's card, turn her **On**.
2. Type a small task, for example "Find 5 Christian schools in Mesa," and click **Run now**.
3. Check the result on the card and on the **Activity** tab. Every run shows a link to the session in the Claude Console.

### 6. Connect Paperclip

1. In Paperclip, create an **ACT** company with one agent per row above.
2. Set each Paperclip agent's adapter to HTTP (by API or company import; it isn't in the UI dropdown):

```json
{
  "adapterType": "http",
  "adapterConfig": {
    "url": "https://actsto.org/api/agents/paperclip",
    "method": "POST",
    "headers": { "Authorization": "Bearer <PAPERCLIP_WEBHOOK_SECRET>" },
    "timeoutMs": 15000
  }
}
```

3. Paste each Paperclip agent's ID into **Connections → Paperclip agent ID** on the matching ACT card.

From then on:
- Assigning an issue to Ava in Paperclip starts a run.
- The result comes back as a comment on the issue, and the issue moves to done or blocked.
- A heartbeat with no task runs her standing work.

## Changing an agent

Edit its `agent.md` and run `ant apply agents/<folder>` again. The agent gets a new version, and the next run uses it.

To let the research agents read a new site, add its host in two places:
- `environments/act-research.yaml` (`allowed_hosts`, as both `host` and `*.host`)
- each research agent's `allowed_domains`

## Costs and limits

- Each run is capped by **Spending cap per run** on the agent's card (default $3.00). A run that hits the cap stops and shows as blocked.
- A run stops after 30 minutes.
- Model: `claude-opus-5-5`.
- Each agent also has a daily cap on emails sent.
