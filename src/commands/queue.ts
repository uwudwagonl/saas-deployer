import type { Command } from "commander";
import { log } from "../ui/logger.js";
import { configExists, loadConfig, saveConfig, markStepCompleted } from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { isInteractive, isDryRun } from "../utils/context.js";
import { queueProvider } from "../providers/queue/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerQueueCommand(program: Command) {
  program
    .command("queue")
    .description("Set up background jobs & queue processing")
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
        interactive: isInteractive(),
        dryRun: isDryRun(),
      };

      const result = await queueProvider.setup(ctx);

      if (result.success && result.configUpdates) {
        Object.assign(config, result.configUpdates);
        await saveConfig(config);
        await markStepCompleted("queue");
      }
    });
}
