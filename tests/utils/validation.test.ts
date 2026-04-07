import { describe, it, expect } from "vitest";
import {
  isStripeSecretKey,
  isStripePublishableKey,
  isGitHubToken,
  isVercelToken,
  isDomainName,
  isStripeWebhookSecret,
  isNonEmpty,
} from "../../src/utils/validation.js";

describe("isStripeSecretKey", () => {
  it("accepts valid test key", () => {
    expect(isStripeSecretKey("sk_test_abc123")).toBe(true);
  });
  it("accepts valid live key", () => {
    expect(isStripeSecretKey("sk_live_xyz789")).toBe(true);
  });
  it("rejects publishable key", () => {
    expect(isStripeSecretKey("pk_test_abc123")).toBe(false);
  });
  it("rejects empty string", () => {
    expect(isStripeSecretKey("")).toBe(false);
  });
  it("rejects key without prefix", () => {
    expect(isStripeSecretKey("abc123")).toBe(false);
  });
});

describe("isStripePublishableKey", () => {
  it("accepts valid test key", () => {
    expect(isStripePublishableKey("pk_test_abc123")).toBe(true);
  });
  it("accepts valid live key", () => {
    expect(isStripePublishableKey("pk_live_xyz789")).toBe(true);
  });
  it("rejects secret key", () => {
    expect(isStripePublishableKey("sk_test_abc123")).toBe(false);
  });
});

describe("isGitHubToken", () => {
  it("accepts ghp_ token", () => {
    expect(isGitHubToken("ghp_abc123XYZ")).toBe(true);
  });
  it("accepts ghs_ token", () => {
    expect(isGitHubToken("ghs_abc123XYZ")).toBe(true);
  });
  it("rejects random string", () => {
    expect(isGitHubToken("not_a_token")).toBe(false);
  });
});

describe("isVercelToken", () => {
  it("accepts long token", () => {
    expect(isVercelToken("abcdefghijk")).toBe(true);
  });
  it("rejects short string", () => {
    expect(isVercelToken("short")).toBe(false);
  });
});

describe("isDomainName", () => {
  it("accepts simple domain", () => {
    expect(isDomainName("example.com")).toBe(true);
  });
  it("accepts subdomain", () => {
    expect(isDomainName("app.example.com")).toBe(true);
  });
  it("rejects no TLD", () => {
    expect(isDomainName("localhost")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isDomainName("")).toBe(false);
  });
  it("rejects domain with space", () => {
    expect(isDomainName("my domain.com")).toBe(false);
  });
});

describe("isStripeWebhookSecret", () => {
  it("accepts valid secret", () => {
    expect(isStripeWebhookSecret("whsec_abc123")).toBe(true);
  });
  it("rejects without prefix", () => {
    expect(isStripeWebhookSecret("abc123")).toBe(false);
  });
});

describe("isNonEmpty", () => {
  it("returns true for non-empty string", () => {
    expect(isNonEmpty("hello")).toBe(true);
  });
  it("returns error message for empty string", () => {
    expect(isNonEmpty("")).toBe("This field is required.");
  });
  it("returns error message for whitespace-only string", () => {
    expect(isNonEmpty("   ")).toBe("This field is required.");
  });
});
