import type Stripe from "stripe";
import { input } from "../../ui/prompts.js";
import { withSpinner } from "../../ui/spinner.js";
import { log } from "../../ui/logger.js";

export async function configureCustomerPortal(
  stripe: Stripe,
  projectName: string
): Promise<void> {
  const defaultReturnUrl = `https://${projectName}.vercel.app/dashboard`;

  const returnUrl = await input({
    message: "Customer portal return URL:",
    default: defaultReturnUrl,
  });

  await withSpinner("Configuring customer portal...", async () => {
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: `Manage your ${projectName} subscription`,
      },
      features: {
        subscription_cancel: { enabled: true },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price", "quantity"],
        },
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
      },
      default_return_url: returnUrl,
    });
  });

  log.success("Customer portal configured");
}
