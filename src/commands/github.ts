import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { githubProvider } from "../providers/github/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerGithubCommand(program: Command) {
  program
    .command("github")
    .description("Set up GitHub repo, secrets, and workflows")
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

      const result = await githubProvider.setup(ctx);

      if (result.success) {
        if (result.configUpdates) {
          Object.assign(config, result.configUpdates);
        }
        await saveConfig(config);
        await markStepCompleted("github");

        log.blank();
        log.header("GitHub Setup Complete");

        if (config.github) {
          log.info(`Repository: ${config.github.repo}`);
          if (config.github.secretsConfigured.length > 0) {
            log.info(
              `Secrets synced: ${config.github.secretsConfigured.join(", ")}`
            );
          }
          if (config.github.workflowsAdded.length > 0) {
            log.info(
              `Workflows added: ${config.github.workflowsAdded.join(", ")}`
            );
          }
        }
      }
    });
}
