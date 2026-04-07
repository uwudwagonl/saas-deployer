import { log } from "../../ui/logger.js";
import { password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import type { ProviderContext } from "../types.js";

export async function setupSendGrid(
  ctx: ProviderContext
): Promise<Record<string, string>> {
  log.info("Get your SendGrid API key:");
  log.link(LINKS.sendgrid.apiKeys);
  log.blank();

  const apiKey = await password({
    message: "SendGrid API key (SG....):",
    validate: (v) => (v.startsWith("SG.") ? true : "Must start with SG."),
  });

  ctx.setCredential("sendgrid_api_key", apiKey);
  log.success("SendGrid configured!");
  log.info("Install: npm i @sendgrid/mail");

  return { SENDGRID_API_KEY: apiKey };
}
