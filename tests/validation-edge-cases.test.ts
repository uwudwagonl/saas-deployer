import { describe, it, expect } from "vitest";
import {
  isStripeSecretKey,
  isStripePublishableKey,
  isGitHubToken,
  isVercelToken,
  isDomainName,
  isStripeWebhookSecret,
  isNonEmpty,
} from "../src/utils/validation.js";

describe("isStripeSecretKey — edge cases", () => {
  it("rejects key with only prefix", () => {
    expect(isStripeSecretKey("sk_test_")).toBe(false);
  });

  it("accepts long key", () => {
    expect(isStripeSecretKey("sk_test_" + "a".repeat(200))).toBe(true);
  });

  it("rejects key with spaces", () => {
    expect(isStripeSecretKey("sk_test_ abc")).toBe(false);
  });

  it("rejects key with special characters", () => {
    expect(isStripeSecretKey("sk_test_abc!@#$")).toBe(false);
  });

  it("rejects key with dashes", () => {
    expect(isStripeSecretKey("sk_test_abc-def")).toBe(false);
  });

  it("accepts key with mixed case and numbers", () => {
    expect(isStripeSecretKey("sk_test_AbCdEf123456789")).toBe(true);
  });

  it("rejects sk_staging_ prefix", () => {
    expect(isStripeSecretKey("sk_staging_abc")).toBe(false);
  });
});

describe("isStripePublishableKey — edge cases", () => {
  it("rejects key with only prefix", () => {
    expect(isStripePublishableKey("pk_test_")).toBe(false);
  });

  it("accepts long key", () => {
    expect(isStripePublishableKey("pk_live_" + "Z".repeat(100))).toBe(true);
  });

  it("rejects key with newline", () => {
    expect(isStripePublishableKey("pk_test_abc\n")).toBe(false);
  });
});

describe("isGitHubToken — edge cases", () => {
  it("rejects gho_ prefix (OAuth tokens)", () => {
    expect(isGitHubToken("gho_abc123")).toBe(false);
  });

  it("rejects ghu_ prefix", () => {
    expect(isGitHubToken("ghu_abc123")).toBe(false);
  });

  it("accepts token with underscores", () => {
    expect(isGitHubToken("ghp_abc_def_123")).toBe(true);
  });

  it("rejects empty after prefix", () => {
    expect(isGitHubToken("ghp_")).toBe(false);
  });

  it("rejects token with spaces", () => {
    expect(isGitHubToken("ghp_abc 123")).toBe(false);
  });
});

describe("isVercelToken — edge cases", () => {
  it("rejects 10-char string (boundary)", () => {
    expect(isVercelToken("1234567890")).toBe(false);
  });

  it("accepts 11-char string (boundary)", () => {
    expect(isVercelToken("12345678901")).toBe(true);
  });

  it("accepts very long token", () => {
    expect(isVercelToken("a".repeat(500))).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isVercelToken("")).toBe(false);
  });
});

describe("isDomainName — edge cases", () => {
  it("rejects IP address", () => {
    expect(isDomainName("192.168.1.1")).toBe(false);
  });

  it("rejects domain starting with dash", () => {
    expect(isDomainName("-example.com")).toBe(false);
  });

  it("rejects domain ending with dash", () => {
    expect(isDomainName("example-.com")).toBe(false);
  });

  it("accepts single-letter domain", () => {
    expect(isDomainName("x.io")).toBe(true);
  });

  it("rejects domain with single-char subdomains", () => {
    // Regex requires 2+ chars between dots for middle segments
    expect(isDomainName("a.b.c.d.example.com")).toBe(false);
  });

  it("accepts domain with proper subdomains", () => {
    expect(isDomainName("app.staging.example.com")).toBe(true);
  });

  it("rejects domain with protocol", () => {
    expect(isDomainName("https://example.com")).toBe(false);
  });

  it("rejects domain with path", () => {
    expect(isDomainName("example.com/path")).toBe(false);
  });

  it("rejects domain with port", () => {
    expect(isDomainName("example.com:3000")).toBe(false);
  });

  it("accepts long TLD", () => {
    expect(isDomainName("example.technology")).toBe(true);
  });

  it("rejects single-char TLD", () => {
    expect(isDomainName("example.x")).toBe(false);
  });

  it("accepts domain with numbers", () => {
    expect(isDomainName("app123.example.com")).toBe(true);
  });

  it("accepts domain with hyphens in subdomain", () => {
    expect(isDomainName("my-cool-app.example.com")).toBe(true);
  });

  it("rejects domain with underscore", () => {
    expect(isDomainName("my_app.example.com")).toBe(false);
  });
});

describe("isStripeWebhookSecret — edge cases", () => {
  it("rejects empty string", () => {
    expect(isStripeWebhookSecret("")).toBe(false);
  });

  it("rejects just prefix", () => {
    expect(isStripeWebhookSecret("whsec_")).toBe(false);
  });

  it("accepts long secret", () => {
    expect(isStripeWebhookSecret("whsec_" + "a".repeat(100))).toBe(true);
  });

  it("rejects with wrong prefix", () => {
    expect(isStripeWebhookSecret("webhook_secret_abc")).toBe(false);
  });
});

describe("isNonEmpty — edge cases", () => {
  it("accepts string with only special characters", () => {
    expect(isNonEmpty("!@#$")).toBe(true);
  });

  it("returns error for tab-only string", () => {
    expect(isNonEmpty("\t\t")).toBe("This field is required.");
  });

  it("returns error for newline-only string", () => {
    expect(isNonEmpty("\n\n")).toBe("This field is required.");
  });

  it("accepts single character", () => {
    expect(isNonEmpty("a")).toBe(true);
  });

  it("accepts string with leading/trailing spaces plus content", () => {
    expect(isNonEmpty("  hello  ")).toBe(true);
  });
});
