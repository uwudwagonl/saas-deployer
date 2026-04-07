import { Command } from "commander";
import chalk from "chalk";
import { registerInitCommand } from "./commands/init.js";
import { registerStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("saas")
  .description(
    "CLI tool to automate SaaS deployment — Stripe, GitHub, Vercel, and more."
  )
  .version("0.1.0");

// Register commands
registerInitCommand(program);
registerStatusCommand(program);

// Global error handler
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  if (error instanceof Error) {
    // Commander throws for --help and --version, just ignore those
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
