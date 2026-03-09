const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
export function success(msg) {
    return `${GREEN}✅ ${msg}${RESET}`;
}
export function warn(msg) {
    return `${YELLOW}⚠ ${msg}${RESET}`;
}
export function error(msg) {
    return `${RED}🔴 ${msg}${RESET}`;
}
export function info(msg) {
    return `${CYAN}ℹ ${msg}${RESET}`;
}
export function box(title, lines, width) {
    const w = width ?? 48;
    const innerWidth = w - 2;
    const pad = (text) => {
        const visibleLen = text.replace(/\x1b\[[0-9;]*m/g, '').length;
        const padding = Math.max(0, innerWidth - visibleLen);
        return `║ ${text}${' '.repeat(padding > 0 ? padding - 1 : 0)}║`;
    };
    const top = `╔${'═'.repeat(innerWidth)}╗`;
    const mid = `╠${'═'.repeat(innerWidth)}╣`;
    const bot = `╚${'═'.repeat(innerWidth)}╝`;
    const titlePadded = pad(`${BOLD}${title}${RESET}`);
    const bodyLines = lines.map(l => pad(l));
    return [top, titlePadded, mid, ...bodyLines, bot].join('\n');
}
export function sectionHeader(title, width) {
    const w = width ?? 50;
    const prefix = `── ${title} `;
    const remaining = Math.max(0, w - prefix.length);
    return `${BOLD}${prefix}${'─'.repeat(remaining)}${RESET}`;
}
export function severityColor(severity) {
    switch (severity) {
        case 'critical': return RED;
        case 'warning': return YELLOW;
        case 'info': return CYAN;
    }
}
//# sourceMappingURL=logger.js.map