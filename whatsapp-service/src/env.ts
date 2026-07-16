import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url(),
  SHARED_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REMINDER_CRON: z.string().default("0 8 * * *"),
  REMINDER_WINDOW_DAYS: z.coerce.number().int().positive().default(2),
  // Localhost-only internal server so `backend` can trigger an immediate
  // reminder run on demand (used by mobile-app's testing button) — never
  // exposed publicly, see src/internal/triggerServer.ts.
  INTERNAL_PORT: z.coerce.number().int().positive().default(4001),
});

export const env = envSchema.parse(process.env);
