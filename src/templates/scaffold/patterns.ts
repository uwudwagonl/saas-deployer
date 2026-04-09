export const softDeleteMigrationPrisma = `// Add to your Prisma schema for soft delete support:
//
// model User {
//   id        String    @id @default(cuid())
//   email     String    @unique
//   deletedAt DateTime? // null = active, set = soft-deleted
//   createdAt DateTime  @default(now())
//   updatedAt DateTime  @updatedAt
// }
//
// Query pattern:
//   prisma.user.findMany({ where: { deletedAt: null } })
//
// Soft delete:
//   prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })
`;

export const auditLogSchema = `// Prisma schema for audit logging:
//
// model AuditLog {
//   id         String   @id @default(cuid())
//   action     String   // "user.login", "team.member.removed", "billing.plan.changed"
//   actorId    String   // Who performed the action
//   actorEmail String?
//   targetType String?  // "User", "Team", "Subscription"
//   targetId   String?
//   metadata   Json?    // Additional context
//   ipAddress  String?
//   userAgent  String?
//   tenantId   String   // For multi-tenant isolation
//   createdAt  DateTime @default(now())
//
//   @@index([tenantId, createdAt])
//   @@index([actorId])
//   @@index([action])
// }
`;

export const auditLogUtil = `// src/lib/audit-log.ts
// Usage: await audit("user.login", { actorId: user.id, tenantId: org.id, metadata: { ip } })

interface AuditEntry {
  action: string;
  actorId: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
}

export async function audit(action: string, entry: Omit<AuditEntry, "action">) {
  // TODO: Replace with your DB client
  // await prisma.auditLog.create({ data: { action, ...entry } });
  console.log("[audit]", JSON.stringify({ action, ...entry, timestamp: new Date().toISOString() }));
}
`;

export const featureGateUtil = `// src/lib/feature-gate.ts
// Backend-enforced feature gating based on plan

type Plan = "free" | "starter" | "pro" | "enterprise";

interface PlanLimits {
  maxTeamMembers: number;
  maxProjects: number;
  maxStorageMB: number;
  features: string[];
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxTeamMembers: 1,
    maxProjects: 3,
    maxStorageMB: 100,
    features: ["basic"],
  },
  starter: {
    maxTeamMembers: 5,
    maxProjects: 10,
    maxStorageMB: 1_000,
    features: ["basic", "api-access", "webhooks"],
  },
  pro: {
    maxTeamMembers: 25,
    maxProjects: 50,
    maxStorageMB: 10_000,
    features: ["basic", "api-access", "webhooks", "custom-domain", "priority-support"],
  },
  enterprise: {
    maxTeamMembers: Infinity,
    maxProjects: Infinity,
    maxStorageMB: Infinity,
    features: ["basic", "api-access", "webhooks", "custom-domain", "priority-support", "sso", "audit-log", "sla"],
  },
};

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function hasFeature(plan: Plan, feature: string): boolean {
  return PLAN_LIMITS[plan].features.includes(feature);
}

export function isWithinLimit(plan: Plan, resource: keyof Omit<PlanLimits, "features">, current: number): boolean {
  return current < PLAN_LIMITS[plan][resource];
}

// Usage in API route:
// if (!hasFeature(user.plan, "api-access")) {
//   return new Response("Upgrade required", { status: 403 });
// }
`;

export const paginationHelper = `// src/lib/pagination.ts
// Always paginate database reads — never load unbounded datasets

interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function parsePagination(params: PaginationParams) {
  const maxLimit = params.maxLimit ?? 100;
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? 20), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Usage with Prisma:
// const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit });
// const [data, total] = await Promise.all([
//   prisma.post.findMany({ where: { tenantId }, skip, take: limit, orderBy: { createdAt: "desc" } }),
//   prisma.post.count({ where: { tenantId } }),
// ]);
// return paginatedResponse(data, total, page, limit);
`;
