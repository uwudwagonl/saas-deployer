import type { Command } from "commander";
import { log } from "../ui/logger.js";
import { configExists } from "../config/store.js";
import { runDeploy } from "../deploy/orchestrator.js";
import { checkbox } from "../ui/prompts.js";

export function registerDeployCommand(program: Command) {
  program
    .command("deploy")
    .description("Run the full SaaS setup flow")
    .option("--dry-run", "Show what would be executed without running")
    .option(
      "--step <steps>",
      "Run specific steps only (comma-separated)"
    )
    .action(async (options) => {
      if (!(await configExists())) {
        log.error('No saas.config.json found. Run "saas init" first.');
        process.exit(1);
      }

      let steps: string[] | undefined;

      if (options.step) {
        steps = (options.step as string).split(",").map((s: string) => s.trim());
      } else if (!options.dryRun) {
        // Let user select which services to set up
        const allSteps = [
          { name: "Database", value: "database" },
          { name: "Authentication", value: "auth" },
          { name: "Stripe (Payments)", value: "stripe" },
          { name: "GitHub (Repo + Secrets)", value: "github" },
          { name: "Vercel (Deploy)", value: "vercel" },
        ];

        steps = await checkbox({
          message: "Which services do you want to set up?",
          choices: allSteps,
        });

        if (steps.length === 0) {
          log.warn("No services selected.");
          return;
        }
      }

      await runDeploy(steps, { dryRun: options.dryRun });
    });
}
