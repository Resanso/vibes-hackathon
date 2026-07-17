import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Global default — passwordHash never leaks into any response by
    // accident (every router just does ctx.db.profile.findUnique/update
    // without a manual select). The one place that genuinely needs it
    // (src/server/api/routers/auth.ts, to verify/set it) overrides this
    // per-query with `omit: { passwordHash: false }`.
    omit: {
      profile: {
        passwordHash: true,
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
