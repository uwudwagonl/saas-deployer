import { describe, it, expect } from "vitest";
import { stripeWebhookNextjs } from "../src/templates/stripe/webhook-handler.nextjs.js";
import { stripeWebhookRemix } from "../src/templates/stripe/webhook-handler.remix.js";
import { stripeWebhookSveltekit } from "../src/templates/stripe/webhook-handler.sveltekit.js";
import { stripeWebhookNuxt } from "../src/templates/stripe/webhook-handler.nuxt.js";
import { stripeWebhookAstro } from "../src/templates/stripe/webhook-handler.astro.js";

// The WEBHOOK_ROUTES mapping from stripe provider
const WEBHOOK_ROUTES: Record<string, { path: string; template: string }> = {
  nextjs: { path: "app/api/webhooks/stripe/route.ts", template: stripeWebhookNextjs },
  remix: { path: "app/routes/api.webhooks.stripe.ts", template: stripeWebhookRemix },
  sveltekit: { path: "src/routes/api/webhooks/stripe/+server.ts", template: stripeWebhookSveltekit },
  nuxt: { path: "server/api/webhooks/stripe.post.ts", template: stripeWebhookNuxt },
  astro: { path: "src/pages/api/webhooks/stripe.ts", template: stripeWebhookAstro },
};

describe("webhook route configuration", () => {
  it("has routes for all 5 frameworks", () => {
    expect(Object.keys(WEBHOOK_ROUTES)).toEqual(["nextjs", "remix", "sveltekit", "nuxt", "astro"]);
  });

  it("all paths are TypeScript files", () => {
    for (const [, route] of Object.entries(WEBHOOK_ROUTES)) {
      expect(route.path).toMatch(/\.ts$/);
    }
  });

  it("all paths are relative (no leading slash)", () => {
    for (const [, route] of Object.entries(WEBHOOK_ROUTES)) {
      expect(route.path).not.toMatch(/^\//);
    }
  });

  it("all templates are non-empty strings", () => {
    for (const [, route] of Object.entries(WEBHOOK_ROUTES)) {
      expect(typeof route.template).toBe("string");
      expect(route.template.length).toBeGreaterThan(200);
    }
  });
});

describe("framework-specific path conventions", () => {
  it("Next.js uses App Router convention", () => {
    expect(WEBHOOK_ROUTES.nextjs.path).toMatch(/^app\//);
    expect(WEBHOOK_ROUTES.nextjs.path).toContain("route.ts");
  });

  it("Remix uses flat file routes", () => {
    expect(WEBHOOK_ROUTES.remix.path).toMatch(/^app\/routes\//);
    expect(WEBHOOK_ROUTES.remix.path).toContain("api.webhooks.stripe");
  });

  it("SvelteKit uses +server.ts convention", () => {
    expect(WEBHOOK_ROUTES.sveltekit.path).toMatch(/^src\/routes\//);
    expect(WEBHOOK_ROUTES.sveltekit.path).toContain("+server.ts");
  });

  it("Nuxt uses server/api directory", () => {
    expect(WEBHOOK_ROUTES.nuxt.path).toMatch(/^server\/api\//);
    expect(WEBHOOK_ROUTES.nuxt.path).toContain(".post.ts");
  });

  it("Astro uses src/pages/api directory", () => {
    expect(WEBHOOK_ROUTES.astro.path).toMatch(/^src\/pages\/api\//);
  });
});

describe("framework-specific template imports", () => {
  it("Next.js imports from next/*", () => {
    expect(stripeWebhookNextjs).toContain("next/headers");
    expect(stripeWebhookNextjs).toContain("next/server");
  });

  it("Remix imports from @remix-run/*", () => {
    expect(stripeWebhookRemix).toContain("@remix-run");
  });

  it("SvelteKit imports from @sveltejs/kit", () => {
    expect(stripeWebhookSveltekit).toContain("@sveltejs/kit");
  });

  it("SvelteKit uses $env/static/private", () => {
    expect(stripeWebhookSveltekit).toContain("$env/static/private");
  });

  it("Nuxt uses defineEventHandler", () => {
    expect(stripeWebhookNuxt).toContain("defineEventHandler");
  });

  it("Nuxt uses readRawBody", () => {
    expect(stripeWebhookNuxt).toContain("readRawBody");
  });

  it("Astro uses APIRoute type", () => {
    expect(stripeWebhookAstro).toContain("APIRoute");
  });

  it("Astro uses import.meta.env", () => {
    expect(stripeWebhookAstro).toContain("import.meta.env");
  });
});

describe("webhook security patterns", () => {
  const templates = [
    { name: "nextjs", template: stripeWebhookNextjs },
    { name: "remix", template: stripeWebhookRemix },
    { name: "sveltekit", template: stripeWebhookSveltekit },
    { name: "nuxt", template: stripeWebhookNuxt },
    { name: "astro", template: stripeWebhookAstro },
  ];

  for (const { name, template } of templates) {
    describe(name, () => {
      it("reads raw body (not parsed JSON)", () => {
        // Most use .text(), Nuxt uses readRawBody
        expect(template).toMatch(/\.text\(\)|readRawBody/);
      });

      it("extracts stripe-signature header", () => {
        expect(template).toContain("stripe-signature");
      });

      it("calls constructEvent for verification", () => {
        expect(template).toContain("constructEvent");
      });

      it("returns error on failed verification", () => {
        expect(template).toMatch(/(400|error|Error)/);
      });

      it("uses a switch statement for event types", () => {
        expect(template).toContain("switch");
        // Nuxt uses stripeEvent.type to avoid shadowing the Nuxt `event` parameter
        expect(template).toMatch(/event\.type|stripeEvent\.type/);
      });

      it("has TODO comments for customization", () => {
        expect(template).toContain("TODO");
      });

      it("has a default/fallback case", () => {
        expect(template).toContain("default:");
      });
    });
  }
});
