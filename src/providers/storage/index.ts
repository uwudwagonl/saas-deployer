import type { Provider, ProviderContext, ProviderResult, PreflightResult } from "../types.js";
import { log } from "../../ui/logger.js";
import { select, input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import type { SaasConfig } from "../../config/schema.js";

type StorageProvider = NonNullable<SaasConfig["storage"]>["provider"];

export const storageProvider: Provider = {
  name: "storage",
  displayName: "File Storage",
  description: "Set up object storage (Cloudflare R2, S3, UploadThing, Supabase Storage)",
  category: "storage",
  requiredCredentialKeys: [],
  dependsOn: [],

  async preflight(): Promise<PreflightResult> {
    return { ready: true, missingCredentials: [], missingDependencies: [], warnings: [] };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("File & Object Storage Setup");
    const envVars: Record<string, string> = {};

    const provider = await select<StorageProvider>({
      message: "Select your storage provider:",
      choices: [
        { name: "Cloudflare R2 — S3-compatible, no egress fees", value: "cloudflare-r2" },
        { name: "AWS S3 — Industry standard object storage", value: "s3" },
        { name: "UploadThing — Simple file uploads for TypeScript apps", value: "uploadthing" },
        { name: "Supabase Storage — Built into your Supabase project", value: "supabase-storage" },
      ],
    });

    switch (provider) {
      case "cloudflare-r2": {
        log.info("Create an R2 bucket in Cloudflare Dashboard:");
        log.link(LINKS.cloudflare.r2);
        log.blank();
        const accountId = await input({ message: "Cloudflare Account ID:" });
        const accessKeyId = await password({ message: "R2 Access Key ID:" });
        const secretAccessKey = await password({ message: "R2 Secret Access Key:" });
        const bucketName = await input({ message: "Bucket name:", default: `${ctx.config.project.name}-uploads` });
        envVars["R2_ACCOUNT_ID"] = accountId;
        envVars["R2_ACCESS_KEY_ID"] = accessKeyId;
        envVars["R2_SECRET_ACCESS_KEY"] = secretAccessKey;
        envVars["R2_BUCKET_NAME"] = bucketName;
        envVars["R2_ENDPOINT"] = `https://${accountId}.r2.cloudflarestorage.com`;
        ctx.setCredential("r2_access_key_id", accessKeyId);
        ctx.setCredential("r2_secret_access_key", secretAccessKey);
        log.blank();
        log.info("Install the S3 SDK (R2 is S3-compatible):");
        log.dim("  npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner");
        break;
      }
      case "s3": {
        const accessKeyId = await password({ message: "AWS Access Key ID:" });
        const secretAccessKey = await password({ message: "AWS Secret Access Key:" });
        const region = await input({ message: "AWS Region:", default: "us-east-1" });
        const bucketName = await input({ message: "S3 Bucket name:", default: `${ctx.config.project.name}-uploads` });
        envVars["AWS_ACCESS_KEY_ID"] = accessKeyId;
        envVars["AWS_SECRET_ACCESS_KEY"] = secretAccessKey;
        envVars["AWS_REGION"] = region;
        envVars["S3_BUCKET_NAME"] = bucketName;
        ctx.setCredential("aws_access_key_id", accessKeyId);
        ctx.setCredential("aws_secret_access_key", secretAccessKey);
        log.blank();
        log.info("Install the SDK:");
        log.dim("  npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner");
        break;
      }
      case "uploadthing": {
        log.info("Sign up at UploadThing:");
        log.link(LINKS.uploadthing.signup);
        log.blank();
        const token = await password({ message: "UploadThing token:" });
        envVars["UPLOADTHING_TOKEN"] = token;
        ctx.setCredential("uploadthing_token", token);
        log.blank();
        log.info("Install the SDK:");
        log.dim("  npm i uploadthing @uploadthing/react");
        break;
      }
      case "supabase-storage": {
        if (!ctx.config.db || ctx.config.db.provider !== "supabase") {
          log.warn("Supabase Storage works best with Supabase as your DB provider.");
          log.info("Run `saas db` first to configure Supabase.");
        }
        log.info("Supabase Storage uses your existing Supabase project credentials.");
        log.info("Create a storage bucket in the Supabase dashboard:");
        log.link(LINKS.supabase.dashboard);
        const bucketName = await input({ message: "Bucket name:", default: "uploads" });
        envVars["STORAGE_BUCKET"] = bucketName;
        break;
      }
    }

    log.blank();
    log.success(`${provider} configured for file storage!`);
    log.blank();
    log.info("Best practices from the SaaS checklist:");
    log.dim("  - Always use signed URLs for file access (never expose bucket directly)");
    log.dim("  - Clean up orphaned uploads periodically");
    log.dim("  - Never store files on local disk in production");

    return {
      success: true,
      configUpdates: { storage: { provider, configured: true } },
      envVars,
    };
  },
};
