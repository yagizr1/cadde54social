#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/cadde54}"
REPO="https://github.com/yagizr1/cadde54social.git"
PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL5sOS0f1z8sggZ8bHtBr4DGXOEDqxXRyrGqU7eQc+x8 yagiztalhaar1@gmail.com'

echo "== Cadde54 deploy =="

for d in "$HOME/.ssh" /root/.ssh /home/yagiz/.ssh; do
  mkdir -p "$d" 2>/dev/null || true
  if [ -d "$d" ]; then
    grep -qxF "$PUB" "$d/authorized_keys" 2>/dev/null || echo "$PUB" >> "$d/authorized_keys"
    chmod 700 "$d" 2>/dev/null || true
    chmod 600 "$d/authorized_keys" 2>/dev/null || true
  fi
done

export DEBIAN_FRONTEND=noninteractive
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y git curl
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
npm ci
npm run build

if [ ! -f .env ]; then
  cp .env.example .env
  echo "PORT=5174" >> .env
fi

mkdir -p server/data server/uploads

if ! command -v pm2 >/dev/null 2>&1; then
  npm i -g pm2
fi

pm2 delete cadde54 >/dev/null 2>&1 || true
PORT=5174 pm2 start server/index.mjs --name cadde54 --cwd "$APP_DIR"
pm2 save
pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 || true

curl -fsS http://127.0.0.1:5174/api/health || true
echo "== bitti: $APP_DIR =="
