import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { monitoringProvider } from "../providers/monitoring/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerMonitoringCommand(program: Command) {
  program
    .command("monitoring")
    .description("Set up error tracking and analytics")
    .action(async () => {
      if (!(await configExists())) {
        log.error('No saas.config.json found. Run "saas init" first.');
        process.exit(1);
      }

      const config = await loadConfig();
      const ctx: ProviderContext = {
        config,
        credential: getCredential,
        setCredential,
        interactive: true,
        dryRun: false,
      };

      const result = await monitoringProvider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) Object.assign(config, result.configUpdates);
        await saveConfig(config);
        await markStepCompleted("monitoring");

        log.blank();
        log.header("Monitoring Setup Complete");
        if (result.envVars) {
          log.info("Environment variables:");
          for (const key of Object.keys(result.envVars)) log.dim(`  ${key}`);
        }
        log.blank();
        log.success('Run "saas env" to generate your .env.local file');
      }
    });
}
