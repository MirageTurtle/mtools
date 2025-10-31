#!/usr/bin/env bash
# Usage: ./send_telegram.sh "<chat_id>" "Your message here"
# Environment variable required: TELEGRAM_BOT_TOKEN

set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    echo "Error: TELEGRAM_BOT_TOKEN is not set."
    exit 1
fi

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <chat_id> <message>"
    exit 1
fi

CHAT_ID="$1"
MESSAGE="$2"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${CHAT_ID}" \
    -d text="${MESSAGE}" \
    -d parse_mode="Markdown"
