#!/usr/bin/env bash
# -*- coding: utf-8 -*-
set -euo pipefail

# Run a command a specified number of times, or until it succeeds.
# Usage:
#   ./loop_it.sh <loop-times> <command> [arguments...]
#
# A loop count of 0 retries forever until the command returns zero.

print_usage() {
	echo "Usage: ./loop_it.sh <loop-times> <command> [arguments...]"
	echo "       Use 0 for loop-times to retry until the command succeeds."
}

if [[ $# -lt 2 ]]; then
	echo "Error: A loop count and command are required."
	print_usage
	exit 1
fi

loop_times="$1"
shift

if [[ ! "$loop_times" =~ ^[0-9]+$ ]]; then
	echo "Error: Loop times must be a non-negative integer: $loop_times"
	print_usage
	exit 1
fi

# Force decimal interpretation so values such as 00 are handled as zero.
loop_times=$((10#$loop_times))

if [[ "$loop_times" == 0 ]]; then
	until "$@"; do
		:
	done
	exit 0
fi

status=0
for ((attempt = 1; attempt <= loop_times; attempt++)); do
	status=0
	"$@" || status=$?
done

exit "$status"
