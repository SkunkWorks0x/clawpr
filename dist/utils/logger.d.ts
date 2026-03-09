export declare function success(msg: string): string;
export declare function warn(msg: string): string;
export declare function error(msg: string): string;
export declare function info(msg: string): string;
export declare function box(title: string, lines: string[], width?: number): string;
export declare function sectionHeader(title: string, width?: number): string;
export declare function severityColor(severity: 'critical' | 'warning' | 'info'): string;
