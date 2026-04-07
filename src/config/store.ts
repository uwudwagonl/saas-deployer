import { saasConfigSchema, type SaasConfig } from "./schema.js";
import { migrateConfig } from "./migrate.js";
import { readJson, writeJson, fileExists, projectPath } from "../utils/fs.js";

const CONFIG_FILE = "saas.config.json";

export function configPath(): string {
  return projectPath(CONFIG_FILE);
}

export async function configExists(): Promise<boolean> {
  return fileExists(configPath());
}

export async function loadConfig(): Promise<SaasConfig> {
  const raw = await readJson(configPath());
  const migrated = migrateConfig(raw);
  return saasConfigSchema.parse(migrated);
}

export async function saveConfig(config: SaasConfig): Promise<void> {
  await writeJson(configPath(), config);
}

export async function createDefaultConfig(
  name: string,
  framework: SaasConfig["project"]["framework"]
): Promise<SaasConfig> {
  const config: SaasConfig = {
    version: 2,
    project: { name, framework },
    completedSteps: [],
  };
  await saveConfig(config);
  return config;
}

export async function markStepCompleted(step: string): Promise<void> {
  const config = await loadConfig();
  if (!config.completedSteps.includes(step)) {
    config.completedSteps.push(step);
    await saveConfig(config);
  }
}

export async function isStepCompleted(step: string): Promise<boolean> {
  const config = await loadConfig();
  return config.completedSteps.includes(step);
}
