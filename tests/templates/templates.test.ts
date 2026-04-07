import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../src/templates/engine.js";
import { stripeWebhookNextjs } from "../../src/templates/stripe/webhook-handler.nextjs.js";
import { stripeWebhookRemix } from "../../src/templates/stripe/webhook-handler.remix.js";
import { stripeWebhookSveltekit } from "../../src/templates/stripe/webhook-handler.sveltekit.js";
import { stripeWebhookNuxt } from "../../src/templates/stripe/webhook-handler.nuxt.js";
import { stripeWebhookAstro } from "../../src/templates/stripe/webhook-handler.astro.js";
import { clerkMiddlewareNextjs } from "../../src/templates/auth/middleware.nextjs.js";
import { nextauthConfigNextjs, nextauthRouteHandler, nextauthMiddleware } from "../../src/templates/auth/auth-config.nextjs.js";
import { betterAuthConfig, betterAuthClient } from "../../src/templates/auth/better-auth-config.js";

describe("Stripe webhook templates", () => {
  describe("Next.js template", () => {
    it("exports a non-empty string", () => {
      expect(typeof stripeWebhookNextjs).toBe("string");
      expect(stripeWebhookNextjs.length).toBeGreaterThan(100);
    });

    it("imports from next/headers", () => {
      expect(stripeWebhookNextjs).toContain('from "next/headers"');
    });

    it("imports from next/server", () => {
      expect(stripeWebhookNextjs).toContain('from "next/server"');
    });

    it("imports Stripe SDK", () => {
      expect(stripeWebhookNextjs).toContain('from "stripe"');
    });

    it("uses STRIPE_SECRET_KEY env var", () => {
      expect(stripeWebhookNextjs).toContain("STRIPE_SECRET_KEY");
    });

    it("uses STRIPE_WEBHOOK_SECRET env var", () => {
      expect(stripeWebhookNextjs).toContain("STRIPE_WEBHOOK_SECRET");
    });

    it("exports POST handler", () => {
      expect(stripeWebhookNextjs).toContain("export async function POST");
    });

    it("verifies webhook signature", () => {
      expect(stripeWebhookNextjs).toContain("constructEvent");
      expect(stripeWebhookNextjs).toContain("stripe-signature");
    });

    it("handles checkout.session.completed", () => {
      expect(stripeWebhookNextjs).toContain("checkout.session.completed");
    });

    it("handles subscription events", () => {
      expect(stripeWebhookNextjs).toContain("customer.subscription.created");
      expect(stripeWebhookNextjs).toContain("customer.subscription.updated");
      expect(stripeWebhookNextjs).toContain("customer.subscription.deleted");
    });

    it("handles invoice events", () => {
      expect(stripeWebhookNextjs).toContain("invoice.paid");
      expect(stripeWebhookNextjs).toContain("invoice.payment_failed");
    });

    it("returns 400 on invalid signature", () => {
      expect(stripeWebhookNextjs).toContain("400");
    });

    it("returns success response", () => {
      expect(stripeWebhookNextjs).toContain("received: true");
    });
  });

  describe("Remix template", () => {
    it("is a non-empty string", () => {
      expect(stripeWebhookRemix.length).toBeGreaterThan(100);
    });

    it("uses json response helper", () => {
      expect(stripeWebhookRemix).toContain("json");
    });

    it("exports action function", () => {
      expect(stripeWebhookRemix).toContain("action");
    });

    it("verifies webhook signature", () => {
      expect(stripeWebhookRemix).toContain("constructEvent");
    });
  });

  describe("SvelteKit template", () => {
    it("is a non-empty string", () => {
      expect(stripeWebhookSveltekit.length).toBeGreaterThan(100);
    });

    it("exports POST handler", () => {
      expect(stripeWebhookSveltekit).toContain("POST");
    });

    it("imports from @sveltejs/kit or uses json", () => {
      expect(stripeWebhookSveltekit).toContain("json");
    });

    it("verifies webhook signature", () => {
      expect(stripeWebhookSveltekit).toContain("constructEvent");
    });
  });

  describe("Nuxt template", () => {
    it("is a non-empty string", () => {
      expect(stripeWebhookNuxt.length).toBeGreaterThan(100);
    });

    it("uses defineEventHandler or similar", () => {
      expect(stripeWebhookNuxt).toContain("defineEventHandler");
    });

    it("verifies webhook signature", () => {
      expect(stripeWebhookNuxt).toContain("constructEvent");
    });
  });

  describe("Astro template", () => {
    it("is a non-empty string", () => {
      expect(stripeWebhookAstro.length).toBeGreaterThan(100);
    });

    it("exports POST handler", () => {
      expect(stripeWebhookAstro).toContain("POST");
    });

    it("verifies webhook signature", () => {
      expect(stripeWebhookAstro).toContain("constructEvent");
    });
  });

  describe("all templates handle the same events", () => {
    const templates = [
      { name: "nextjs", template: stripeWebhookNextjs },
      { name: "remix", template: stripeWebhookRemix },
      { name: "sveltekit", template: stripeWebhookSveltekit },
      { name: "nuxt", template: stripeWebhookNuxt },
      { name: "astro", template: stripeWebhookAstro },
    ];

    const requiredEvents = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
    ];

    for (const { name, template } of templates) {
      for (const event of requiredEvents) {
        it(`${name} handles ${event}`, () => {
          expect(template).toContain(event);
        });
      }
    }
  });

  describe("no template contains hardcoded secrets", () => {
    const templates = [
      stripeWebhookNextjs,
      stripeWebhookRemix,
      stripeWebhookSveltekit,
      stripeWebhookNuxt,
      stripeWebhookAstro,
    ];

    for (const template of templates) {
      it("does not contain sk_test_ or sk_live_", () => {
        expect(template).not.toMatch(/sk_(test|live)_/);
      });
      it("does not contain whsec_", () => {
        expect(template).not.toMatch(/whsec_[A-Za-z0-9]+/);
      });
    }
  });
});

describe("Auth templates", () => {
  describe("Clerk middleware", () => {
    it("imports clerkMiddleware", () => {
      expect(clerkMiddlewareNextjs).toContain("clerkMiddleware");
    });

    it("imports createRouteMatcher", () => {
      expect(clerkMiddlewareNextjs).toContain("createRouteMatcher");
    });

    it("defines public routes", () => {
      expect(clerkMiddlewareNextjs).toContain("isPublicRoute");
    });

    it("protects non-public routes", () => {
      expect(clerkMiddlewareNextjs).toContain("auth.protect()");
    });

    it("allows webhooks as public route", () => {
      expect(clerkMiddlewareNextjs).toContain("api/webhooks");
    });

    it("exports middleware config with matcher", () => {
      expect(clerkMiddlewareNextjs).toContain("export const config");
      expect(clerkMiddlewareNextjs).toContain("matcher");
    });
  });

  describe("NextAuth config", () => {
    it("imports NextAuth", () => {
      expect(nextauthConfigNextjs).toContain("NextAuth");
    });

    it("configures GitHub and Google providers", () => {
      expect(nextauthConfigNextjs).toContain("GitHub");
      expect(nextauthConfigNextjs).toContain("Google");
    });

    it("exports auth, handlers, signIn, signOut", () => {
      expect(nextauthConfigNextjs).toContain("handlers");
      expect(nextauthConfigNextjs).toContain("signIn");
      expect(nextauthConfigNextjs).toContain("signOut");
      expect(nextauthConfigNextjs).toContain("auth");
    });

    it("has a signIn page configured", () => {
      expect(nextauthConfigNextjs).toContain("signIn:");
    });
  });

  describe("NextAuth route handler", () => {
    it("re-exports GET and POST from handlers", () => {
      expect(nextauthRouteHandler).toContain("GET");
      expect(nextauthRouteHandler).toContain("POST");
      expect(nextauthRouteHandler).toContain("handlers");
    });
  });

  describe("NextAuth middleware", () => {
    it("exports auth as middleware", () => {
      expect(nextauthMiddleware).toContain("auth as middleware");
    });

    it("has matcher config", () => {
      expect(nextauthMiddleware).toContain("matcher");
    });
  });

  describe("Better Auth config", () => {
    it("imports betterAuth", () => {
      expect(betterAuthConfig).toContain("betterAuth");
    });

    it("configures database", () => {
      expect(betterAuthConfig).toContain("DATABASE_URL");
    });

    it("enables email and password", () => {
      expect(betterAuthConfig).toContain("emailAndPassword");
    });

    it("configures social providers", () => {
      expect(betterAuthConfig).toContain("GITHUB_CLIENT_ID");
      expect(betterAuthConfig).toContain("GOOGLE_CLIENT_ID");
    });

    it("does not contain hardcoded secrets", () => {
      expect(betterAuthConfig).not.toMatch(/ghp_/);
      expect(betterAuthConfig).not.toMatch(/sk_/);
    });
  });

  describe("Better Auth client", () => {
    it("imports createAuthClient", () => {
      expect(betterAuthClient).toContain("createAuthClient");
    });

    it("exports authClient", () => {
      expect(betterAuthClient).toContain("authClient");
    });
  });
});

describe("renderTemplate with realistic templates", () => {
  it("renders a simple config template", () => {
    const template = `export const config = {
  name: "{{projectName}}",
  framework: "{{framework}}",
};`;

    const result = renderTemplate(template, {
      projectName: "my-saas",
      framework: "nextjs",
    });

    expect(result).toContain('name: "my-saas"');
    expect(result).toContain('framework: "nextjs"');
  });

  it("renders template with conditional sections", () => {
    const template = `{{projectName}} {{version}}`;

    const result = renderTemplate(template, {
      projectName: "app",
      framework: "nextjs",
      version: "1.0.0",
    });

    expect(result).toBe("app 1.0.0");
  });

  it("handles special characters in values", () => {
    const template = "url={{dbUrl}}";
    const result = renderTemplate(template, {
      projectName: "app",
      framework: "nextjs",
      dbUrl: "postgres://user:p@ss=word@host:5432/db?ssl=true",
    });
    expect(result).toBe("url=postgres://user:p@ss=word@host:5432/db?ssl=true");
  });
});
