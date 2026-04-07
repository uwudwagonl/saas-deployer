import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(execFile);

const BIN = "node";
const CLI = "bin/saas.js";

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execAsync(BIN, [CLI, ...args], {
      cwd: process.cwd(),
      timeout: 10000,
    });
    return { stdout, stderr, code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", code: err.code ?? 1 };
  }
}

describe("CLI binary", () => {
  it("outputs version", async () => {
    const result = await runCli(["--version"]);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("outputs help text", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("CLI tool to automate SaaS deployment");
  });

  it("shows global options in help", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("--no-interactive");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--yes");
    expect(result.stdout).toContain("--verbose");
  });
});

describe("all commands are registered", () => {
  const expectedCommands = [
    "init",
    "status",
    "stripe",
    "db",
    "auth",
    "env",
    "github",
    "vercel",
    "deploy",
    "domain",
    "email",
    "monitoring",
    "add",
  ];

  for (const cmd of expectedCommands) {
    it(`"${cmd}" appears in help output`, async () => {
      const result = await runCli(["--help"]);
      expect(result.stdout).toContain(cmd);
    });
  }
});

describe("command help output", () => {
  const commands = [
    { cmd: "init", contains: ["preset", "Initialize"] },
    { cmd: "status", contains: ["status"] },
    { cmd: "stripe", contains: ["Stripe"] },
    { cmd: "db", contains: ["database"] },
    { cmd: "auth", contains: ["authentication", "Authentication"] },
    { cmd: "env", contains: ["environment", "example", "check", "list"] },
    { cmd: "github", contains: ["GitHub"] },
    { cmd: "vercel", contains: ["Vercel"] },
    { cmd: "deploy", contains: ["dry-run", "step"] },
    { cmd: "domain", contains: ["domain"] },
    { cmd: "email", contains: ["email", "Email"] },
    { cmd: "monitoring", contains: ["tracking", "analytics"] },
    { cmd: "add", contains: ["service"] },
  ];

  for (const { cmd, contains } of commands) {
    it(`"${cmd} --help" runs without error`, async () => {
      const result = await runCli([cmd, "--help"]);
      expect(result.code).toBe(0);
    });

    for (const keyword of contains) {
      it(`"${cmd} --help" mentions "${keyword}"`, async () => {
        const result = await runCli([cmd, "--help"]);
        expect(result.stdout.toLowerCase()).toContain(keyword.toLowerCase());
      });
    }
  }
});

describe("unknown command handling", () => {
  it("exits with error for unknown command", async () => {
    const result = await runCli(["nonexistent"]);
    expect(result.code).not.toBe(0);
  });
});

describe("status without config", () => {
  it("warns about missing config", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join, resolve } = await import("node:path");

    const tmpDir = await mkdtemp(join(tmpdir(), "saas-cli-test-"));
    const absCliPath = resolve(process.cwd(), CLI);

    try {
      const result = await execAsync(BIN, [absCliPath, "status"], {
        cwd: tmpDir,
        timeout: 10000,
      }).catch((e) => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
      const combined = (result.stdout + result.stderr).toLowerCase();
      // Should mention "saas init" or "config" somewhere in output
      expect(combined).toMatch(/(saas init|config)/);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
