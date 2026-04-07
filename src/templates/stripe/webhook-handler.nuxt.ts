export const stripeWebhookNuxt = `import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event);
  const signature = getHeader(event, "stripe-signature")!;

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(body!, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    throw createError({ statusCode: 400, message: "Invalid signature" });
  }

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      // TODO: Provision access for the customer
      console.log("Checkout completed:", session.id);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      console.log("Subscription updated:", subscription.id, subscription.status);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", subscription.id);
      break;
    }
    case "invoice.paid": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      console.log("Invoice paid:", invoice.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      console.log("Payment failed:", invoice.id);
      break;
    }
    default:
      console.log("Unhandled event type:", stripeEvent.type);
  }

  return { received: true };
});
`;
