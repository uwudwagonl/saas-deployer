import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { databaseProvider } from "../providers/db/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerDbCommand(program: Command) {
  program
    .command("db")
    .description("Set up your database provider")
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

      const result = await databaseProvider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) {
          Object.assign(config, result.configUpdates);
        }
        await saveConfig(config);
        await markStepCompleted("db");

        log.blank();
        log.header("Database Setup Complete");

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
