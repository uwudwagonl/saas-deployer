import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { vercelProvider } from "../providers/vercel/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerVercelCommand(program: Command) {
  program
    .command("vercel")
    .description("Deploy to Vercel with env vars and custom domain")
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

      const result = await vercelProvider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) {
          Object.assign(config, result.configUpdates);
        }
        await saveConfig(config);
        await markStepCompleted("vercel");

        log.blank();
        log.header("Vercel Setup Complete");
        if (config.vercel?.projectName) {
          log.info(`Project: ${config.vercel.projectName}`);
        }
        if (config.vercel?.domain) {
          log.info(`Domain: ${config.vercel.domain}`);
        }
      }
    });
}
