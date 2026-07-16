import { z } from "zod";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  BACKEND_URL: z.string().url(),
  SHARED_API_KEY: z.string().min(1),
  REMINDER_CRON: z.string().default("0 8 * * *"),
  REMINDER_WINDOW_DAYS: z.coerce.number().int().positive().default(2),
  // Daily "sudah nyisihkan uang?" check-in reminder — same schedule
  // reasoning as whatsapp-service's CHECKIN_REMINDER_CRON.
  CHECKIN_REMINDER_CRON: z.string().default("0 20 * * *"),
  // Localhost-only internal HTTP server so `backend`'s reminders.triggerNow
  // can fire an immediate reminder run on demand — never exposed publicly,
  // see src/internal/triggerServer.ts. Different default port from
  // whatsapp-service's 4001 since both can run on the same VPS at once.
  INTERNAL_PORT: z.coerce.number().int().positive().default(4002),
});

export const env = envSchema.parse(process.env);
