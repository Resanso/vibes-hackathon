#!/usr/bin/env bash
# Deploy whatsapp-service/ to the VPS over the `nera-vps` SSH alias (see
# ~/.ssh/config and docs/deployment.md "Remote access"). Syncs source,
# installs dependencies only if package.json/package-lock.json changed,
# restarts the PM2 process, and prints `pm2 status` to confirm.
set -euo pipefail

REMOTE_HOST="nera-vps"
REMOTE_PATH="/root/nera/whatsapp-service"
PM2_APP="nera-whatsapp"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../whatsapp-service" && pwd)"

echo "==> Syncing $LOCAL_PATH -> $REMOTE_HOST:$REMOTE_PATH"
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

CHANGES=$(rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude 'generated' \
  --exclude '*.tsbuildinfo' \
  -e ssh \
  --itemize-changes \
  "$LOCAL_PATH/" "$REMOTE_HOST:$REMOTE_PATH/")

echo "$CHANGES"

if echo "$CHANGES" | grep -qE 'package(-lock)?\.json$'; then
  echo "==> package.json changed, installing dependencies on VPS"
  ssh "$REMOTE_HOST" "cd $REMOTE_PATH && npm install"
else
  echo "==> package.json unchanged, skipping npm install"
fi

echo "==> Building"
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && npm run build"

echo "==> Restarting PM2 process: $PM2_APP"
ssh "$REMOTE_HOST" "cd $REMOTE_PATH && (pm2 restart $PM2_APP || pm2 start npm --name $PM2_APP -- start)"

echo "==> pm2 status"
ssh "$REMOTE_HOST" "pm2 status"
