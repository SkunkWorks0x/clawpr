import type { ClassifiedItem, SentinelResult } from "./types.js";

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function scoreColor(score: number): string {
  if (score < 50) return RED;
  if (score < 80) return YELLOW;
  return GREEN;
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

export function formatTable(
  repo: string,
  items: ClassifiedItem[],
  sentinel: SentinelResult,
  scanned: number,
  totalOpen: number
): string {
  const sep = "\u2501".repeat(55);
  const lines: string[] = [];

  lines.push(`${BOLD}ClawPR Scan: ${repo}${RESET}`);
  lines.push(sep);
  lines.push(
    ` ${pad("#", 6)}${pad("Type", 8)}${pad("Title", 31)}${pad("Effort", 9)}Sec`
  );
  lines.push(sep);

  for (const item of items) {
    const sec = item.security ? `${RED}\u26A0\uFE0F${RESET}` : "-";
    const title =
      item.title.length > 29 ? item.title.slice(0, 28) + "\u2026" : item.title;
    lines.push(
      ` ${pad(String(item.number), 6)}${pad(item.type, 8)}${pad(title, 31)}${pad(item.effort, 9)}${sec}`
    );
  }

  lines.push(sep);

  if (sentinel.score !== null) {
    const color = scoreColor(sentinel.score);
    lines.push(
      `${color}Sentinel Score: ${sentinel.score}/100 (${sentinel.critical} critical, ${sentinel.high} high, ${sentinel.medium} medium)${RESET}`
    );
  }

  lines.push(`Items scanned: ${scanned} of ${totalOpen} open`);

  return lines.join("\n");
}
