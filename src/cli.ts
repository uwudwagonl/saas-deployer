import { Command } from "commander";
import chalk from "chalk";
import { registerInitCommand } from "./commands/init.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerStripeCommand } from "./commands/stripe.js";
import { registerDbCommand } from "./commands/db.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerEnvCommand } from "./commands/env.js";
import { registerGithubCommand } from "./commands/github.js";
import { registerVercelCommand } from "./commands/vercel.js";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerDomainCommand } from "./commands/domain.js";
import { registerEmailCommand } from "./commands/email.js";
import { registerMonitoringCommand } from "./commands/monitoring.js";
import { registerAddCommand } from "./commands/add.js";
import { registerQueueCommand } from "./commands/queue.js";
import { registerStorageCommand } from "./commands/storage.js";
import { registerChecklistCommand } from "./commands/checklist.js";
import { registerScaffoldCommand } from "./commands/scaffold.js";

const program = new Command();

program
  .name("saas")
  .description(
    "CLI tool to automate SaaS deployment — Stripe, GitHub, Vercel, and more."
  )
  .version("1.0.0")
  .option("--no-interactive", "Disable interactive prompts (use defaults and env vars)")
  .option("--dry-run", "Preview actions without executing")
  .option("-y, --yes", "Auto-confirm all prompts")
  .option("--verbose", "Show detailed output");

// Apply global options to environment before commands run
program.hook("preAction", (_thisCommand, _actionCommand) => {
  const opts = program.opts();
  if (opts.interactive === false) {
    process.env.SAAS_INTERACTIVE = "false";
  }
  if (opts.yes) {
    process.env.SAAS_YES = "true";
  }
  if (opts.dryRun) {
    process.env.SAAS_DRY_RUN = "true";
  }
  if (opts.verbose) {
    process.env.SAAS_VERBOSE = "true";
  }
});

// Register commands
registerInitCommand(program);
registerStatusCommand(program);
registerStripeCommand(program);
registerDbCommand(program);
registerAuthCommand(program);
registerEnvCommand(program);
registerGithubCommand(program);
registerVercelCommand(program);
registerDeployCommand(program);
registerDomainCommand(program);
registerEmailCommand(program);
registerMonitoringCommand(program);
registerAddCommand(program);
registerQueueCommand(program);
registerStorageCommand(program);
registerChecklistCommand(program);
registerScaffoldCommand(program);

// Global error handler
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  if (error instanceof Error) {
    if ("code" in error && typeof (error as any).code === "string") {
      const code = (error as any).code as string;
      if (
        code === "commander.helpDisplayed" ||
        code === "commander.version"
      ) {
        process.exit(0);
      }
    }
    console.error();
    console.error(chalk.red("Error:"), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
  process.exit(1);
}
