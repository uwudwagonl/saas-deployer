import { log } from "../ui/logger.js";
import { topologicalSort } from "./resolver.js";
import {
  loadConfig,
  saveConfig,
  markStepCompleted,
  isStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import type { Provider, ProviderContext, ManualStep } from "../providers/types.js";

import { stripeProvider } from "../providers/stripe/index.js";
import { databaseProvider } from "../providers/db/index.js";
import { authProvider } from "../providers/auth/index.js";
import { githubProvider } from "../providers/github/index.js";
import { vercelProvider } from "../providers/vercel/index.js";
import { emailProvider } from "../providers/email/index.js";
import { monitoringProvider } from "../providers/monitoring/index.js";
import { queueProvider } from "../providers/queue/index.js";
import { storageProvider } from "../providers/storage/index.js";

const ALL_PROVIDERS: Provider[] = [
  databaseProvider,
  authProvider,
  stripeProvider,
  emailProvider,
  queueProvider,
  storageProvider,
  monitoringProvider,
  githubProvider,
  vercelProvider,
];

export async function runDeploy(
  selectedSteps?: string[],
  options?: { dryRun?: boolean }
): Promise<void> {
  const config = await loadConfig();
  const allManualSteps: ManualStep[] = [];

  // Determine which providers to run
  const providers = selectedSteps
    ? ALL_PROVIDERS.filter((p) => selectedSteps.includes(p.name))
    : ALL_PROVIDERS;

  const providerNames = providers.map((p) => p.name);

  // Build dependency edges
  const edges = new Map<string, string[]>();
  for (const p of providers) {
    edges.set(
      p.name,
      p.dependsOn.filter((d) => providerNames.includes(d))
    );
  }

  // Sort
  const sorted = topologicalSort(providerNames, edges);

  if (options?.dryRun) {
    log.header("Deploy — Dry Run");
    log.info("Would execute these steps in order:");
    for (let i = 0; i < sorted.length; i++) {
      const name = sorted[i];
      const completed = await isStepCompleted(name);
      const status = completed ? " (already completed — would skip)" : "";
      log.step(i + 1, sorted.length, `${name}${status}`);
    }
    return;
  }

  log.header("SaaS Deploy");
  log.info(`Running ${sorted.length} step(s)...`);
  log.blank();

  for (let i = 0; i < sorted.length; i++) {
    const name = sorted[i];
    const provider = providers.find((p) => p.name === name)!;

    // Skip completed steps
    if (await isStepCompleted(name)) {
      log.step(
        i + 1,
        sorted.length,
        `${provider.displayName} — already completed, skipping`
      );
      continue;
    }

    log.step(i + 1, sorted.length, `Setting up ${provider.displayName}...`);

    const currentConfig = await loadConfig();
    const ctx: ProviderContext = {
      config: currentConfig,
      credential: getCredential,
      setCredential,
      interactive: true,
      dryRun: false,
    };

    try {
      // Preflight
      const preflight = await provider.preflight(ctx);
      for (const w of preflight.warnings) {
        log.warn(w);
      }

      // Setup
      const result = await provider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) {
          const updatedConfig = await loadConfig();
          Object.assign(updatedConfig, result.configUpdates);
          await saveConfig(updatedConfig);
        }
        await markStepCompleted(name);

        if (result.manualSteps) {
          allManualSteps.push(...result.manualSteps);
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      log.error(`${provider.displayName} failed: ${message}`);
      log.warn("Progress saved. Re-run `saas deploy` to continue.");
      break;
    }

    log.blank();
  }

  // Summary
  if (allManualSteps.length > 0) {
    log.header("Manual Steps Remaining");
    for (const step of allManualSteps) {
      log.dim(`  - ${step.description}`);
      if (step.url) {
        log.link(step.url, step.urlLabel);
      }
    }
  }

  log.blank();
  log.success("Deploy complete! Run `saas status` to see your setup.");
}
