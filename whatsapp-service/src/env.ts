import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url(),
  SHARED_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REMINDER_CRON: z.string().default("0 8 * * *"),
  REMINDER_WINDOW_DAYS: z.coerce.number().int().positive().default(2),
});

export const env = envSchema.parse(process.env);
