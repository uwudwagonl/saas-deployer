export const betterAuthConfig = `import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "pg", // Change to "mysql" or "sqlite" based on your DB
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
`;

export const betterAuthClient = `import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();
`;
