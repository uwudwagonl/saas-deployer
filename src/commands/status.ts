import type { Command } from "commander";
import chalk from "chalk";
import { log } from "../ui/logger.js";
import { configExists, loadConfig } from "../config/store.js";
import { hasCredential } from "../config/credentials.js";

interface StatusItem {
  label: string;
  step: string;
  check: () => boolean | string;
}

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Show the current setup status of your SaaS project")
    .action(async () => {
      log.header("SaaS Deployer — Project Status");

      if (!(await configExists())) {
        log.warn('No saas.config.json found. Run "saas init" first.');
        return;
      }

      const config = await loadConfig();
      const completed = config.completedSteps;

      console.log();
      console.log(`  ${chalk.bold("Project:")} ${config.project.name}`);
      console.log(`  ${chalk.bold("Framework:")} ${config.project.framework}`);
      console.log();

      const items: StatusItem[] = [
        {
          label: "Project Init",
          step: "init",
          check: () => completed.includes("init"),
        },
        {
          label: "Stripe",
          step: "stripe",
          check: () => {
            if (!completed.includes("stripe")) return false;
            const count = config.stripe?.products?.length ?? 0;
            return `${count} product${count !== 1 ? "s" : ""} configured`;
          },
        },
        {
          label: "Database",
          step: "db",
          check: () => {
            if (!config.db) return false;
            return config.db.provider;
          },
        },
        {
          label: "Auth",
          step: "auth",
          check: () => {
            if (!config.auth) return false;
            return config.auth.provider;
          },
        },
        {
          label: "GitHub",
          step: "github",
          check: () => {
            if (!config.github) return false;
            return config.github.repo;
          },
        },
        {
          label: "Vercel",
          step: "vercel",
          check: () => {
            if (!config.vercel?.projectId) return false;
            return config.vercel.domain ?? "deployed";
          },
        },
        {
          label: "Domain",
          step: "domain",
          check: () => completed.includes("domain"),
        },
      ];

      console.log(chalk.bold("  Setup Progress:"));
      console.log();

      for (const item of items) {
        const result = item.check();
        if (result === false) {
          console.log(`  ${chalk.red("○")} ${chalk.dim(item.label)}`);
        } else if (result === true) {
          console.log(`  ${chalk.green("●")} ${item.label}`);
        } else {
          console.log(
            `  ${chalk.green("●")} ${item.label} ${chalk.dim(`(${result})`)}`
          );
        }
      }

      const done = items.filter((i) => i.check() !== false).length;
      const total = items.length;
      console.log();
      console.log(
        `  ${chalk.bold(`${done}/${total}`)} steps completed`
      );

      // Credential status
      console.log();
      console.log(chalk.bold("  Stored Credentials:"));
      console.log();
      const creds = [
        { label: "Stripe Secret Key", key: "stripe_secret_key" },
        { label: "Stripe Publishable Key", key: "stripe_publishable_key" },
        { label: "GitHub Token", key: "github_token" },
        { label: "Vercel Token", key: "vercel_token" },
      ];
      for (const cred of creds) {
        const icon = hasCredential(cred.key) ? chalk.green("●") : chalk.dim("○");
        console.log(`  ${icon} ${hasCredential(cred.key) ? cred.label : chalk.dim(cred.label)}`);
      }
      console.log();
    });
}
