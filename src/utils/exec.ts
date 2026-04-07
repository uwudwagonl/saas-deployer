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
  options?: { cwd?: string; stdin?: string }
): Promise<ExecResult> {
  if (options?.stdin) {
    return runWithStdin(command, args, options.stdin, options.cwd);
  }
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: options?.cwd ?? process.cwd(),
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

function runWithStdin(
  command: string,
  args: string[],
  input: string,
  cwd?: string
): Promise<ExecResult> {
  const { spawn } = require("node:child_process") as typeof import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: cwd ?? process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(Object.assign(new Error(`Exit code ${code}`), { stdout, stderr }));
    });
    child.stdin.end(input);
  });
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    await execFileAsync(cmd, [command], { shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
}
