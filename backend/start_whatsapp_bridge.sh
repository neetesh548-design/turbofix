#!/usr/bin/env bash
# Script to launch the zero-cost whatsmeow WhatsApp Web QR bridge.

set -e

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/whatsapp-bridge" && pwd)"
echo "🚀 Starting TurboFix WhatsApp Web QR Bridge from ${BRIDGE_DIR}..."

# Check for Go compiler
GO_BIN="$(which go 2>/dev/null || echo "")"
if [ -z "$GO_BIN" ]; then
  if [ -x "/usr/local/go/bin/go" ]; then
    GO_BIN="/usr/local/go/bin/go"
  elif [ -x "/opt/homebrew/bin/go" ]; then
    GO_BIN="/opt/homebrew/bin/go"
  fi
fi

if [ -z "$GO_BIN" ]; then
  echo "❌ Error: 'go' is not installed or not in PATH."
  echo "Please install Go from https://go.dev/dl/ to run the zero-cost WhatsApp Web QR bridge."
  exit 1
fi

cd "$BRIDGE_DIR"
echo "📲 Launching whatsmeow bridge on port 8080..."
"$GO_BIN" run main.go
