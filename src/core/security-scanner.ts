import { Severity, SecurityFinding, SecurityResult, PRFile } from './types.js';

interface SecurityRule {
  id: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  fileFilter?: RegExp;
}

const SECURITY_RULES: SecurityRule[] = [
  // ── Credential Exposure ──
  {
    id: 'CRED-001',
    severity: 'critical',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9+/=_\-]{16,}['"`]/gi,
    message: 'Hardcoded credential or API key detected',
  },
  {
    id: 'CRED-002',
    severity: 'critical',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    message: 'GitHub personal access token detected',
  },
  {
    id: 'CRED-003',
    severity: 'critical',
    pattern: /(?:sk-|pk_live_|pk_test_|sk_live_|sk_test_|rk_live_|rk_test_)[A-Za-z0-9]{20,}/g,
    message: 'API key detected (OpenAI/Stripe pattern)',
  },
  {
    id: 'CRED-004',
    severity: 'critical',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    message: 'Private key detected in diff',
  },
  {
    id: 'CRED-005',
    severity: 'warning',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi,
    message: 'Possible hardcoded password',
  },

  // ── Dangerous Patterns ──
  {
    id: 'DANGER-001',
    severity: 'critical',
    pattern: /eval\s*\(\s*(?:request|req|body|params|query|input|data|args)/gi,
    message: 'Eval with user-controlled input detected',
  },
  {
    id: 'DANGER-002',
    severity: 'warning',
    pattern: /child_process|exec\s*\(|execSync\s*\(|spawn\s*\(/g,
    message: 'Shell execution detected — verify input is sanitized',
  },
  {
    id: 'DANGER-003',
    severity: 'warning',
    pattern: /innerHTML\s*=|outerHTML\s*=|document\.write\s*\(/g,
    message: 'Direct DOM manipulation — potential XSS vector',
  },
  {
    id: 'DANGER-004',
    severity: 'warning',
    pattern: /fetch\s*\(\s*['"`]https?:\/\/(?!github\.com|api\.github\.com)/gi,
    message: 'External HTTP request to non-GitHub domain in PR',
  },
  {
    id: 'DANGER-005',
    severity: 'critical',
    pattern: /process\.env\b.*(?:console\.log|print|echo|write|send|res\.json|res\.send)/gi,
    message: 'Environment variable potentially logged or exposed',
  },

  // ── Suspicious Dependencies ──
  {
    id: 'DEPS-001',
    severity: 'warning',
    pattern: /["+]\s*(?:crypto-?miner|coinhive|cryptonight|monero-?miner)/gi,
    message: 'Cryptocurrency miner dependency detected',
    fileFilter: /package\.json$/,
  },
  {
    id: 'DEPS-002',
    severity: 'info',
    pattern: /["+]\s*(?:colors|faker|event-stream|flatmap-stream|ua-parser-js)\s*[":]/gi,
    message: 'Previously compromised npm package detected — verify version',
    fileFilter: /package\.json$/,
  },

  // ── Additional Credential Patterns ──
  {
    id: 'CRED-006',
    severity: 'critical',
    pattern: /AKIA[0-9A-Z]{16}/g,
    message: 'AWS Access Key ID detected',
  },
  {
    id: 'CRED-007',
    severity: 'warning',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/g,
    message: 'Possible JWT token detected — verify not a secret',
  },
  {
    id: 'CRED-008',
    severity: 'warning',
    pattern: /(?:DOCKER_PASSWORD|DOCKER_TOKEN|REGISTRY_PASSWORD)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi,
    message: 'Docker/registry credential detected',
    fileFilter: /\.ya?ml$|\.env/,
  },
  {
    id: 'CRED-009',
    severity: 'critical',
    pattern: /(?:mongodb(?:\+srv)?|postgres|mysql|redis):\/\/[^\s'"]+:[^\s'"]+@/gi,
    message: 'Database connection string with embedded credentials',
  },

  // ── Config/Permission Issues ──
  {
    id: 'CONFIG-001',
    severity: 'warning',
    pattern: /permissions:\s*write-all|permissions:\s*\{\}/g,
    message: 'Overly broad GitHub Action permissions',
    fileFilter: /\.ya?ml$/,
  },
  {
    id: 'CONFIG-002',
    severity: 'info',
    pattern: /\.env(?:\.local|\.prod|\.production|\.staging)?$/gm,
    message: 'Environment file reference — ensure not committed',
  },
  {
    id: 'CONFIG-003',
    severity: 'warning',
    pattern: /disable.*(?:ssl|tls|certificate)|rejectUnauthorized\s*:\s*false/gi,
    message: 'SSL/TLS verification disabled',
  },
];

function redactContent(matched: string): string {
  if (matched.length <= 8) return '****';
  return matched.slice(0, 4) + '*'.repeat(matched.length - 8) + matched.slice(-4);
}

export function scanSecurity(
  addedLines: Array<{ file: string; line: number; content: string }>,
  files: PRFile[]
): SecurityResult {
  const findings: SecurityFinding[] = [];

  // Build set of files to skip (binary files)
  const binaryFiles = new Set<string>();
  for (const file of files) {
    if (file.patch && (file.patch.includes('Binary files') || file.patch.includes('\0'))) {
      binaryFiles.add(file.filename);
    }
  }

  for (const addedLine of addedLines) {
    if (binaryFiles.has(addedLine.file)) continue;

    for (const rule of SECURITY_RULES) {
      if (rule.fileFilter && !rule.fileFilter.test(addedLine.file)) continue;

      // Reset regex lastIndex for global patterns
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(addedLine.content);
      if (match) {
        findings.push({
          severity: rule.severity,
          rule: rule.id,
          message: rule.message,
          file: addedLine.file,
          line: addedLine.line,
          matchedContent: redactContent(match[0]),
        });
      }
    }
  }

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const finding of findings) {
    switch (finding.severity) {
      case 'critical': criticalCount++; break;
      case 'warning': warningCount++; break;
      case 'info': infoCount++; break;
    }
  }

  const score = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10) - (infoCount * 2));

  return { score, findings, criticalCount, warningCount, infoCount };
}
