#!/usr/bin/env bash
# Adlaire Deploy — VPS インストールスクリプト
# 仕様: DEPLOY_PLATFORM_RULEBOOK.md P14.1
set -euo pipefail

INSTALL_PREFIX="/opt/adlaire-deploy"
CONFIG_DIR="/etc/adlaire-deploy"
DATA_DIR="/var/lib/adlaire-deploy"
RUN_USER="adlaire"
SETUP_SYSTEMD=true
SETUP_FIREWALL=true
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)     INSTALL_PREFIX="$2"; shift 2 ;;
    --no-systemd) SETUP_SYSTEMD=false; shift ;;
    --no-firewall) SETUP_FIREWALL=false; shift ;;
    --user)       RUN_USER="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--prefix <path>] [--no-systemd] [--no-firewall] [--user <name>]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

[[ "$EUID" -ne 0 ]] && { echo "Error: Run as root (sudo $0)"; exit 1; }

echo "[1/9] Detecting OS..."
ARCH="$(uname -m)"
[[ "$ARCH" == "x86_64" || "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]] || { echo "Unsupported: $ARCH"; exit 1; }

echo "[2/9] Checking Deno..."
DENO_BIN=""
if command -v deno &>/dev/null; then
  DENO_BIN="$(command -v deno)"
  echo "  Deno found: $(deno --version | head -1)"
else
  echo "  Installing Deno..."
  curl -fsSL https://deno.land/install.sh | sh
  DENO_BIN="$HOME/.deno/bin/deno"
  ln -sf "$DENO_BIN" /usr/local/bin/deno
fi

echo "[3/9] Creating user '${RUN_USER}'..."
id "$RUN_USER" &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin "$RUN_USER"

echo "[4/9] Deploying files to ${INSTALL_PREFIX}..."
mkdir -p "$INSTALL_PREFIX"
rsync -a --exclude='.git' "$SCRIPT_DIR/" "$INSTALL_PREFIX/" 2>/dev/null || cp -r "$SCRIPT_DIR/." "$INSTALL_PREFIX/"
chown -R "$RUN_USER:$RUN_USER" "$INSTALL_PREFIX"

echo "[5/9] Creating directories..."
mkdir -p "$CONFIG_DIR" "$DATA_DIR/kv" "$DATA_DIR/logs" "$DATA_DIR/snapshots"
chown -R "$RUN_USER:$RUN_USER" "$DATA_DIR"
chmod 750 "$CONFIG_DIR"

cat > /usr/local/bin/adlaire-deploy <<CLIEOF
#!/usr/bin/env bash
exec "${DENO_BIN:-deno}" run --allow-all "${INSTALL_PREFIX}/src/main.ts" "\$@"
CLIEOF
chmod +x /usr/local/bin/adlaire-deploy

echo "[6/9] Generating secrets..."
ENV_FILE="$CONFIG_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  ADMIN_PASS="$(openssl rand -hex 16)"
  cat > "$ENV_FILE" <<EOF
DEPLOY_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD_HASH=$(echo -n "$ADMIN_PASS" | openssl dgst -sha256 -hex | awk '{print $2}')
ADLAIRE_DATA_DIR=$DATA_DIR
ADLAIRE_CONFIG_DIR=$CONFIG_DIR
EOF
  chmod 600 "$ENV_FILE"
  echo "  Admin password (save this): $ADMIN_PASS"
fi

DEPLOY_JSON="$CONFIG_DIR/deploy.json"
[[ -f "$DEPLOY_JSON" ]] || cat > "$DEPLOY_JSON" <<DJEOF
{"version":1,"host":"0.0.0.0","port":8000,"projects_dir":"$DATA_DIR/projects","data_dir":"$DATA_DIR","cluster":null,"projects":{}}
DJEOF
chown "$RUN_USER:$RUN_USER" "$DEPLOY_JSON" && chmod 640 "$DEPLOY_JSON"

if [[ "$SETUP_SYSTEMD" == true ]]; then
  echo "[7/9] Installing systemd service..."
  sed -e "s|__INSTALL_PREFIX__|$INSTALL_PREFIX|g" \
      -e "s|__RUN_USER__|$RUN_USER|g" \
      -e "s|__DENO_BIN__|${DENO_BIN:-deno}|g" \
      -e "s|__DATA_DIR__|$DATA_DIR|g" \
      -e "s|__CONFIG_DIR__|$CONFIG_DIR|g" \
      "$INSTALL_PREFIX/systemd/adlaire-deploy.service" > /etc/systemd/system/adlaire-deploy.service
  systemctl daemon-reload && systemctl enable adlaire-deploy
else
  echo "[7/9] Skipping systemd..."
fi

if [[ "$SETUP_FIREWALL" == true ]]; then
  echo "[8/9] Configuring firewall..."
  if command -v ufw &>/dev/null; then
    ufw allow 8000/tcp 2>/dev/null || true
    ufw allow 8001/tcp 2>/dev/null || true
    ufw allow 8002/tcp 2>/dev/null || true
  elif command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-port={8000,8001,8002}/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
  fi
else
  echo "[8/9] Skipping firewall..."
fi

if [[ "$SETUP_SYSTEMD" == true ]]; then
  echo "[9/9] Starting service..."
  systemctl start adlaire-deploy || true
  sleep 2
  curl -sf http://localhost:8000/health &>/dev/null && echo "  Health check: OK" || echo "  Health check: PENDING"
else
  echo "[9/9] Skipping service start..."
fi

echo ""
echo "=== Adlaire Deploy installed ==="
echo "  Install: $INSTALL_PREFIX"
echo "  Config:  $CONFIG_DIR/deploy.json"
echo "  Data:    $DATA_DIR"
echo "  CLI:     adlaire-deploy <command>"
echo "================================"
