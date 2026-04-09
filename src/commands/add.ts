import type { Command } from "commander";
import chalk from "chalk";
import { log } from "../ui/logger.js";
import { select } from "../ui/prompts.js";
import {
  configExists,
  loadConfig,
  isStepCompleted,
} from "../config/store.js";

interface ServiceEntry {
  name: string;
  command: string;
  description: string;
  step: string;
}

const SERVICES: ServiceEntry[] = [
  { name: "Stripe", command: "stripe", description: "Payments & billing", step: "stripe" },
  { name: "Database", command: "db", description: "Database provider", step: "db" },
  { name: "Auth", command: "auth", description: "Authentication", step: "auth" },
  { name: "Email", command: "email", description: "Email service", step: "email" },
  { name: "Monitoring", command: "monitoring", description: "Error tracking & analytics", step: "monitoring" },
  { name: "Queue", command: "queue", description: "Background jobs & queues", step: "queue" },
  { name: "Storage", command: "storage", description: "File & object storage", step: "storage" },
  { name: "GitHub", command: "github", description: "Repo, secrets, CI/CD", step: "github" },
  { name: "Vercel", command: "vercel", description: "Deploy & hosting", step: "vercel" },
  { name: "Domain", command: "domain", description: "Custom domain setup", step: "domain" },
];

export function registerAddCommand(program: Command) {
  program
    .command("add [service]")
    .description("Add a service to your project")
    .action(async (service?: string) => {
      if (!(await configExists())) {
        log.error('No saas.config.json found. Run "saas init" first.');
        process.exit(1);
      }

      // If service specified directly, run it
      if (service) {
        const entry = SERVICES.find(
          (s) => s.command === service || s.name.toLowerCase() === service
        );
        if (!entry) {
          log.error(`Unknown service: ${service}`);
          log.info(
            `Available: ${SERVICES.map((s) => s.command).join(", ")}`
          );
          process.exit(1);
        }

        // Delegate to the service's command
        log.info(`Running "saas ${entry.command}"...`);
        // Re-parse with the service command
        await program.parseAsync(["node", "saas", entry.command]);
        return;
      }

      // Interactive selection — show status
      log.header("Add a Service");

      const choices = [];
      for (const s of SERVICES) {
        const done = await isStepCompleted(s.step);
        const status = done ? chalk.green(" ●") : chalk.dim(" ○");
        choices.push({
          name: `${s.name}${status} — ${s.description}`,
          value: s.command,
          disabled: done ? "(already configured)" : false,
        });
      }

      const selected = await select({
        message: "Which service do you want to add?",
        choices: choices as any,
      });

      await program.parseAsync(["node", "saas", selected as string]);
    });
}
