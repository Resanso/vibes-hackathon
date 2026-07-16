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

- `backend`: `npm run build && pm2 start npm --name nera-backend -- start` (inside `/root/nera/backend`)
- `whatsapp-service`: `npm run build && pm2 start npm --name nera-whatsapp -- start` (inside `/root/nera/whatsapp-service`)

Both are managed by `scripts/deploy-backend.sh` and `scripts/deploy-whatsapp.sh`
from the repo root — see "Remote access" below.

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

## Remote access

SSH access to the VPS is key-based only, via an alias in each team member's
own `~/.ssh/config` (never committed — see "Gotchas" below):

```
Host nera-vps
    HostName 103.235.75.245
    User root
    IdentityFile ~/.ssh/<your-key-with-access>
    IdentitiesOnly yes
```

Once that's added, `ssh nera-vps` connects directly — no host/user/key to
remember or type. This VPS also hosts an unrelated project (`mentio`) under a
different user account; `nera`'s code lives at `/root/nera/{backend,whatsapp-service}`,
kept separate from that.

**Deploying:**

```bash
./scripts/deploy-backend.sh     # rsync backend/ -> VPS, npm install if package.json changed, pm2 restart nera-backend
./scripts/deploy-whatsapp.sh    # same for whatsapp-service, plus a build step (compiled TS)
```

Both scripts print `pm2 status` at the end so you can confirm the process is
actually up, not just that the script exited 0.

**Getting SSH access**: ask whoever manages the VPS to add your public key to
`/root/.ssh/authorized_keys`. There's no shared/password credential — each
person authenticates with their own key.

## Gotchas

- Claude Code's permission for this alias is scoped narrowly —
  `.claude/settings.json` allows `Bash(ssh nera-vps *)`, not SSH to arbitrary
  hosts.
- `~/.ssh/config` and private keys live outside this repo and must never be
  committed — see the root `.gitignore` (`.ssh/`, `id_rsa*`, `id_ed25519*`,
  `*.pem`).
- `/root/nera` is root-owned (SSH access is as `root`, not a dedicated deploy
  user) — be deliberate with any command run there, especially anything with
  `rm`/`--delete` semantics.
