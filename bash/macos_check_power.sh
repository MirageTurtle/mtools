#!/usr/bin/env bash

# Assert that the script is running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo "This script is intended to run on macOS."
    exit 1
fi

: "${BARK_KEY:?BARK_KEY is not set}"

BARK_URL="https://api.day.app/${BARK_KEY}"
STATE_FILE="/tmp/mac_power_state"

CURRENT=$(pmset -g batt | head -n 1)

if [[ "$CURRENT" == *"Battery Power"* ]]; then
    # Notify with bark if not already notified or the latest notification was more than 3 hours ago
    if [[ ! -f "$STATE_FILE" || $(find "$STATE_FILE" -mmin +180) ]]; then
        curl -s \
            "${BARK_URL}/⚠️%20Mac%20断电/MacBook%20Pro已切换到电池供电"
        touch "$STATE_FILE"
    fi
else
    if [[ -f "$STATE_FILE" ]]; then
        curl -s \
            "${BARK_URL}/✅%20Mac%20充电/MacBook%20Pro已切换到电源供电"
    fi
    rm -f "$STATE_FILE"
fi
