import type { Command } from "commander";
import { log } from "../ui/logger.js";
import {
  configExists,
  loadConfig,
  saveConfig,
  markStepCompleted,
} from "../config/store.js";
import { getCredential } from "../config/credentials.js";
import { input } from "../ui/prompts.js";
import { isDomainName } from "../utils/validation.js";
import { addDomain } from "../providers/vercel/domain.js";
import { LINKS } from "../providers/links.js";

export function registerDomainCommand(program: Command) {
  program
    .command("domain")
    .description("Set up a custom domain for your project")
    .action(async () => {
      if (!(await configExists())) {
        log.error('No saas.config.json found. Run "saas init" first.');
        process.exit(1);
      }

      const config = await loadConfig();

      log.header("Domain Setup");

      // If Vercel is configured, add domain there
      const vercelToken = getCredential("vercel_token");
      const projectId = config.vercel?.projectId;

      if (vercelToken && projectId) {
        const result = await addDomain(vercelToken, projectId);
        config.vercel = {
          envScopes: [],
          ...config.vercel,
          domain: result.domain,
        };
        await saveConfig(config);
        await markStepCompleted("domain");
      } else {
        // No Vercel — just provide guidance
        const domain = await input({
          message: "Your domain name:",
          validate: (v) =>
            isDomainName(v) ? true : "Enter a valid domain name",
        });

        log.blank();
        log.info("DNS Configuration Guide");
        log.blank();
        log.dim("  For Vercel hosting:");
        log.dim("    A Record     → 76.76.21.21");
        log.dim("    CNAME (www)  → cname.vercel-dns.com");
        log.blank();
        log.dim("  For Netlify hosting:");
        log.dim("    A Record     → 75.2.60.5");
        log.dim("    CNAME (www)  → your-site.netlify.app");
        log.blank();
        log.info("Configure DNS at your registrar:");
        log.link(LINKS.cloudflare.signup, "Cloudflare (recommended)");
        log.blank();

        config.vercel = { envScopes: [], ...config.vercel, domain };
        await saveConfig(config);
        await markStepCompleted("domain");
        log.success("Domain saved to config");
      }
    });
}
