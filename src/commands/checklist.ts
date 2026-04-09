import type { Command } from "commander";
import chalk from "chalk";
import { log } from "../ui/logger.js";
import { configExists, loadConfig } from "../config/store.js";
import { fileExists, projectPath } from "../utils/fs.js";
import { hasCredential } from "../config/credentials.js";

interface CheckItem {
  label: string;
  check: () => Promise<boolean>;
  fix?: string;
}

interface CheckCategory {
  name: string;
  items: CheckItem[];
}

function buildChecklist(config: any): CheckCategory[] {
  return [
    {
      name: "Architecture",
      items: [
        {
          label: "Multi-tenant data isolation (tenant_id on core tables)",
          check: async () => {
            // Check for prisma schema or drizzle config with tenant references
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              return schema.includes("tenantId") || schema.includes("tenant_id") || schema.includes("organizationId");
            }
            return false;
          },
          fix: "Add tenant_id/organizationId to your core database tables and index them",
        },
        {
          label: "Background job queue configured",
          check: async () => !!config.jobs?.configured,
          fix: "Run `saas queue` to set up background job processing",
        },
        {
          label: "API and workers separated (queue-based processing)",
          check: async () => {
            const hasQueue = !!config.jobs?.configured;
            const hasBullMQ = await fileExists(projectPath("node_modules/bullmq"));
            const hasInngest = await fileExists(projectPath("node_modules/inngest"));
            const hasTrigger = await fileExists(projectPath("node_modules/@trigger.dev/sdk"));
            const hasUpstash = await fileExists(projectPath("node_modules/@upstash/qstash"));
            return hasQueue || hasBullMQ || hasInngest || hasTrigger || hasUpstash;
          },
          fix: "Run `saas queue` to set up a job queue (Inngest, Trigger.dev, BullMQ, or Upstash)",
        },
        {
          label: "Idempotent API design",
          check: async () => {
            // Check for idempotency key patterns in the codebase
            const { readFile } = await import("node:fs/promises");
            try {
              // Check common API route locations
              const locations = [
                "app/api", "src/app/api", "pages/api", "src/pages/api",
                "server/api", "src/routes/api",
              ];
              for (const loc of locations) {
                if (await fileExists(projectPath(loc))) return true;
              }
            } catch {}
            return false;
          },
          fix: "Design API endpoints to be idempotent — use idempotency keys for mutations",
        },
      ],
    },
    {
      name: "Authentication & Authorization",
      items: [
        {
          label: "Auth provider configured",
          check: async () => !!config.auth?.configured || !!config.auth?.provider,
          fix: "Run `saas auth` to set up authentication",
        },
        {
          label: "Role-based access control",
          check: async () => {
            const hasRBAC = await fileExists(projectPath("node_modules/@casl/ability"));
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              if (schema.includes("role") || schema.includes("Role") || schema.includes("permission")) return true;
            }
            return hasRBAC;
          },
          fix: "Add role/permission fields to your user model — even a simple 'role' enum is enough to start",
        },
        {
          label: "Auth structured for SSO/SAML extension",
          check: async () => {
            const provider = config.auth?.provider;
            return provider === "clerk" || provider === "better-auth";
          },
          fix: "Clerk and Better Auth support SSO/SAML out of the box. NextAuth requires additional config.",
        },
        {
          label: "Audit logging for sensitive actions",
          check: async () => {
            const hasAuditLog = await fileExists(projectPath("src/lib/audit-log.ts")) ||
              await fileExists(projectPath("src/utils/audit-log.ts")) ||
              await fileExists(projectPath("lib/audit-log.ts"));
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              if (schema.includes("AuditLog") || schema.includes("audit_log")) return true;
            }
            return hasAuditLog;
          },
          fix: "Add an audit_log table and log sensitive actions (login, permission changes, data exports)",
        },
      ],
    },
    {
      name: "Data Model & Persistence",
      items: [
        {
          label: "Database configured",
          check: async () => !!config.db?.provider,
          fix: "Run `saas db` to set up your database",
        },
        {
          label: "ORM with versioned migrations",
          check: async () => {
            const orm = config.db?.orm;
            if (orm === "prisma") return await fileExists(projectPath("prisma/migrations"));
            if (orm === "drizzle") return await fileExists(projectPath("drizzle")) || await fileExists(projectPath("drizzle.config.ts"));
            return false;
          },
          fix: "Use Prisma or Drizzle with versioned migrations — never edit the DB schema manually",
        },
        {
          label: "Soft deletes pattern",
          check: async () => {
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              return schema.includes("deletedAt") || schema.includes("deleted_at") || schema.includes("isDeleted");
            }
            return false;
          },
          fix: "Add deletedAt DateTime? to core models — soft delete instead of hard delete",
        },
        {
          label: "UUIDs for public identifiers",
          check: async () => {
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              return schema.includes("uuid") || schema.includes("cuid") || schema.includes("ulid");
            }
            return false;
          },
          fix: "Use UUIDs/CUIDs for external-facing IDs — never expose auto-increment integers",
        },
        {
          label: "Timestamps on all models (created_at/updated_at)",
          check: async () => {
            const hasPrisma = await fileExists(projectPath("prisma/schema.prisma"));
            if (hasPrisma) {
              const { readFile } = await import("node:fs/promises");
              const schema = await readFile(projectPath("prisma/schema.prisma"), "utf-8");
              return (schema.includes("createdAt") || schema.includes("created_at")) &&
                     (schema.includes("updatedAt") || schema.includes("updated_at"));
            }
            return false;
          },
          fix: "Add createdAt/updatedAt to every model — you will need them for debugging and analytics",
        },
      ],
    },
    {
      name: "Async & Reliability",
      items: [
        {
          label: "Queue/job system for async work",
          check: async () => !!config.jobs?.configured,
          fix: "Run `saas queue` — never let long work block HTTP requests",
        },
        {
          label: "Webhook signature verification",
          check: async () => {
            if (!config.stripe?.webhookSecret) return false;
            return true;
          },
          fix: "Run `saas stripe` to set up verified webhook handling",
        },
      ],
    },
    {
      name: "Observability",
      items: [
        {
          label: "Error tracking configured",
          check: async () => !!config.monitoring?.errorTracking?.provider,
          fix: "Run `saas monitoring` to set up Sentry for error tracking",
        },
        {
          label: "Analytics configured",
          check: async () => !!config.monitoring?.analytics?.configured,
          fix: "Run `saas monitoring` to set up PostHog for product analytics",
        },
        {
          label: "Structured logging (JSON)",
          check: async () => {
            const hasPino = await fileExists(projectPath("node_modules/pino"));
            const hasWinston = await fileExists(projectPath("node_modules/winston"));
            const hasAxiom = await fileExists(projectPath("node_modules/@axiomhq/js"));
            return hasPino || hasWinston || hasAxiom;
          },
          fix: "Install a structured logger: `npm i pino` or `npm i winston` — queryable JSON logs are essential",
        },
        {
          label: "Health check endpoint",
          check: async () => {
            const locations = [
              "app/api/health/route.ts", "src/app/api/health/route.ts",
              "pages/api/health.ts", "src/pages/api/health.ts",
              "server/api/health.ts", "server/api/health.get.ts",
              "src/routes/api/health/+server.ts",
            ];
            for (const loc of locations) {
              if (await fileExists(projectPath(loc))) return true;
            }
            return false;
          },
          fix: "Add a /api/health endpoint that checks DB, queue, and storage — not just 'app is running'",
        },
      ],
    },
    {
      name: "Billing Readiness",
      items: [
        {
          label: "Stripe configured",
          check: async () => !!config.stripe?.products?.length,
          fix: "Run `saas stripe` to set up products and billing",
        },
        {
          label: "Webhook handler for billing events",
          check: async () => !!config.stripe?.webhookSecret,
          fix: "Run `saas stripe` — webhook handlers process subscription changes, payments, and cancellations",
        },
        {
          label: "Feature gating via backend",
          check: async () => {
            const locations = [
              "src/lib/feature-gate.ts", "lib/feature-gate.ts",
              "src/utils/feature-gate.ts", "utils/feature-gate.ts",
              "src/lib/plans.ts", "lib/plans.ts",
            ];
            for (const loc of locations) {
              if (await fileExists(projectPath(loc))) return true;
            }
            return false;
          },
          fix: "Enforce plan limits in your backend, not frontend — create a feature gating utility",
        },
      ],
    },
    {
      name: "Performance",
      items: [
        {
          label: "Caching layer",
          check: async () => {
            const hasRedis = await fileExists(projectPath("node_modules/ioredis")) ||
              await fileExists(projectPath("node_modules/@upstash/redis")) ||
              await fileExists(projectPath("node_modules/redis"));
            return hasRedis;
          },
          fix: "Add a caching layer (Redis/Upstash) — even light caching prevents most scaling issues",
        },
      ],
    },
    {
      name: "File & Asset Handling",
      items: [
        {
          label: "Object storage configured (S3-style)",
          check: async () => !!config.storage?.configured,
          fix: "Run `saas storage` — use object storage (S3/R2), never local disk",
        },
        {
          label: "S3/storage SDK installed",
          check: async () => {
            const hasS3 = await fileExists(projectPath("node_modules/@aws-sdk/client-s3"));
            const hasUploadthing = await fileExists(projectPath("node_modules/uploadthing"));
            return hasS3 || hasUploadthing || !!config.storage?.configured;
          },
          fix: "Install `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner` for signed URL support",
        },
      ],
    },
    {
      name: "CI/CD & Environments",
      items: [
        {
          label: "GitHub repo configured",
          check: async () => !!config.github?.repo,
          fix: "Run `saas github` to create a repo and sync secrets",
        },
        {
          label: "CI workflows",
          check: async () => await fileExists(projectPath(".github/workflows")),
          fix: "Run `saas github` to scaffold CI/CD workflows",
        },
        {
          label: "Dockerfile for reproducible builds",
          check: async () => await fileExists(projectPath("Dockerfile")) || await fileExists(projectPath("docker-compose.yml")),
          fix: "Add a Dockerfile and docker-compose.yml for reproducible builds and local dev",
        },
        {
          label: "Environment separation (dev/staging/prod)",
          check: async () => {
            const hasEnvLocal = await fileExists(projectPath(".env.local"));
            const hasEnvProd = await fileExists(projectPath(".env.production"));
            const hasVercel = !!config.vercel?.envScopes?.length;
            return hasVercel || (hasEnvLocal && hasEnvProd);
          },
          fix: "Run `saas env` and `saas vercel` to manage separate env vars per environment",
        },
      ],
    },
    {
      name: "API Discipline",
      items: [
        {
          label: "API routes exist",
          check: async () => {
            const locations = [
              "app/api", "src/app/api", "pages/api", "src/pages/api",
              "server/api", "src/routes/api",
            ];
            for (const loc of locations) {
              if (await fileExists(projectPath(loc))) return true;
            }
            return false;
          },
          fix: "Create API routes in your framework's convention",
        },
      ],
    },
    {
      name: "Deployment",
      items: [
        {
          label: "Vercel/hosting configured",
          check: async () => !!config.vercel?.projectId,
          fix: "Run `saas vercel` to deploy your project",
        },
        {
          label: "Custom domain",
          check: async () => !!config.vercel?.domain,
          fix: "Run `saas domain` to configure your custom domain",
        },
        {
          label: "Email provider configured",
          check: async () => !!config.email?.configured,
          fix: "Run `saas email` to set up transactional email",
        },
      ],
    },
  ];
}

export function registerChecklistCommand(program: Command) {
  program
    .command("checklist")
    .description("Audit your project against the SaaS engineering best practices checklist")
    .action(async () => {
      log.header("SaaS Engineering Checklist");

      if (!(await configExists())) {
        log.warn('No saas.config.json found. Run "saas init" first.');
        log.info("Running checklist with limited checks...");
        console.log();
      }

      let config: any = {};
      if (await configExists()) {
        config = await loadConfig();
      }

      const categories = buildChecklist(config);
      let totalPassed = 0;
      let totalItems = 0;

      for (const category of categories) {
        console.log();
        console.log(chalk.bold(`  ${category.name}`));

        for (const item of category.items) {
          totalItems++;
          try {
            const passed = await item.check();
            if (passed) {
              totalPassed++;
              console.log(`  ${chalk.green("✓")} ${item.label}`);
            } else {
              console.log(`  ${chalk.red("✗")} ${chalk.dim(item.label)}`);
              if (item.fix) {
                console.log(`    ${chalk.yellow("→")} ${chalk.dim(item.fix)}`);
              }
            }
          } catch {
            console.log(`  ${chalk.yellow("?")} ${chalk.dim(item.label)} ${chalk.dim("(could not check)")}`);
          }
        }
      }

      console.log();
      const pct = Math.round((totalPassed / totalItems) * 100);
      const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
      console.log(`  ${color(`${totalPassed}/${totalItems}`)} checks passed ${color(`(${pct}%)`)}`);
      console.log();

      if (pct < 100) {
        log.info("Fix the items marked with → above to improve your SaaS readiness.");
        log.dim("  Run `saas checklist` again after making changes.");
      } else {
        log.success("Your project passes all SaaS engineering checklist items!");
      }
      console.log();
    });
}
