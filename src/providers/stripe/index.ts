import Stripe from "stripe";
import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { LINKS } from "../links.js";
import { createProducts } from "./products.js";
import { createWebhookEndpoint } from "./webhooks.js";
import { configureCustomerPortal } from "./portal.js";
import { log } from "../../ui/logger.js";
import { input, confirm, select, password } from "../../ui/prompts.js";
import { commandExists, run } from "../../utils/exec.js";
import {
  isStripeSecretKey,
  isStripePublishableKey,
} from "../../utils/validation.js";
import { scaffoldFile } from "../../templates/engine.js";
import { stripeWebhookNextjs } from "../../templates/stripe/webhook-handler.nextjs.js";
import { stripeWebhookRemix } from "../../templates/stripe/webhook-handler.remix.js";
import { stripeWebhookSveltekit } from "../../templates/stripe/webhook-handler.sveltekit.js";
import { stripeWebhookNuxt } from "../../templates/stripe/webhook-handler.nuxt.js";
import { stripeWebhookAstro } from "../../templates/stripe/webhook-handler.astro.js";

const WEBHOOK_ROUTES: Record<string, { path: string; template: string }> = {
  nextjs: {
    path: "app/api/webhooks/stripe/route.ts",
    template: stripeWebhookNextjs,
  },
  remix: {
    path: "app/routes/api.webhooks.stripe.ts",
    template: stripeWebhookRemix,
  },
  sveltekit: {
    path: "src/routes/api/webhooks/stripe/+server.ts",
    template: stripeWebhookSveltekit,
  },
  nuxt: {
    path: "server/api/webhooks/stripe.post.ts",
    template: stripeWebhookNuxt,
  },
  astro: {
    path: "src/pages/api/webhooks/stripe.ts",
    template: stripeWebhookAstro,
  },
};

async function authenticateStripe(ctx: ProviderContext): Promise<string> {
  // Check if we already have a key stored
  const existing = ctx.credential("stripe_secret_key");
  if (existing) {
    log.success("Using stored Stripe secret key");
    return existing;
  }

  // Try Stripe CLI login first
  const hasStripeCli = await commandExists("stripe");

  if (hasStripeCli) {
    const useCliLogin = await confirm({
      message: "Stripe CLI detected. Log in via browser?",
      default: true,
    });

    if (useCliLogin) {
      log.info("Opening browser for Stripe login...");
      try {
        await run("stripe", ["login"]);
        log.success("Stripe CLI authenticated!");
        log.info(
          "Note: CLI auth is separate from API keys. You still need your secret key for the SDK."
        );
      } catch {
        log.warn(
          "Stripe CLI login failed. Falling back to manual key entry."
        );
      }
    }
  }

  // Prompt for API key
  const mode = await select<"test" | "live">({
    message: "Which Stripe mode?",
    choices: [
      {
        name: "Test mode (recommended for development)",
        value: "test",
      },
      { name: "Live mode", value: "live" },
    ],
  });

  const keyUrl =
    mode === "test" ? LINKS.stripe.testApiKeys : LINKS.stripe.apiKeys;

  log.info("Get your Stripe API keys here:");
  log.link(keyUrl);
  log.blank();

  const secretKey = await password({
    message: `Stripe Secret Key (sk_${mode}_...):`,
    validate: (v) =>
      isStripeSecretKey(v) ? true : `Must start with sk_${mode}_`,
  });

  const publishableKey = await input({
    message: `Stripe Publishable Key (pk_${mode}_...):`,
    validate: (v) =>
      isStripePublishableKey(v) ? true : `Must start with pk_${mode}_`,
  });

  ctx.setCredential("stripe_secret_key", secretKey);
  ctx.setCredential("stripe_publishable_key", publishableKey);

  return secretKey;
}

export const stripeProvider: Provider = {
  name: "stripe",
  displayName: "Stripe",
  description: "Payment processing, subscriptions, and billing",
  category: "payments",
  requiredCredentialKeys: ["stripe_secret_key", "stripe_publishable_key"],
  dependsOn: [],
  cliName: "stripe",
  loginCommand: "stripe login",
  signupUrl: LINKS.stripe.signup,

  async preflight(ctx: ProviderContext): Promise<PreflightResult> {
    const missing: string[] = [];
    if (!ctx.credential("stripe_secret_key"))
      missing.push("stripe_secret_key");
    if (!ctx.credential("stripe_publishable_key"))
      missing.push("stripe_publishable_key");

    return {
      ready: missing.length === 0,
      missingCredentials: missing,
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Stripe Setup");

    const envVars: Record<string, string> = {};
    const manualSteps: ProviderResult["manualSteps"] = [];

    // Step 1: Authenticate
    const secretKey = await authenticateStripe(ctx);
    const publishableKey = ctx.credential("stripe_publishable_key")!;

    envVars["STRIPE_SECRET_KEY"] = secretKey;
    envVars["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] = publishableKey;

    const stripe = new Stripe(secretKey);

    // Step 2: Products
    const existingProducts = ctx.config.stripe?.products ?? [];
    let products = existingProducts;

    if (existingProducts.length > 0) {
      log.success(
        `${existingProducts.length} product(s) already configured`
      );
      const addMore = await confirm({
        message: "Add more products?",
        default: false,
      });
      if (addMore) {
        const newProducts = await createProducts(stripe);
        products = [...existingProducts, ...newProducts];
      }
    } else {
      const wantProducts = await confirm({
        message: "Create Stripe products & prices now?",
        default: true,
      });
      if (wantProducts) {
        products = await createProducts(stripe);
      }
    }

    // Step 3: Webhooks
    let webhookEndpoint = ctx.config.stripe?.webhookEndpoint;
    let webhookSecret = ctx.config.stripe?.webhookSecret;

    if (!webhookEndpoint) {
      const wantWebhook = await confirm({
        message: "Set up a webhook endpoint?",
        default: true,
      });

      if (wantWebhook) {
        const result = await createWebhookEndpoint(
          stripe,
          ctx.config.project.name
        );
        webhookEndpoint = result.url;
        webhookSecret = result.secret;
        ctx.setCredential("stripe_webhook_secret", result.secret);
        envVars["STRIPE_WEBHOOK_SECRET"] = result.secret;
      }
    } else {
      log.success(`Webhook already configured: ${webhookEndpoint}`);
      if (webhookSecret) {
        envVars["STRIPE_WEBHOOK_SECRET"] = webhookSecret;
      }
    }

    // Step 4: Customer portal
    let portalConfigured = ctx.config.stripe?.portalConfigured ?? false;

    if (!portalConfigured) {
      const wantPortal = await confirm({
        message: "Configure customer billing portal?",
        default: true,
      });

      if (wantPortal) {
        await configureCustomerPortal(stripe, ctx.config.project.name);
        portalConfigured = true;
      }
    } else {
      log.success("Customer portal already configured");
    }

    // Step 5: Scaffold webhook handler
    const framework = ctx.config.project.framework;
    const webhookRoute = WEBHOOK_ROUTES[framework];
    if (webhookRoute && webhookEndpoint) {
      const wantScaffold = await confirm({
        message: `Scaffold webhook handler at ${webhookRoute.path}?`,
        default: true,
      });
      if (wantScaffold) {
        await scaffoldFile(webhookRoute.path, webhookRoute.template);
      }
    }

    // Manual steps
    manualSteps.push({
      description: "Configure Stripe Tax settings (if needed)",
      url: LINKS.stripe.tax,
    });
    manualSteps.push({
      description: "Set up billing automations (dunning, reminders)",
      url: LINKS.stripe.billingAutomations,
    });

    return {
      success: true,
      configUpdates: {
        stripe: {
          products,
          webhookEndpoint,
          webhookSecret,
          portalConfigured,
          taxEnabled: ctx.config.stripe?.taxEnabled ?? false,
        },
      },
      envVars,
      manualSteps,
    };
  },
};
