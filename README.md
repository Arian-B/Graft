# Graft

> A private browser automation platform for engineering teams. Write a script once, deploy it to every team member's browser within 30 seconds, without publishing to the Chrome Web Store.

---

## Project Overview

Graft is a self-hosted, team-scoped browser script deployment platform. It solves a problem common to every engineering team: internal browser automations are painful to distribute and maintain. Sharing a Tampermonkey script via Slack, asking teammates to load unpacked extensions, or publishing internal tools to the Chrome Web Store all impose unnecessary overhead.

Graft eliminates this entirely. A developer writes a script in the Graft editor, clicks deploy, and the Companion extension installed in every team member's browser picks it up automatically within 30 seconds. Updates, rollbacks, and remote configuration changes propagate with the same latency. No action is required from teammates.

**Core philosophy**: The developer writes code. Graft handles the distribution. Teammates benefit without knowing anything changed.

---

## How It Works

Graft has two components that work together:

**The Platform** (this repository) is a Next.js web application where developers write scripts, manage deployments, and review team activity. It exposes a REST API that the Companion polls on a fixed interval.

**The Companion** (`/companion`) is a Chrome MV3 extension that each team member installs once. It polls the platform API every 30 seconds, receives the team's active scripts, and injects them into matching browser tabs based on URL patterns. It also reports execution analytics back to the platform.

---

## Script Lifecycle

Scripts move through an explicit review cycle before reaching team members:

```
draft  →  testing  →  pending_review  →  live
                           |
                        rejected  →  draft
```

- **draft**: Created but not running anywhere.
- **testing**: Running only on the author's linked browser. No other team member is affected.
- **pending_review**: Author has submitted for review. Awaiting admin or owner approval.
- **live**: Approved. Delivered to all team Companion instances on next poll.
- **rejected**: Returned to the author with a mandatory rejection note.

Only team owners can approve or reject. Members can write, test, and submit. This ensures no unreviewed script ever reaches a production browser.

---

## Key Features

- **30-second propagation**: Script updates reach every team browser within one poll cycle, with no action required from teammates.
- **Browser-only testing**: Developers link their browser to their Graft account once. Test deployments are scoped exclusively to that browser. Production users are unaffected during iteration.
- **Role-based approval**: `member`, `admin`, and `owner` roles with explicit permissions at every lifecycle stage.
- **Immutable version history**: Every deployment creates a new, append-only version row. No version is ever overwritten or deleted. Any version can be restored in one action.
- **Remote configuration**: Scripts can read a JSON config object that owners can edit without redeploying. Useful for changing behavior parameters without touching code.
- **Cryptographic API keys**: Team keys are generated with 32 bytes of entropy. Only a SHA-256 hash is stored. The full key is displayed once on creation.
- **Invite by GitHub username**: Team members are added by their GitHub username. If they have not yet signed up for Graft, the invite is stored and auto-accepted the moment they log in.
- **Analytics**: The Companion reports execution events (`script_fired`, `script_error`, `config_fetched`) back to the platform. Per-script and team-wide aggregated views are available.

---

## System Architecture

### Platform

- **Next.js 14 (App Router)**: Server-side rendering, API routes, and routing.
- **TypeScript**: Strict type enforcement across the entire codebase.
- **Supabase (PostgreSQL)**: Relational database with Row Level Security on all tables.
- **GitHub OAuth**: Authentication via Supabase Auth. User identity (name, username, avatar) is sourced directly from GitHub and refreshed on each login.

### Companion Extension

- **Chrome MV3**: Service worker architecture with `chrome.alarms` for reliable polling.
- **Content scripts**: Injected into matching tabs via `chrome.tabs.sendMessage` after each sync.
- **Persistent companion ID**: A stable UUID generated on install, stored in `chrome.storage.sync`. Sent with every sync request to enable developer test routing.

---

## Database Schema

Seven tables in Supabase, all behind Row Level Security:

| Table | Purpose |
|---|---|
| `auth.users` | Managed by Supabase. Populated automatically on GitHub OAuth login. |
| `teams` | Workspaces. Each team has a name, a unique slug, and an owner. |
| `team_members` | Maps users to teams with explicit roles: `owner`, `admin`, `member`. |
| `team_api_keys` | Hashed API keys used by the Companion. The plaintext key is never stored. |
| `team_invites` | Pending invites by GitHub username. Auto-accepted on first login. |
| `scripts` | The core entity. Stores metadata, status, target URLs, and remote config. |
| `script_versions` | Append-only deployment history. Each deploy adds one row. |
| `analytics_events` | Execution telemetry reported by the Companion. |
| `companion_registrations` | Links a companion ID to a Graft user for test script routing. |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier is sufficient)
- A GitHub OAuth App

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/graft.git
   cd graft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the three required values. See `.env.example` for instructions.

4. **Initialize the database**
   Execute `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables, RLS policies, indexes, and triggers. Run it once on a clean project.

5. **Configure GitHub OAuth**
   - Create a GitHub OAuth App: `github.com → Settings → Developer Settings → OAuth Apps`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - Enable GitHub as a provider in Supabase: `Authentication → Providers → GitHub`

6. **Start the development server**
   ```bash
   npm run dev
   ```
   The application is available at `http://localhost:3000`.

### Companion Extension (Local Testing)

1. Open `companion/background.js` and set `GRAFT_API_BASE` to `http://localhost:3000`.
2. Open `chrome://extensions` in Chrome.
3. Enable Developer Mode.
4. Click "Load unpacked" and select the `/companion` directory.
5. Open the extension popup, paste a team API key generated from the Graft dashboard, and click Save.

---

## API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/me` | Current user profile and team memberships |
| GET, POST | `/api/teams` | List teams or create a new team |
| GET, PUT, DELETE | `/api/teams/[id]` | Team detail, update, or delete |
| POST, DELETE | `/api/teams/[id]/members` | Add or remove team members |
| GET, POST, DELETE | `/api/teams/[id]/apikeys` | Manage team API keys |
| GET, POST, DELETE | `/api/teams/[id]/invite` | Invite by GitHub username |
| GET, POST | `/api/scripts` | List scripts or create a draft |
| GET, PUT, DELETE | `/api/scripts/[id]` | Script detail, update, or delete |
| POST | `/api/scripts/[id]/test` | Deploy to author's browser only |
| POST | `/api/scripts/[id]/submit` | Submit for admin review |
| POST | `/api/scripts/[id]/approve` | Approve and go live (admin/owner) |
| POST | `/api/scripts/[id]/reject` | Reject with a required reason (admin/owner) |
| POST | `/api/scripts/[id]/deploy` | Direct deploy, bypasses review (owner only) |
| GET | `/api/scripts/[id]/versions` | Version history |
| GET | `/api/scripts/[id]/versions/[num]` | Specific version code |
| POST | `/api/scripts/[id]/rollback` | Restore a previous version |
| GET, PUT | `/api/scripts/[id]/config` | Remote configuration |
| GET | `/api/scripts/[id]/analytics` | Per-script analytics |
| GET | `/api/analytics/summary` | Team-wide analytics |
| GET | `/api/companion/sync` | Companion heartbeat — returns active scripts |
| GET, DELETE | `/api/companion/register` | Link or unlink a browser for dev testing |
| POST | `/api/analytics` | Companion event ingestion |

---

## Roadmap

- **Staged rollouts**: Deploy to a percentage of team browsers before full release.
- **Auto-pause on error rate**: Automatically disable scripts that exceed a configured error threshold.
- **Script templates**: A library of common patterns for teams to fork and adapt.
- **Firefox support**: Porting the Companion to Firefox using WebExtensions API compatibility.
- **Webhook notifications**: Post-approval and post-rejection events sent to a configurable endpoint.
- **Audit log**: Comprehensive event trail for team owners covering all deployment and membership actions.

---

## Security Model

- All database tables are protected by Row Level Security. A logged-in user can only read and write data belonging to their teams.
- The Companion authenticates exclusively via team API keys, not user credentials. API keys are never stored in plaintext.
- The service role key used for Companion sync and analytics ingestion is server-side only and never returned to the browser.
- Test scripts are routed by `companion_id`. Only the registered browser receives them. No other team member sees a script until it is approved and set to live.
