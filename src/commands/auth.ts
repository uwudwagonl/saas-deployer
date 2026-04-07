import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { authProvider } from "../providers/auth/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerAuthCommand(program: Command) {
  program
    .command("auth")
    .description("Set up authentication provider")
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

      const preflight = await authProvider.preflight(ctx);
      for (const w of preflight.warnings) {
        log.warn(w);
      }

      const result = await authProvider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) {
          Object.assign(config, result.configUpdates);
        }
        await saveConfig(config);
        await markStepCompleted("auth");

        log.blank();
        log.header("Auth Setup Complete");

        if (result.envVars) {
          log.info("Environment variables configured:");
          for (const key of Object.keys(result.envVars)) {
            log.dim(`  ${key}`);
          }
        }

        log.blank();
        log.success('Run "saas env" to generate your .env.local file');
      }
    });
}
