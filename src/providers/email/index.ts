import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { LINKS } from "../links.js";
import { log } from "../../ui/logger.js";
import { select } from "../../ui/prompts.js";
import { setupResend } from "./resend.js";
import { setupSendGrid } from "./sendgrid.js";
import { setupPostmark } from "./postmark.js";
import type { SaasConfig } from "../../config/schema.js";

type EmailProvider = NonNullable<SaasConfig["email"]>["provider"];

export const emailProvider: Provider = {
  name: "email",
  displayName: "Email",
  description: "Email service setup (Resend, SendGrid, Postmark)",
  category: "email",
  requiredCredentialKeys: [],
  dependsOn: [],
  signupUrl: LINKS.resend.signup,

  async preflight(): Promise<PreflightResult> {
    return {
      ready: true,
      missingCredentials: [],
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Email Service Setup");

    const provider = await select<EmailProvider>({
      message: "Select your email provider:",
      choices: [
        { name: "Resend — Modern, React Email support (recommended)", value: "resend" },
        { name: "SendGrid — Established, high volume", value: "sendgrid" },
        { name: "Postmark — Best deliverability for transactional", value: "postmark" },
      ],
    });

    let envVars: Record<string, string>;

    switch (provider) {
      case "resend":
        envVars = await setupResend(ctx);
        break;
      case "sendgrid":
        envVars = await setupSendGrid(ctx);
        break;
      case "postmark":
        envVars = await setupPostmark(ctx);
        break;
      default:
        envVars = {};
    }

    return {
      success: true,
      configUpdates: {
        email: { provider, configured: true },
      },
      envVars,
    };
  },
};
