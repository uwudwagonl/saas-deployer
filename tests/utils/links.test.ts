import { describe, it, expect } from "vitest";
import { LINKS } from "../../src/providers/links.js";

describe("LINKS", () => {
  describe("all static URLs are valid HTTPS", () => {
    function extractUrls(obj: any, path = ""): { path: string; url: string }[] {
      const urls: { path: string; url: string }[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === "string") {
          urls.push({ path: currentPath, url: value });
        } else if (typeof value === "object" && value !== null && typeof value !== "function") {
          urls.push(...extractUrls(value, currentPath));
        }
      }
      return urls;
    }

    const allUrls = extractUrls(LINKS);

    for (const { path, url } of allUrls) {
      it(`${path} is a valid HTTPS URL`, () => {
        expect(url).toMatch(/^https:\/\//);
        // Should not have trailing whitespace
        expect(url).toBe(url.trim());
        // Should be parseable as URL
        expect(() => new URL(url)).not.toThrow();
      });
    }
  });

  describe("dynamic URL generators", () => {
    it("stripe.webhookDetail generates correct URL", () => {
      const url = LINKS.stripe.webhookDetail("we_123abc");
      expect(url).toBe("https://dashboard.stripe.com/webhooks/we_123abc");
    });

    it("supabase.apiSettings generates correct URL", () => {
      const url = LINKS.supabase.apiSettings("abcref123");
      expect(url).toBe("https://supabase.com/dashboard/project/abcref123/settings/api");
    });

    it("clerk.apiKeys generates correct URL", () => {
      const url = LINKS.clerk.apiKeys("app_abc");
      expect(url).toBe("https://dashboard.clerk.com/apps/app_abc/instances/default/api-keys");
    });
  });

  describe("all service categories are present", () => {
    it("has stripe links", () => {
      expect(LINKS.stripe).toBeDefined();
      expect(LINKS.stripe.signup).toBeDefined();
      expect(LINKS.stripe.apiKeys).toBeDefined();
      expect(LINKS.stripe.testApiKeys).toBeDefined();
      expect(LINKS.stripe.webhooks).toBeDefined();
      expect(LINKS.stripe.products).toBeDefined();
      expect(LINKS.stripe.tax).toBeDefined();
      expect(LINKS.stripe.customerPortal).toBeDefined();
    });

    it("has github links", () => {
      expect(LINKS.github).toBeDefined();
      expect(LINKS.github.signup).toBeDefined();
      expect(LINKS.github.pat).toBeDefined();
      expect(LINKS.github.newRepo).toBeDefined();
      expect(LINKS.github.installGhCli).toBeDefined();
    });

    it("has vercel links", () => {
      expect(LINKS.vercel).toBeDefined();
      expect(LINKS.vercel.signup).toBeDefined();
      expect(LINKS.vercel.tokens).toBeDefined();
    });

    it("has database provider links", () => {
      expect(LINKS.supabase).toBeDefined();
      expect(LINKS.neon).toBeDefined();
      expect(LINKS.planetscale).toBeDefined();
      expect(LINKS.turso).toBeDefined();
    });

    it("has auth links", () => {
      expect(LINKS.clerk).toBeDefined();
    });

    it("has email provider links", () => {
      expect(LINKS.resend).toBeDefined();
      expect(LINKS.sendgrid).toBeDefined();
      expect(LINKS.postmark).toBeDefined();
    });

    it("has monitoring links", () => {
      expect(LINKS.sentry).toBeDefined();
      expect(LINKS.posthog).toBeDefined();
    });

    it("has DNS/domain links", () => {
      expect(LINKS.cloudflare).toBeDefined();
    });
  });

  describe("signup URLs point to sign-up pages", () => {
    it("stripe signup", () => {
      expect(LINKS.stripe.signup).toContain("register");
    });
    it("github signup", () => {
      expect(LINKS.github.signup).toContain("signup");
    });
    it("vercel signup", () => {
      expect(LINKS.vercel.signup).toContain("signup");
    });
    it("supabase signup", () => {
      expect(LINKS.supabase.signup).toContain("sign-up");
    });
    it("neon signup", () => {
      expect(LINKS.neon.signup).toContain("signup");
    });
    it("sentry signup", () => {
      expect(LINKS.sentry.signup).toContain("signup");
    });
  });
});
