#!/usr/bin/env node

import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { prCommand } from "./commands/pr.js";

const program = new Command();

program
  .name("clawpr")
  .description(
    "GitHub repo janitor for the OpenClaw ecosystem. Scan issues, submit clean PRs, integrate security."
  )
  .version("1.0.0");

program
  .command("scan")
  .argument("<owner/repo>", "GitHub repository (owner/repo)")
  .description("Scan open issues and PRs, classify effort, run sentinel")
  .option("--limit <n>", "Max items to fetch", "10")
  .option("--type <t>", "Filter: issue, pr, or all", "all")
  .option("--label <l>", "Filter by GitHub label")
  .option("--json", "Output JSON instead of table", false)
  .action(scanCommand);

program
  .command("pr")
  .argument("<owner/repo>", "GitHub repository (owner/repo)")
  .description("Generate and submit a PR with sentinel badge")
  .requiredOption("--branch <b>", "Branch name with commits")
  .option("--title <t>", "PR title")
  .option("--dry-run", "Preview PR without creating", false)
  .option("--body-template <p>", "Path to custom markdown template")
  .action(prCommand);

program.parse();
