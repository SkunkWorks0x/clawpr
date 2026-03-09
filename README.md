# ClawPR

GitHub repo janitor for the OpenClaw ecosystem

## Install

```bash
npm install -g clawpr
```

## Quick Start

```bash
clawpr scan openclaw/openclaw
clawpr scan openclaw/openclaw --json
clawpr pr openclaw/openclaw --branch fix/typos --dry-run
```

## Commands

### `clawpr scan <owner/repo>`

Fetch open issues and PRs, classify effort, run sentinel if available, output a ranked table.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit <n>` | number | 10 | Max items to fetch |
| `--type <t>` | `issue`, `pr`, `all` | `all` | Filter item type |
| `--label <l>` | string | none | Filter by GitHub label |
| `--json` | boolean | false | Output JSON instead of table |

**Examples:**

```bash
clawpr scan openclaw/openclaw --limit 20 --type issue
clawpr scan openclaw/openclaw --label bug --json
```

### `clawpr pr <owner/repo> --branch <branch>`

Generate and submit a PR with auto-formatted body including a Sentinel security badge.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--branch <b>` | string | required | Branch name with commits |
| `--title <t>` | string | `ClawPR: Fixes for {repo}` | PR title |
| `--dry-run` | boolean | false | Preview PR without creating |
| `--body-template <p>` | string | none | Path to custom markdown template |

**Examples:**

```bash
clawpr pr openclaw/openclaw --branch fix/typos --dry-run
clawpr pr openclaw/openclaw --branch fix/typos --title "Fix typos in docs"
```

## Sentinel Integration

ClawPR optionally integrates with [ClawStack Sentinel](https://github.com/SkunkWorks0x/clawstack-sentinel) for security scanning. If Sentinel is installed (`npx clawstack-sentinel`), ClawPR will:

- Run a security scan on the target repo during `clawpr scan`
- Display a Sentinel score and finding counts in the output table
- Include a security badge and finding summary in PRs created with `clawpr pr`

If Sentinel is not available, ClawPR continues without security data.

## Part of ClawStack

ClawPR is part of the ClawStack security-focused product suite for the OpenClaw AI agent ecosystem:

- [ClawStack Sentinel](https://github.com/SkunkWorks0x/clawstack-sentinel) — Security scanner for OpenClaw agent workspaces
- [TotalReclaw](https://github.com/SkunkWorks0x/totalreclaw) — Agent activity monitor
- [ClawPilled.me](https://clawpilled.me) — Community hub

## License

MIT
