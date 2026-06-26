#!/usr/bin/env bash
# ── MonteLand — First-time server setup ───────────────────────────────────────
# Run once on fresh Ubuntu 24.04:
#   ssh root@62.171.158.125 "bash -s" < scripts/setup-server.sh
#
# After this script: copy .env and run deploy.sh

set -euo pipefail

SERVER_USER="deploy"
APP_DIR="/home/${SERVER_USER}/apps/monteland"
REPO_URL="https://github.com/SerhiiRiabko/monteland-app.git"  # update if different

echo "=== [1/6] System update ==="
apt-get update -q && apt-get upgrade -y -q

echo "=== [2/6] Install Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

echo "=== [3/6] Install Nginx ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== [4/6] Create deploy user ==="
if ! id "$SERVER_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$SERVER_USER"
  usermod -aG docker "$SERVER_USER"
  echo "User '$SERVER_USER' created and added to docker group"
fi

echo "=== [5/6] Create app directory ==="
mkdir -p "$APP_DIR"
chown -R "${SERVER_USER}:${SERVER_USER}" "/home/${SERVER_USER}/apps"

echo "=== [6/6] Setup Nginx ==="
# Will be overwritten by actual config during deploy
cat > /etc/nginx/sites-available/monteland << 'NGINX_EOF'
server {
    listen 80 default_server;
    server_name _;
    location / { return 200 "MonteLand deploying..."; add_header Content-Type text/plain; }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/monteland /etc/nginx/sites-enabled/monteland
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== Server setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy .env to server:"
echo "     scp monteland-app/.env root@62.171.158.125:$APP_DIR/.env"
echo ""
echo "  2. Run deploy:"
echo "     ssh root@62.171.158.125 'bash $APP_DIR/scripts/deploy.sh'"
echo ""
echo "  IMPORTANT: Before first deploy, set ADMIN_PASSWORD in .env"
echo "  Generate bcrypt hash:  python3 -c \"from passlib.hash import bcrypt; print(bcrypt.hash('YOUR_PASSWORD'))\""
