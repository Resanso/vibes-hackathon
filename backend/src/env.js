import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SHARED_API_KEY: z.string().min(1),
    MAIA_API_KEY: z.string().optional(),
    MAIA_BASE_URL: z.string().url().optional(),
    // whatsapp-service's localhost-only internal trigger server (same VPS) —
    // used by reminders.triggerNow, see src/server/api/routers/reminders.ts
    WHATSAPP_SERVICE_URL: z.string().url().default("http://localhost:4001"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    SHARED_API_KEY: process.env.SHARED_API_KEY,
    MAIA_API_KEY: process.env.MAIA_API_KEY,
    MAIA_BASE_URL: process.env.MAIA_BASE_URL,
    WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
