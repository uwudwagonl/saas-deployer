import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }
}

export async function writeJson(
  filePath: string,
  data: unknown
): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export function projectPath(...segments: string[]): string {
  return join(process.cwd(), ...segments);
}
