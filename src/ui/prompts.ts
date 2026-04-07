import {
  input as rawInput,
  confirm as rawConfirm,
  select as rawSelect,
  checkbox as rawCheckbox,
  password as rawPassword,
} from "@inquirer/prompts";
import { isInteractive } from "../utils/context.js";

type InputOptions = Parameters<typeof rawInput>[0] & { envVar?: string };
type ConfirmOptions = Parameters<typeof rawConfirm>[0] & { envVar?: string };
type SelectOptions = Parameters<typeof rawSelect>[0] & { envVar?: string };
type CheckboxOptions = Parameters<typeof rawCheckbox>[0] & { envVar?: string };
type PasswordOptions = Parameters<typeof rawPassword>[0] & { envVar?: string };

function envFallback(envVar?: string): string | undefined {
  if (envVar && process.env[envVar]) return process.env[envVar];
  return undefined;
}

export async function input(opts: InputOptions): Promise<string> {
  const fallback = envFallback(opts.envVar);
  if (fallback) return fallback;
  if (!isInteractive()) {
    if (opts.default !== undefined) return String(opts.default);
    throw new Error(
      `Non-interactive mode: missing value for "${opts.message}"${opts.envVar ? `. Set ${opts.envVar}` : ""}`
    );
  }
  return rawInput(opts);
}

export async function confirm(opts: ConfirmOptions): Promise<boolean> {
  const fallback = envFallback(opts.envVar);
  if (fallback !== undefined) return fallback === "true" || fallback === "1";
  if (!isInteractive()) return opts.default ?? true;
  return rawConfirm(opts);
}

export async function select<T>(opts: SelectOptions): Promise<T> {
  const fallback = envFallback(opts.envVar);
  if (fallback !== undefined) return fallback as T;
  if (!isInteractive()) {
    if (opts.default !== undefined) return opts.default as T;
    throw new Error(
      `Non-interactive mode: missing selection for "${opts.message}"${opts.envVar ? `. Set ${opts.envVar}` : ""}`
    );
  }
  return rawSelect(opts) as Promise<T>;
}

export async function checkbox<T>(opts: CheckboxOptions): Promise<T[]> {
  const fallback = envFallback(opts.envVar);
  if (fallback !== undefined) return fallback.split(",") as T[];
  if (!isInteractive()) return [] as T[];
  return rawCheckbox(opts) as Promise<T[]>;
}

export async function password(opts: PasswordOptions): Promise<string> {
  const fallback = envFallback(opts.envVar);
  if (fallback) return fallback;
  if (!isInteractive()) {
    throw new Error(
      `Non-interactive mode: missing password for "${opts.message}"${opts.envVar ? `. Set ${opts.envVar}` : ""}`
    );
  }
  return rawPassword(opts);
}
