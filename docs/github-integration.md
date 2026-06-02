# GitHub Integration

Agent of Empires talks to GitHub through a single backend client (`src/github/`).
Every call to `api.github.com` goes through it, and it never shells out to `gh`
for individual requests. This page documents how AoE finds a GitHub token, what
happens when it cannot, and what is intentionally deferred.

## How AoE finds your token

`gh` is an optional token source, never a hard dependency. AoE resolves a token
once, in this fixed order, and the first hit wins:

1. The `GITHUB_TOKEN` environment variable.
2. The `GH_TOKEN` environment variable.
3. `gh auth token`, but only when the GitHub CLI is installed and authenticated.
   AoE captures the token `gh` prints and sends it as `Authorization: Bearer
   <token>`; it does not run `gh` per request.

If you already use the GitHub CLI on your machine (the common case on a dev
laptop), steps 1 and 2 miss, step 3 returns your existing token, and everything
works with no prompt and no extra login.

Empty or whitespace-only environment variables are ignored, so an exported but
blank `GITHUB_TOKEN` falls through to `gh` rather than failing.

## When no token is available

Each failure produces its own hint, never a generic "auth required". The hint
always matches the actual cause:

| Situation | What AoE tells you |
| --- | --- |
| No env token and `gh` is not installed | Set `GITHUB_TOKEN` (or `GH_TOKEN`), or install the GitHub CLI and run `gh auth login`. |
| `gh` is installed but not authenticated | Run `gh auth login`. AoE does not tell you to install `gh`, because it is already installed. |
| `gh` returns an empty token | Re-authenticate with `gh auth login`, or set a token directly. |
| Running `gh` fails | The underlying error, plus a note that you can set `GITHUB_TOKEN` to bypass `gh`. |

## When a request fails

Once a token is resolved, request failures are also typed so the surface (a TUI
toast or a web error banner) can show the right next step:

- **401 Unauthorized**: the token is missing, invalid, or expired. Re-authenticate.
- **403 with a missing scope**: AoE names the required scope from GitHub's
  `X-Accepted-OAuth-Scopes` response header, for example `repo` or `workflow`,
  so you know exactly what to re-authorize.
- **403 or 429 rate limited**: wait for the limit to reset. Authenticating raises
  the limit, so an unauthenticated user is pointed at setting a token.
- **404 Not Found**: the resource does not exist or is not visible to your token.
- **Network unreachable**: distinguished from auth, so a GitHub outage never
  tells you to re-login.

## Tracking pull requests and CI status

When you run `aoe serve`, the daemon keeps each session's GitHub state fresh so
the dashboard can show PR and CI status without you wiring anything up.

- **Discovery.** For every session, AoE reads the worktree (or each repo in a
  multi-repo workspace), parses the `github.com` owner/repo from the `origin`
  remote, and asks GitHub for the open PRs whose head is your branch. Non-GitHub
  remotes are skipped. The discovered PR numbers are persisted on the session,
  so a restart shows the linked PR immediately instead of re-querying on every
  render.
- **Status.** For each tracked PR the daemon fetches the PR state
  (open/closed/draft/merged, mergeability) and aggregates its head commit's
  check runs into a single verdict: passing, failing, pending, or none. `skipped`
  and `neutral` checks count as passing; `cancelled`, `timed_out`, and
  `action_required` count as failing; anything not yet completed is pending. This
  live status lives only in memory and is rebuilt after a restart.

The poller is the single source of GitHub traffic and the only writer of the
tracked PR numbers; the REST handlers (`GET /api/github/status` for every
session in one call, `GET /api/sessions/{id}/github` for one) only ever read the
cache. None of this runs in the TUI yet.

### Configuring the poller

The `[github]` config section (editable in the TUI settings screen and the web
dashboard's GitHub tab, or in `config.toml`) controls it:

| Field | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch for all GitHub polling. |
| `poll_interval_secs` | `30` | Base seconds between refresh cycles; the backoff starts here. |
| `max_poll_interval_secs` | `300` | Ceiling the backoff climbs to while nothing changes. |
| `allow_unauthenticated_polling` | `false` | Poll without a token. Off by default because unauthenticated GitHub is capped at 60 requests/hour. |

The interval grows toward the maximum while PR and CI state is unchanged and
snaps back to the base the moment something changes. A rate-limited response
parks the loop until the `Retry-After` / `X-RateLimit-Reset` the response
advertised. With no token and `allow_unauthenticated_polling` off, the poller
idles rather than burning the public 60/hour budget; resolve a token (see above)
to turn it on.

## Deferred to follow-ups

This foundation deliberately stops at token resolution, the typed errors above,
and the read endpoints the update checker needs. The rest is tracked separately:

- Device-flow login as the no-`gh`, no-env-token fallback: #1678.
- GraphQL, ETag conditional caching, and rate-limit backoff in the client: #1679.
- A guided scope-elevation re-auth flow on write failures: #1680.
- GitHub Enterprise host derivation from the git remote: #1668.
- Per-row PR status chips on the session list: #676.
- A dedicated checks tab with per-check detail: #664.
- Surfacing PR/CI status in the TUI status tier: #676.
