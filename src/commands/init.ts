import type { Command } from "commander";
import { log } from "../ui/logger.js";
import { input, select, confirm } from "../ui/prompts.js";
import { isNonEmpty } from "../utils/validation.js";
import { fileExists, projectPath } from "../utils/fs.js";
import {
  configExists,
  createDefaultConfig,
  markStepCompleted,
} from "../config/store.js";
import type { SaasConfig } from "../config/schema.js";

type Framework = SaasConfig["project"]["framework"];

const FRAMEWORK_DETECTORS: Record<string, Framework> = {
  "next.config.js": "nextjs",
  "next.config.ts": "nextjs",
  "next.config.mjs": "nextjs",
  "remix.config.js": "remix",
  "nuxt.config.ts": "nuxt",
  "svelte.config.js": "sveltekit",
  "astro.config.mjs": "astro",
  "astro.config.ts": "astro",
};

async function detectFramework(): Promise<Framework | null> {
  for (const [file, framework] of Object.entries(FRAMEWORK_DETECTORS)) {
    if (await fileExists(projectPath(file))) {
      return framework;
    }
  }
  return null;
}

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize a new SaaS project configuration")
    .action(async () => {
      log.header("SaaS Deployer — Project Init");

      if (await configExists()) {
        const overwrite = await confirm({
          message:
            "A saas.config.json already exists. Do you want to overwrite it?",
          default: false,
        });
        if (!overwrite) {
          log.info("Init cancelled. Existing config preserved.");
          return;
        }
      }

      // Project name
      const dirName = process.cwd().split(/[/\\]/).pop() ?? "my-saas";
      const name = await input({
        message: "Project name:",
        default: dirName,
        validate: isNonEmpty,
      });

      // Framework detection
      const detected = await detectFramework();
      let framework: Framework;

      if (detected) {
        log.success(`Detected framework: ${detected}`);
        const useDetected = await confirm({
          message: `Use ${detected}?`,
          default: true,
        });
        framework = useDetected ? detected : await promptFramework();
      } else {
        log.info("Could not auto-detect framework.");
        framework = await promptFramework();
      }

      // Create config
      await createDefaultConfig(name, framework);
      await markStepCompleted("init");

      log.blank();
      log.success("Project initialized! Created saas.config.json");
      log.blank();
      log.info("Next steps:");
      log.dim("  saas stripe   — Set up Stripe products & billing");
      log.dim("  saas db       — Set up your database");
      log.dim("  saas auth     — Set up authentication");
      log.dim("  saas github   — Create GitHub repo & push");
      log.dim("  saas vercel   — Deploy to Vercel");
      log.dim("  saas deploy   — Run the full setup flow");
    });
}

async function promptFramework(): Promise<Framework> {
  return select({
    message: "Select your framework:",
    choices: [
      { name: "Next.js", value: "nextjs" as const },
      { name: "Remix", value: "remix" as const },
      { name: "Nuxt", value: "nuxt" as const },
      { name: "SvelteKit", value: "sveltekit" as const },
      { name: "Astro", value: "astro" as const },
      { name: "Other", value: "other" as const },
    ],
  });
}
