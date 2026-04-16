#!/usr/bin/env bash
# Usage:
#   ./bark_send.sh "Body Text"
#   ./bark_send.sh "Title" "Body Text"
# Environment variable required: BARK_KEY

set -euo pipefail

if [[ -z "${BARK_KEY:-}" ]]; then
    echo "Error: BARK_KEY is not set."
    exit 1
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "Usage: $0 <body>"
    echo "       $0 <title> <body>"
    exit 1
fi

uri_encode() {
    jq -rn --arg s "$1" '$s | @uri'
}

if [[ $# -eq 1 ]]; then
    BODY=$(uri_encode "$1")
    URL="https://api.day.app/${BARK_KEY}/${BODY}"
else
    TITLE=$(uri_encode "$1")
    BODY=$(uri_encode "$2")
    URL="https://api.day.app/${BARK_KEY}/${TITLE}/${BODY}"
fi

curl -s "${URL}"
