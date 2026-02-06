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
- 🌍 **Multi-Environment** — Local, staging, and production support

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

## Environment Configuration

The MCP server supports multiple environments for development and testing.

### Quick Reference

| Environment | How to Set | Portal URL |
|-------------|------------|------------|
| **Production** | Default (no config needed) | `https://portal.agekey.org` |
| **Staging** | `AGEKEY_ENV=staging` | `https://portal.staging.agekey.org` |
| **Dev** | `AGEKEY_ENV=dev` | `https://portal.dev.agekey.org` |
| **Local** | `AGEKEY_ENV=local` | `http://localhost:3005` |
| **Custom** | `AGEKEY_PORTAL_URL=<url>` | Your custom URL |

### Using with Local Development

To test against a local AgeKey Developer Portal:

**1. Cursor IDE (`.cursor/mcp.json`):**

```json
{
  "mcpServers": {
    "agekey": {
      "command": "npx",
      "args": ["-y", "@agekey/mcp-server"],
      "env": {
        "AGEKEY_ENV": "local"
      }
    }
  }
}
```

**2. Or run locally with environment:**

```bash
# Using preset (defaults to localhost:3005)
AGEKEY_ENV=local node dist/index.js

# Override port if your portal runs on a different port
AGEKEY_ENV=local AGEKEY_PORTAL_URL=http://localhost:3001 node dist/index.js
```

### Overriding Preset URLs

You can always override the portal URL while keeping the environment preset:

```bash
# Use local preset but different port
AGEKEY_ENV=local AGEKEY_PORTAL_URL=http://localhost:4000 npx @agekey/mcp-server

# Use staging but point to a feature branch deployment
AGEKEY_ENV=staging AGEKEY_PORTAL_URL=https://feature-branch.agekey.org npx @agekey/mcp-server
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGEKEY_ENV` | `production` | Environment preset: `local`, `dev`, `staging`, `production` |
| `AGEKEY_PORTAL_URL` | (from preset) | Custom portal URL (overrides preset) |

### Environment Presets

| Preset | Portal URL |
|--------|------------|
| `production` | `https://portal.agekey.org` |
| `staging` | `https://portal.staging.agekey.org` |
| `dev` | `https://portal.dev.agekey.org` |
| `local` | `http://localhost:3005` |

> **Note:** The AgeKey verification API URLs (test/live) are returned by the portal with credentials—the MCP server doesn't need to know about them directly.

### Startup Feedback

When running in non-production environments, the MCP server logs the active configuration:

```
🔧 AgeKey MCP Server Configuration
   Environment: LOCAL
   Portal URL:  http://localhost:3001
   API URL:     http://localhost:3001/api

   ⚠️  Running against LOCAL instance
   Make sure the dev portal is running on http://localhost:3001
```

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

# Run locally against local portal
AGEKEY_ENV=local node dist/index.js

# Run locally against production
node dist/index.js
```

### Testing Different Environments

```bash
# Local development (portal on localhost:3001)
AGEKEY_ENV=local pnpm start

# Staging
AGEKEY_ENV=staging pnpm start

# Custom endpoint
AGEKEY_PORTAL_URL=https://my-custom-portal.com pnpm start

# Production (default)
pnpm start
```

## License

MIT
