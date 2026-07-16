import { createServer } from "node:http";

import { BOT_SESSION_ID, getActiveSocket, logger } from "../connection.js";
import { env } from "../env.js";
import { sendDueReminders } from "../reminders/scheduler.js";

// Localhost-only — never proxied by Nginx, never given a public hostname.
// `backend`'s reminders.triggerNow mutation calls this over the loopback
// interface (same VPS) so mobile-app can trigger an immediate reminder run
// for testing, without waiting for the daily cron in scheduler.ts.
export function startTriggerServer(): void {
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

    const sock = getActiveSocket(BOT_SESSION_ID);
    if (!sock) {
      res.writeHead(503, { "Content-Type": "application/json" }).end(
        JSON.stringify({ error: "bot session not connected" }),
      );
      return;
    }

    sendDueReminders(sock, logger)
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
