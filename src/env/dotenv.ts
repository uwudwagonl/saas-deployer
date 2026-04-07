import { readFile } from "node:fs/promises";
import { fileExists } from "../utils/fs.js";

export function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export async function readDotEnvFile(
  filePath: string
): Promise<Record<string, string> | null> {
  if (!(await fileExists(filePath))) return null;
  const content = await readFile(filePath, "utf-8");
  return parseDotEnv(content);
}

export interface EnvDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}

export function diffEnv(
  local: Record<string, string>,
  remote: Record<string, string>
): EnvDiff {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const diff: EnvDiff = {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };

  for (const key of allKeys) {
    if (!(key in remote)) {
      diff.added.push(key);
    } else if (!(key in local)) {
      diff.removed.push(key);
    } else if (local[key] !== remote[key]) {
      diff.changed.push(key);
    } else {
      diff.unchanged.push(key);
    }
  }

  return diff;
}
