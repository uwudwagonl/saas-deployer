import type { Command } from "commander";
import { log } from "../ui/logger.js";
import { configExists, loadConfig, saveConfig, markStepCompleted } from "../config/store.js";
import { getCredential, setCredential } from "../config/credentials.js";
import { stripeProvider } from "../providers/stripe/index.js";
import type { ProviderContext } from "../providers/types.js";

export function registerStripeCommand(program: Command) {
  program
    .command("stripe")
    .description("Set up Stripe products, webhooks, and billing")
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

      // Run preflight
      const preflight = await stripeProvider.preflight(ctx);
      if (preflight.warnings.length > 0) {
        for (const w of preflight.warnings) {
          log.warn(w);
        }
      }

      // Run setup
      const result = await stripeProvider.setup(ctx);

      if (result.success) {
        // Merge config updates
        if (result.configUpdates) {
          Object.assign(config, result.configUpdates);
        }
        await saveConfig(config);
        await markStepCompleted("stripe");

        // Show summary
        log.blank();
        log.header("Stripe Setup Complete");

        if (result.envVars) {
          log.info("Environment variables to add:");
          for (const key of Object.keys(result.envVars)) {
            log.dim(`  ${key}`);
          }
        }

        if (result.manualSteps?.length) {
          log.blank();
          log.info("Manual steps remaining:");
          for (const step of result.manualSteps) {
            log.dim(`  - ${step.description}`);
            if (step.url) {
              log.link(step.url);
            }
          }
        }

        log.blank();
        log.success("Run `saas env` to generate your .env.local file");
      } else {
        log.error("Stripe setup failed");
      }
    });
}
