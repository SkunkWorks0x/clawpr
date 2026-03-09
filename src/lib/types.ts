export interface GHIssue {
  number: number;
  title: string;
  labels: string[];
  state: string;
  created_at: string;
  body: string;
}

export interface GHPullRequest {
  number: number;
  title: string;
  labels: string[];
  state: string;
  created_at: string;
  body: string;
  diff_url: string;
}

export type ItemType = "issue" | "pr";

export type EffortLevel = "low" | "medium" | "high";

export interface ClassifiedItem {
  number: number;
  type: ItemType;
  title: string;
  effort: EffortLevel;
  security: boolean;
  labels: string[];
  url: string;
}

export interface SentinelFinding {
  code: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

export interface SentinelResult {
  score: number | null;
  findings: SentinelFinding[];
  critical: number;
  warning: number;
  info: number;
}

export interface ScanResult {
  repo: string;
  items: ClassifiedItem[];
  sentinel: SentinelResult;
  scanned: number;
  total_open: number;
}
