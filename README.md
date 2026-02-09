# @agekey/mcp-server

AgeKey MCP Server - Manage AgeKey applications directly from your AI IDE.

## Features

- 🔐 **Clerk OAuth Authentication** — Seamless login via browser
- 🏢 **Multi-Organization Support** — Access all your organizations
- 📱 **Application Management** — Create, list, and manage apps
- 🔑 **Credentials** — Get and rotate test/live credentials
- 🔗 **Redirect URIs** — Add and remove callback URLs
- 🛡️ **RBAC** — Role-based access control (Member → test, Admin → live)
- 🔧 **Utilities** — JWT decoder, error explainer, code samples

## Installation

### Cursor IDE

Add to your MCP config (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "agekey": {
      "command": "npx",
      "args": ["-y", "@agekey/mcp-server"]
    }
  }
}
```

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agekey": {
      "command": "npx",
      "args": ["-y", "@agekey/mcp-server"]
    }
  }
}
```

## Authentication

On first use, the MCP server will:

1. Open your browser to the AgeKey login page
2. You authenticate with Clerk (existing AgeKey account)
3. Token is stored locally in `~/.agekey/session.json`

No manual token management needed!

The server connects to the production AgeKey Developer Portal by default. Environment configuration (staging, dev, local) is for internal use only and is not documented here.

## Available Tools

### Organizations

| Tool | Description |
|------|-------------|
| `list_organizations` | List all organizations you have access to |

### Applications

| Tool | Description |
|------|-------------|
| `list_applications` | List apps in an organization |
| `get_application` | Get app details |
| `create_application` | Create a new app (Member+) |

### Credentials

| Tool | Description |
|------|-------------|
| `get_credentials` | Get test or live credentials |
| `rotate_credentials` | Rotate credentials (test: Member+, live: Admin+ with confirmation) |

### Redirect URIs

| Tool | Description |
|------|-------------|
| `add_redirect_uri` | Add a callback URI |
| `remove_redirect_uri` | Remove a callback URI |

### Utilities

| Tool | Description |
|------|-------------|
| `decode_jwt` | Decode and explain an AgeKey JWT |
| `explain_error` | Get help for OIDC error codes |
| `get_code_sample` | Get integration code in TypeScript/Python/Go/Java |

## RBAC Permissions

| Role | Test Mode | Live Mode |
|------|-----------|-----------|
| Viewer | Read only | Read only |
| Member | Full access | Read only |
| Admin | Full access | Full access ⚠️ |
| Owner | Full access | Full access ⚠️ |

⚠️ Live mode operations require explicit confirmation phrases.

## Example Usage

```
You: "List my AgeKey organizations"

Claude: You have access to 2 organizations:
1. Acme Corp (Owner) - 3 applications
2. Side Project (Admin) - 1 application

You: "Create a new app called 'My Game' in Acme Corp"

Claude: ✅ Created application "My Game"

Test Credentials:
- App ID: ak_test_abc123...
- Secret: sk_test_xyz789... ⚠️ Save this!

Next steps:
1. Add a redirect URI: http://localhost:3000/callback
2. Try it in the sandbox

You: "Rotate live credentials for My Game"

Claude: ⚠️ WARNING: This will rotate LIVE credentials!

To proceed, confirm: "ROTATE LIVE CREDENTIALS"

You: "ROTATE LIVE CREDENTIALS"

Claude: ✅ Live credentials rotated
🚨 Update your production environment NOW!
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run (connects to production portal)
node dist/index.js
```

## License

MIT
