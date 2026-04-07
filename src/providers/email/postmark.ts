import { log } from "../../ui/logger.js";
import { password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import type { ProviderContext } from "../types.js";

export async function setupPostmark(
  ctx: ProviderContext
): Promise<Record<string, string>> {
  log.info("Get your Postmark server token:");
  log.link(LINKS.postmark.dashboard);
  log.blank();

  const token = await password({
    message: "Postmark Server Token:",
    validate: (v) => (v.length > 10 ? true : "Token seems too short"),
  });

  ctx.setCredential("postmark_server_token", token);
  log.success("Postmark configured!");
  log.info("Install: npm i postmark");

  return { POSTMARK_SERVER_TOKEN: token };
}
