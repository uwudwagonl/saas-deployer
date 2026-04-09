import type { Command } from "commander";
import { log } from "../ui/logger.js";
import { configExists, loadConfig } from "../config/store.js";
import { fileExists, projectPath, ensureDir } from "../utils/fs.js";
import { checkbox, confirm } from "../ui/prompts.js";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { HEALTH_CHECK_ROUTES } from "../templates/scaffold/health-check.js";
import { dockerfile, dockerCompose, dockerignore } from "../templates/scaffold/docker.js";
import { correlationIdMiddlewareNextjs, rateLimiterTemplate } from "../templates/scaffold/middleware.js";
import { auditLogUtil, featureGateUtil, paginationHelper } from "../templates/scaffold/patterns.js";

interface ScaffoldItem {
  name: string;
  description: string;
  value: string;
}

const SCAFFOLD_ITEMS: ScaffoldItem[] = [
  { name: "Health check endpoint", description: "GET /api/health — checks DB, queue, storage", value: "health" },
  { name: "Dockerfile + docker-compose", description: "Containerized builds with Postgres + Redis", value: "docker" },
  { name: "Correlation ID middleware", description: "x-request-id on every API request", value: "correlation" },
  { name: "Rate limiter", description: "Upstash-based sliding window rate limiting", value: "ratelimit" },
  { name: "Audit log utility", description: "Log sensitive actions for compliance", value: "audit" },
  { name: "Feature gate utility", description: "Backend plan limits and feature flags", value: "feature-gate" },
  { name: "Pagination helper", description: "Always paginate — never load unbounded data", value: "pagination" },
];

async function writeIfNotExists(path: string, content: string): Promise<boolean> {
  const fullPath = projectPath(path);
  if (await fileExists(fullPath)) {
    log.dim(`  Skipped ${path} (already exists)`);
    return false;
  }
  await ensureDir(dirname(fullPath));
  await writeFile(fullPath, content, "utf-8");
  log.success(`  Created ${path}`);
  return true;
}

export function registerScaffoldCommand(program: Command) {
  program
    .command("scaffold")
    .description("Scaffold SaaS best-practice patterns (health check, Docker, rate limiter, audit log, etc.)")
    .action(async () => {
      log.header("SaaS Pattern Scaffolding");

      let framework = "nextjs";
      if (await configExists()) {
        const config = await loadConfig();
        framework = config.project.framework;
      }

      const selected = await checkbox({
        message: "What do you want to scaffold?",
        choices: SCAFFOLD_ITEMS.map((item) => ({
          name: `${item.name} — ${item.description}`,
          value: item.value,
        })),
      });

      if (selected.length === 0) {
        log.dim("Nothing selected.");
        return;
      }

      console.log();

      for (const item of selected) {
        switch (item) {
          case "health": {
            const route = HEALTH_CHECK_ROUTES[framework] ?? HEALTH_CHECK_ROUTES.nextjs;
            await writeIfNotExists(route.path, route.template);
            break;
          }
          case "docker": {
            await writeIfNotExists("Dockerfile", dockerfile);
            await writeIfNotExists("docker-compose.yml", dockerCompose);
            await writeIfNotExists(".dockerignore", dockerignore);
            break;
          }
          case "correlation": {
            if (framework === "nextjs") {
              await writeIfNotExists("src/middleware.ts", correlationIdMiddlewareNextjs);
            } else {
              await writeIfNotExists("src/middleware.ts", correlationIdMiddlewareNextjs);
            }
            break;
          }
          case "ratelimit": {
            await writeIfNotExists("src/lib/rate-limit.ts", rateLimiterTemplate);
            break;
          }
          case "audit": {
            await writeIfNotExists("src/lib/audit-log.ts", auditLogUtil);
            break;
          }
          case "feature-gate": {
            await writeIfNotExists("src/lib/feature-gate.ts", featureGateUtil);
            break;
          }
          case "pagination": {
            await writeIfNotExists("src/lib/pagination.ts", paginationHelper);
            break;
          }
        }
      }

      console.log();
      log.success("Scaffolding complete!");
      log.dim("  Run `saas checklist` to see your updated SaaS readiness score.");
    });
}
