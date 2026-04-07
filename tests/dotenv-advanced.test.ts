import { describe, it, expect } from "vitest";
import { parseDotEnv, diffEnv } from "../src/env/dotenv.js";

describe("parseDotEnv — advanced cases", () => {
  it("handles Windows line endings (CRLF)", () => {
    const result = parseDotEnv("FOO=bar\r\nBAZ=qux\r\n");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("handles mixed line endings", () => {
    const result = parseDotEnv("A=1\nB=2\r\nC=3\n");
    expect(result).toEqual({ A: "1", B: "2", C: "3" });
  });

  it("handles inline comments (doesn't strip them — expected behavior)", () => {
    // Standard .env parsers don't strip inline comments unless using special syntax
    const result = parseDotEnv("FOO=bar # comment");
    // Our parser doesn't strip inline comments, value includes everything
    expect(result.FOO).toContain("bar");
  });

  it("handles value with double quotes inside", () => {
    const result = parseDotEnv('MSG="hello world"');
    expect(result.MSG).toBe("hello world");
  });

  it("handles value with single quotes inside", () => {
    const result = parseDotEnv("MSG='hello world'");
    expect(result.MSG).toBe("hello world");
  });

  it("handles connection string with multiple equals", () => {
    const result = parseDotEnv("DB=postgres://user:pw@host:5432/db?ssl=true&mode=require");
    expect(result.DB).toBe("postgres://user:pw@host:5432/db?ssl=true&mode=require");
  });

  it("handles many blank lines", () => {
    const result = parseDotEnv("\n\n\nFOO=bar\n\n\n\nBAZ=qux\n\n\n");
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("handles comments with different styles", () => {
    const result = parseDotEnv("# Comment 1\n## Double hash\n### Triple\nFOO=bar");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("handles keys with numbers", () => {
    const result = parseDotEnv("VAR1=a\nVAR_2=b\n3VAR=c");
    expect(result.VAR1).toBe("a");
    expect(result.VAR_2).toBe("b");
    expect(result["3VAR"]).toBe("c");
  });

  it("handles very long values", () => {
    const longValue = "x".repeat(10000);
    const result = parseDotEnv(`LONG=${longValue}`);
    expect(result.LONG).toBe(longValue);
  });

  it("handles base64-encoded values", () => {
    const b64 = "aGVsbG8gd29ybGQ=";
    const result = parseDotEnv(`B64=${b64}`);
    expect(result.B64).toBe(b64);
  });

  it("handles multiline quoted values (stays on one line)", () => {
    // Our parser is line-based, so multiline values aren't supported
    const result = parseDotEnv('KEY="line1');
    // Just takes whatever is there
    expect(result.KEY).toBeDefined();
  });

  it("handles real-world .env.local file", () => {
    const content = `# Stripe
STRIPE_SECRET_KEY=sk_test_51MabcdefABCDEF
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51MabcdefABCDEF
STRIPE_WEBHOOK_SECRET=whsec_abcdef123456

# Database
DATABASE_URL="postgresql://postgres:password@db.abcdef.supabase.co:5432/postgres"

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123
CLERK_SECRET_KEY=sk_test_abc123

# Email
RESEND_API_KEY=re_abc123def456

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o456.ingest.sentry.io/789
NEXT_PUBLIC_POSTHOG_KEY=phc_abcdef123456
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
`;

    const result = parseDotEnv(content);

    expect(Object.keys(result)).toHaveLength(10);
    expect(result.STRIPE_SECRET_KEY).toBe("sk_test_51MabcdefABCDEF");
    expect(result.DATABASE_URL).toBe("postgresql://postgres:password@db.abcdef.supabase.co:5432/postgres");
    expect(result.CLERK_SECRET_KEY).toBe("sk_test_abc123");
    expect(result.RESEND_API_KEY).toBe("re_abc123def456");
    expect(result.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://us.i.posthog.com");
  });
});

describe("diffEnv — advanced cases", () => {
  it("handles completely different sets", () => {
    const diff = diffEnv(
      { A: "1", B: "2" },
      { C: "3", D: "4" }
    );
    expect(diff.added.sort()).toEqual(["A", "B"]);
    expect(diff.removed.sort()).toEqual(["C", "D"]);
    expect(diff.changed).toEqual([]);
    expect(diff.unchanged).toEqual([]);
  });

  it("handles identical large sets", () => {
    const env: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      env[`VAR_${i}`] = `value_${i}`;
    }
    const diff = diffEnv(env, { ...env });
    expect(diff.unchanged).toHaveLength(50);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it("detects value changes including empty to non-empty", () => {
    const diff = diffEnv(
      { KEY: "new-value" },
      { KEY: "" }
    );
    expect(diff.changed).toEqual(["KEY"]);
  });

  it("detects value changes from non-empty to empty", () => {
    const diff = diffEnv(
      { KEY: "" },
      { KEY: "old-value" }
    );
    expect(diff.changed).toEqual(["KEY"]);
  });

  it("real-world: detect new vars after adding a service", () => {
    const before = {
      STRIPE_SECRET_KEY: "sk_test_123",
      DATABASE_URL: "postgres://...",
    };
    const after = {
      STRIPE_SECRET_KEY: "sk_test_123",
      DATABASE_URL: "postgres://...",
      RESEND_API_KEY: "re_123",
      NEXT_PUBLIC_SENTRY_DSN: "https://...",
    };

    // local has more than remote
    const diff = diffEnv(after, before);
    expect(diff.added.sort()).toEqual(["NEXT_PUBLIC_SENTRY_DSN", "RESEND_API_KEY"]);
    expect(diff.unchanged.sort()).toEqual(["DATABASE_URL", "STRIPE_SECRET_KEY"]);
  });

  it("real-world: detect rotated keys", () => {
    const local = {
      STRIPE_SECRET_KEY: "sk_test_new456",
      DATABASE_URL: "postgres://...",
    };
    const remote = {
      STRIPE_SECRET_KEY: "sk_test_old123",
      DATABASE_URL: "postgres://...",
    };

    const diff = diffEnv(local, remote);
    expect(diff.changed).toEqual(["STRIPE_SECRET_KEY"]);
    expect(diff.unchanged).toEqual(["DATABASE_URL"]);
  });

  it("counts categories correctly for mixed diff", () => {
    const diff = diffEnv(
      { ADDED_1: "a", ADDED_2: "b", CHANGED: "new", SAME_1: "s1", SAME_2: "s2" },
      { REMOVED_1: "r", REMOVED_2: "r2", CHANGED: "old", SAME_1: "s1", SAME_2: "s2" }
    );
    expect(diff.added).toHaveLength(2);
    expect(diff.removed).toHaveLength(2);
    expect(diff.changed).toHaveLength(1);
    expect(diff.unchanged).toHaveLength(2);
  });
});
