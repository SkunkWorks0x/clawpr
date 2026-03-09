# 🔍 ClawPR

**Rule-based PR reviewer for the OpenClaw ecosystem**

ClawPR automatically reviews pull requests with zero LLM calls — all analysis runs locally using pattern matching, TF-IDF similarity, and configurable heuristics.

## Features

- **PR Summaries** — Scope classification, file categorization, and plain-English descriptions
- **Duplicate Detection** — TF-IDF + Jaccard similarity against open PRs and issues with file overlap bonuses
- **Security Scanning** — 20+ regex-based rules detecting credentials, dangerous patterns, and suspicious dependencies (Sentinel-style)
- **Vision Alignment** — Scores PRs against your project's VISION.md or README.md for governance alignment

## Quick Start — GitHub Action

Add this workflow to your repository at `.github/workflows/clawpr.yml`:

```yaml
name: ClawPR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run ClawPR
        uses: SkunkWorks0x/clawpr@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Quick Start — CLI

```bash
npx clawpr review --owner <owner> --repo <repo> --pr <number> --token <token>
```

## Configuration

| Option | CLI Flag | Action Input | Default | Description |
|--------|----------|-------------|---------|-------------|
| GitHub Token | `--token` | `github-token` | — | GitHub PAT (or `GITHUB_TOKEN` env var) |
| Owner | `--owner` | auto-detected | — | Repository owner |
| Repo | `--repo` | auto-detected | — | Repository name |
| PR Number | `--pr` | auto-detected | — | Pull request number |
| Post Comment | `--post-comment` | always true | `false` | Post results as PR comment |
| Dry Run | `--dry-run` | — | `false` | Run analysis without posting |
| Duplicate Threshold | `--threshold` | `duplicate-threshold` | `0.4` | Minimum similarity score (0.0-1.0) |
| Security Fail Threshold | `--security-fail-threshold` | `security-fail-threshold` | `50` | Score below which review fails (0-100) |
| Max Diff Size | `--max-diff` | `max-diff-bytes` | `102400` | Max diff size in bytes |
| API URL | `--github-api-url` | `github-api-url` | `https://api.github.com` | GitHub Enterprise API URL |

## Scoring

### Security Score (0-100)
Starts at 100. Deductions: -20 per critical finding, -10 per warning, -2 per info. Score below `security-fail-threshold` triggers a fail verdict.

### Vision Alignment (0-100)
Based on TF-IDF similarity between your VISION.md/README.md and the PR's intent. Bonuses for test coverage (+10) and vision keyword references (+10). Penalties for doc-only changes without descriptions.

### Duplicate Detection
Combined similarity using 60% TF-IDF cosine + 40% Jaccard on tokenized text. File overlap above 30% adds a +0.15 bonus. Matches above the threshold (default 0.4) are flagged.

### Verdict
- **PASS** (exit 0) — No issues found
- **WARN** (exit 1) — Warnings present, duplicates found, or low vision score
- **FAIL** (exit 2) — Critical security findings, security score below threshold, or vision score below 30

## Integration with ClawStack Sentinel

ClawPR uses the same security pattern matching approach as [ClawStack Sentinel](https://github.com/SkunkWorks0x/clawstack-sentinel), applied to PR diffs. The security scanner rules are compatible and can be extended.

## Design

ClawPR is 100% rule-based — no LLM calls, no external AI APIs. All analysis runs locally using pattern matching, TF-IDF similarity, and configurable heuristics.

---

Part of the [ClawStack](https://github.com/SkunkWorks0x/clawstack) ecosystem | [clawpilled.me](https://clawpilled.me)
