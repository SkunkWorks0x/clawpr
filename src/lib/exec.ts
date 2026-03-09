import { execSync as nodeExecSync } from "node:child_process";

const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

type ExecFn = (cmd: string, opts?: object) => string;

let execFn: ExecFn = (cmd, opts) =>
  nodeExecSync(cmd, {
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER,
    ...opts,
  }) as string;

/** Execute a shell command. */
export function exec(cmd: string, opts?: object): string {
  return execFn(cmd, opts);
}

/** Replace the exec function (for testing). */
export function setExecFn(fn: ExecFn): void {
  execFn = fn;
}

/** Restore the default exec function. */
export function resetExecFn(): void {
  execFn = (cmd, opts) =>
    nodeExecSync(cmd, {
      encoding: "utf-8",
      maxBuffer: MAX_BUFFER,
      ...opts,
    }) as string;
}
