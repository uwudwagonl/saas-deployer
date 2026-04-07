import { log } from "../../ui/logger.js";
import { password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export async function setupResend(
  ctx: ProviderContext
): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  const hasCli = await commandExists("resend");
  if (hasCli) {
    const useCli = await confirm({
      message: "Resend CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      try {
        await run("resend", ["login"]);
        log.success("Resend CLI authenticated!");
      } catch {
        log.warn("Resend CLI login failed.");
      }
    }
  }

  log.info("Get your Resend API key:");
  log.link(LINKS.resend.apiKeys);
  log.blank();

  const apiKey = await password({
    message: "Resend API key (re_...):",
    validate: (v) => (v.startsWith("re_") ? true : "Must start with re_"),
  });

  ctx.setCredential("resend_api_key", apiKey);
  envVars["RESEND_API_KEY"] = apiKey;

  log.success("Resend configured!");
  log.info("Install in your project:");
  log.dim("  npm i resend react-email @react-email/components");

  return envVars;
}
