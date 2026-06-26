#!/usr/bin/env bash
# ── MonteLand — Deploy script ─────────────────────────────────────────────────
# Run on server or via SSH:
#   ssh root@62.171.158.125 "cd /home/deploy/apps/monteland && bash scripts/deploy.sh"
#
# Or from local Windows (Git Bash / WSL):
#   ssh root@62.171.158.125 "cd /home/deploy/apps/monteland && git pull && bash scripts/deploy.sh"

set -euo pipefail

APP_DIR="/home/deploy/apps/monteland"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$APP_DIR"

echo "=== [1/5] Git pull ==="
git fetch origin
git reset --hard origin/main
echo "Commit: $(git log -1 --oneline)"

echo "=== [2/5] Copy Nginx config ==="
cp nginx/monteland.conf /etc/nginx/sites-available/monteland
nginx -t && systemctl reload nginx
echo "Nginx reloaded"

echo "=== [3/5] Build & start containers ==="
$COMPOSE pull --ignore-pull-failures 2>/dev/null || true
$COMPOSE build --no-cache
$COMPOSE up -d --remove-orphans

echo "=== [4/5] Run Alembic migrations ==="
sleep 5   # wait for postgres to be ready
$COMPOSE exec -T backend alembic upgrade head

echo "=== [5/5] Health check ==="
sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "Backend healthy (HTTP 200)"
else
  echo "WARNING: Backend returned HTTP $HTTP — check logs:"
  echo "  $COMPOSE logs backend --tail=50"
fi

echo ""
echo "=== Deploy complete ==="
echo "  Site:   http://62.171.158.125"
echo "  Admin:  http://62.171.158.125/admin"
echo "  Logs:   http://62.171.158.125/logs  (login to /admin first)"
echo "  Health: http://62.171.158.125/health"
echo ""
echo "Useful commands:"
echo "  $COMPOSE logs backend --tail=100 -f"
echo "  $COMPOSE ps"
echo "  $COMPOSE exec backend alembic current"
