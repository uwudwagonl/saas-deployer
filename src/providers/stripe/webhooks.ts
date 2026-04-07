import type Stripe from "stripe";
import { input } from "../../ui/prompts.js";
import { log } from "../../ui/logger.js";
import { withSpinner } from "../../ui/spinner.js";

const DEFAULT_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

export async function createWebhookEndpoint(
  stripe: Stripe,
  projectName: string
): Promise<{ endpointId: string; url: string; secret: string }> {
  const defaultUrl = `https://${projectName}.vercel.app/api/webhooks/stripe`;

  const url = await input({
    message: "Webhook endpoint URL:",
    default: defaultUrl,
    validate: (v) =>
      v.startsWith("http://") || v.startsWith("https://")
        ? true
        : "Must be a valid URL",
  });

  const endpoint = await withSpinner(
    "Creating webhook endpoint...",
    () =>
      stripe.webhookEndpoints.create({
        url,
        enabled_events: DEFAULT_EVENTS,
      })
  );

  // CRITICAL: The webhook secret is ONLY returned at creation time
  const secret = endpoint.secret!;

  log.success(`Webhook endpoint created: ${url}`);
  log.warn(
    "Webhook signing secret stored. This secret is only shown once by Stripe!"
  );

  return {
    endpointId: endpoint.id,
    url,
    secret,
  };
}
