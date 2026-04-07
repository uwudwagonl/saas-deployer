import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ensureDir, fileExists, projectPath } from "../utils/fs.js";
import { log } from "../ui/logger.js";
import { confirm } from "../ui/prompts.js";

export interface TemplateContext {
  projectName: string;
  framework: string;
  [key: string]: string | boolean | undefined;
}

export function renderTemplate(
  template: string,
  ctx: TemplateContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = ctx[key];
    if (value === undefined || value === false) return "";
    if (value === true) return "true";
    return String(value);
  });
}

export async function scaffoldFile(
  relativePath: string,
  content: string,
  options?: { overwrite?: boolean }
): Promise<boolean> {
  const fullPath = projectPath(relativePath);

  if (await fileExists(fullPath)) {
    if (!options?.overwrite) {
      const overwrite = await confirm({
        message: `${relativePath} already exists. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        log.dim(`  Skipped ${relativePath}`);
        return false;
      }
    }
  }

  await ensureDir(dirname(fullPath));
  await writeFile(fullPath, content, "utf-8");
  log.success(`Created ${relativePath}`);
  return true;
}
