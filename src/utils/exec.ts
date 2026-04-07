import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function run(
  command: string,
  args: string[] = [],
  options?: { cwd?: string }
): Promise<ExecResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options?.cwd ?? process.cwd(),
    shell: true,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    await run(process.platform === "win32" ? "where" : "which", [command]);
    return true;
  } catch {
    return false;
  }
}
