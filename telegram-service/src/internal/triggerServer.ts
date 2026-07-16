import { createServer } from "node:http";
import type { Api } from "grammy";

import { env } from "../env.js";
import { logger } from "../logger.js";
import { sendDueReminders } from "../reminders/scheduler.js";

// Localhost-only — never proxied by Nginx, never given a public hostname.
// Same shape as whatsapp-service's internal/triggerServer.ts, on a
// different default port (4002) so both services can run on the same VPS.
// `backend`'s reminders.triggerNow (channel: "telegram") calls this.
export function startTriggerServer(api: Api): void {
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/trigger-reminders") {
      res.writeHead(404).end();
      return;
    }

    if (req.headers["x-api-key"] !== env.SHARED_API_KEY) {
      res.writeHead(401, { "Content-Type": "application/json" }).end(
        JSON.stringify({ error: "unauthorized" }),
      );
      return;
    }

    sendDueReminders(api, logger)
      .then((count) => {
        res.writeHead(200, { "Content-Type": "application/json" }).end(
          JSON.stringify({ sent: count }),
        );
      })
      .catch((error: unknown) => {
        logger.error({ error }, "Manual reminder trigger failed");
        res.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({ error: "failed to send reminders" }),
        );
      });
  });

  server.listen(env.INTERNAL_PORT, "127.0.0.1", () => {
    logger.info({ port: env.INTERNAL_PORT }, "Internal trigger server listening");
  });
}
