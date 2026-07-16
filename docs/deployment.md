# Deployment

Single VPS, no managed platform. One public domain for the API.

## Topology

- `backend` — Next.js API-only app, run under PM2, reverse-proxied by Nginx at
  `api.yourdomain.com`
- `whatsapp-service` — Node.js + Baileys, run under PM2 (no public HTTP surface
  of its own; it calls `backend`)
- PostgreSQL — Docker container on the same VPS, not exposed publicly
- `mobile-app` — not deployed to the VPS; distributed via Expo / app stores,
  calls `backend` over HTTPS

There is no dashboard domain — only `api.yourdomain.com` exists.

## PM2

- `backend`: `npm run build && pm2 start npm --name backend -- start` (inside `backend/`)
- `whatsapp-service`: `pm2 start npm --name whatsapp-service -- start` (inside `whatsapp-service/`)

## Nginx

Reverse proxy `api.yourdomain.com` → `backend`'s local port. TLS via
Let's Encrypt/certbot on the same VPS.

## Database

PostgreSQL runs in Docker, data volume persisted on the VPS disk. `backend`
connects via `DATABASE_URL` pointed at the container's exposed local port (not
a cloud provider — this is self-hosted, unlike a typical Neon/Supabase setup).

## Environment variables

Set on the VPS (not committed) for `backend`:

- `DATABASE_URL` — local Postgres container connection string
- `MAIA_API_KEY`, `MAIA_BASE_URL` — MAIA Router credentials
- shared API key used by `mobile-app` and `whatsapp-service` to authenticate
  against `backend`

## Gotchas

<!-- Add as discovered during actual VPS setup. -->
