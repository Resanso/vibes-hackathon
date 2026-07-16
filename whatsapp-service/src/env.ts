import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url(),
  SHARED_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REMINDER_CRON: z.string().default("0 8 * * *"),
  REMINDER_WINDOW_DAYS: z.coerce.number().int().positive().default(2),
  // Daily "sudah nyisihkan uang?" check-in reminder — evening by default, so
  // it's the last nudge of the day for "State 2" loan-tracking users (see
  // src/reminders/checkInScheduler.ts).
  CHECKIN_REMINDER_CRON: z.string().default("0 20 * * *"),
  // Localhost-only internal server so `backend` can trigger an immediate
  // reminder run on demand (used by mobile-app's testing button) — never
  // exposed publicly, see src/internal/triggerServer.ts.
  INTERNAL_PORT: z.coerce.number().int().positive().default(4001),
});

export const env = envSchema.parse(process.env);
