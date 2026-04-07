import type Stripe from "stripe";
import type { StripeProduct } from "../../config/schema.js";
import { input, select, confirm } from "../../ui/prompts.js";
import { log } from "../../ui/logger.js";
import { withSpinner } from "../../ui/spinner.js";

export async function createProducts(
  stripe: Stripe
): Promise<StripeProduct[]> {
  const products: StripeProduct[] = [];

  let addMore = true;
  while (addMore) {
    log.blank();
    const name = await input({
      message: "Product name:",
      validate: (v) => (v.trim().length > 0 ? true : "Required"),
    });

    const interval = await select<"month" | "year" | "one_time">({
      message: "Billing interval:",
      choices: [
        { name: "Monthly", value: "month" },
        { name: "Yearly", value: "year" },
        { name: "One-time", value: "one_time" },
      ],
    });

    const amountStr = await input({
      message: "Price (in dollars, e.g. 29.99):",
      validate: (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 ? true : "Enter a valid price";
      },
    });
    const amount = Math.round(parseFloat(amountStr) * 100); // cents

    const product = await withSpinner(
      `Creating product "${name}"...`,
      async () => {
        const stripeProduct = await stripe.products.create({ name });

        const priceData: Stripe.PriceCreateParams = {
          product: stripeProduct.id,
          unit_amount: amount,
          currency: "usd",
        };

        if (interval !== "one_time") {
          priceData.recurring = { interval };
        }

        const price = await stripe.prices.create(priceData);

        return {
          id: stripeProduct.id,
          name,
          priceId: price.id,
          amount,
          interval,
        } satisfies StripeProduct;
      }
    );

    products.push(product);
    log.success(
      `Created "${name}" — $${(amount / 100).toFixed(2)}/${interval === "one_time" ? "once" : interval}`
    );

    addMore = await confirm({
      message: "Add another product?",
      default: false,
    });
  }

  return products;
}
