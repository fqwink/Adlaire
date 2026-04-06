#!/usr/bin/env bash
# Adlaire Deploy — マルチVPS プロビジョニングスクリプト
# 仕様: DEPLOY_PLATFORM_RULEBOOK.md P14.6
#
# deploy.json の cluster.edges を読み込み、各 Edge ノードへ設定を配布する。
set -euo pipefail

CONFIG_FILE="${1:-deploy.json}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: Config file not found: $CONFIG_FILE"
  exit 1
fi

# jq で Edge ノード情報を抽出
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required (apt install jq)"
  exit 1
fi

EDGES=$(jq -r '.cluster.edges[]? | "\(.node_id) \(.url)"' "$CONFIG_FILE" 2>/dev/null)

if [[ -z "$EDGES" ]]; then
  echo "No edge nodes configured in $CONFIG_FILE"
  exit 0
fi

echo "Provisioning edge nodes from $CONFIG_FILE..."
echo ""

while IFS=' ' read -r NODE_ID URL; do
  # URL からホスト部分を抽出
  HOST=$(echo "$URL" | sed -E 's|https?://||; s|:[0-9]+.*||; s|/.*||')

  echo "--- $NODE_ID ($HOST) ---"

  echo "  Copying config..."
  scp -q "$CONFIG_FILE" "root@${HOST}:/etc/adlaire-deploy/deploy.json" && echo "  OK" || echo "  FAILED"

  echo "  Reloading service..."
  ssh -q "root@${HOST}" "systemctl reload adlaire-deploy 2>/dev/null || systemctl restart adlaire-deploy" && echo "  OK" || echo "  FAILED"

  echo ""
done <<< "$EDGES"

echo "Provisioning complete."
