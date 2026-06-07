#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# This script is used to run a task when specific tasks(PIDs) are finished,
# or after a specific duration has elapsed.
# Usage:
#   ./wait_for_it.sh --pid <pid1> <pid2> ... <pidN> -- <command>
#   ./wait_for_it.sh -p <pid1> <pid2> ... <pidN> -- <command>
#   ./wait_for_it.sh --interactive -- <command>
#   ./wait_for_it.sh -i -- <command>
#   ./wait_for_it.sh --timer <duration> -- <command>
#   ./wait_for_it.sh -t <duration> -- <command>
# Example:
#   ./wait_for_it.sh --pid 1234 5678 -- echo "Tasks 1234 and 5678 are finished."
#   ./wait_for_it.sh -p 1234 5678 9012 -- "cd /path/to/your/project && your_command"  # note the quotes
#   ./wait_for_it.sh --interactive -- echo "All selected processes finished"
#   ./wait_for_it.sh --timer 90 -- echo "90 seconds elapsed"
#   ./wait_for_it.sh -t "1 hour 30 minutes" -- echo "Timer elapsed"

print_usage() {
	echo "Usage: ./wait_for_it.sh --pid <pid1> <pid2> ... <pidN> -- <command>"
	echo "   or: ./wait_for_it.sh -p <pid1> <pid2> ... <pidN> -- <command>"
	echo "   or: ./wait_for_it.sh --interactive -- <command>"
	echo "   or: ./wait_for_it.sh -i -- <command>"
	echo "   or: ./wait_for_it.sh --timer <duration> -- <command>"
	echo "   or: ./wait_for_it.sh -t <duration> -- <command>"
	echo
	echo "Duration examples: 90, 90s, 5m, 1h30m, 2 minutes, 1 hour 30 minutes"
}

execute_command() {
	if [ -n "$cmd" ]; then
		echo "Executing: $cmd"
		eval "$cmd"
	fi
}

validate_pids() {
	local pid

	for pid in "${pids[@]}"; do
		if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
			echo "Error: Invalid PID: $pid"
			print_usage
			exit 1
		fi
	done
}

format_epoch_time() {
	local epoch="$1"

	if date -r "$epoch" '+%Y-%m-%d %H:%M:%S %Z' >/dev/null 2>&1; then
		date -r "$epoch" '+%Y-%m-%d %H:%M:%S %Z'
	else
		date -d "@$epoch" '+%Y-%m-%d %H:%M:%S %Z'
	fi
}

parse_duration_seconds() {
	local raw="$1"
	local duration value unit rest multiplier total

	duration=$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')
	duration=${duration//,/}
	duration=${duration// /}

	if [[ -z "$duration" ]]; then
		return 1
	fi

	if [[ "$duration" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
		printf '%s\n' "$duration"
		return 0
	fi

	total=0
	rest="$duration"
	while [[ -n "$rest" ]]; do
		if [[ ! "$rest" =~ ^([0-9]+([.][0-9]+)?)([a-z]+)(.*)$ ]]; then
			return 1
		fi

		value="${BASH_REMATCH[1]}"
		unit="${BASH_REMATCH[3]}"
		rest="${BASH_REMATCH[4]}"

		case "$unit" in
			s|sec|secs|second|seconds)
				multiplier=1
				;;
			m|min|mins|minute|minutes)
				multiplier=60
				;;
			h|hr|hrs|hour|hours)
				multiplier=3600
				;;
			d|day|days)
				multiplier=86400
				;;
			*)
				return 1
				;;
		esac

		total=$(awk -v total="$total" -v value="$value" -v multiplier="$multiplier" 'BEGIN { printf "%.3f", total + (value * multiplier) }')
	done

	printf '%s\n' "$total"
}

wait_for_timer() {
	local seconds="$1"
	local label="$2"
	local start_time estimated_start_time estimated_start_at now elapsed remaining spin_char

	spinner=("|" "/" "-" "\\")
	spinner_length=${#spinner[@]}
	idx=0
	start_time=$(date +%s)
	estimated_start_time=$(awk -v start="$start_time" -v seconds="$seconds" 'BEGIN { at = start + seconds; printf "%d", (at == int(at) ? at : int(at) + 1) }')
	estimated_start_at=$(format_epoch_time "$estimated_start_time")

	echo "Waiting for timer: $label (${seconds}s)"
	echo "Estimated command start time: $estimated_start_at"

	while true; do
		now=$(date +%s)
		elapsed=$((now - start_time))
		remaining=$(awk -v seconds="$seconds" -v elapsed="$elapsed" 'BEGIN { remaining = seconds - elapsed; if (remaining < 0) remaining = 0; printf "%.0f", remaining }')

		if awk -v seconds="$seconds" -v elapsed="$elapsed" 'BEGIN { exit !(elapsed >= seconds) }'; then
			break
		fi

		spin_char=${spinner[$((idx % spinner_length))]}
		idx=$((idx + 1))
		echo -ne "\rWaiting for timer: ${remaining}s remaining $spin_char"
		sleep 1
	done

	echo -e "\rTimer elapsed.                         \n"
}

# Initialize arrays to store PIDs and track their status
pids=()
completed=()
interactive_mode=0
pid_mode=0
timer_mode=0
timer_input=""

# Parse arguments to separate PIDs from the command
while [[ $# -gt 0 ]]; do
	if [[ "$1" == "--" ]]; then
		shift # Remove the -- separator
		break # Everything after -- is the command
	elif [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
		print_usage
		exit 0
	elif [[ "$1" == "--interactive" ]] || [[ "$1" == "-i" ]]; then
		interactive_mode=1
		shift
	elif [[ "$1" == --pid=* ]]; then
		pid_mode=1
		pids+=("${1#--pid=}")
		completed+=(0) # 0 means not completed (numeric, not string)
		shift
	elif [[ "$1" == "--pid" ]] || [[ "$1" == "-p" ]]; then
		pid_mode=1
		shift
		while [[ $# -gt 0 && "$1" != "--" ]]; do
			pids+=("$1")
			completed+=(0) # 0 means not completed (numeric, not string)
			shift
		done
		if [[ $# -gt 0 && "$1" == "--" ]]; then
			shift
		fi
		break
	elif [[ "$1" == --timer=* ]]; then
		timer_mode=1
		timer_input="${1#--timer=}"
		shift
	elif [[ "$1" == "--timer" ]] || [[ "$1" == "-t" ]]; then
		timer_mode=1
		shift
		duration_parts=()
		while [[ $# -gt 0 && "$1" != "--" ]]; do
			duration_parts+=("$1")
			shift
		done
		timer_input="${duration_parts[*]}"
		if [[ $# -gt 0 && "$1" == "--" ]]; then
			shift
		fi
		break
	else
		echo "Error: Unknown argument: $1"
		print_usage
		exit 1
	fi
done

# The rest of the arguments form the command
cmd="$@"

if [ $timer_mode -eq 1 ]; then
	if [ $interactive_mode -eq 1 ] || [ $pid_mode -eq 1 ] || [ ${#pids[@]} -gt 0 ]; then
		echo "Error: Timer mode cannot be combined with PID or interactive mode."
		print_usage
		exit 1
	fi

	timer_seconds=$(parse_duration_seconds "$timer_input")
	if [ $? -ne 0 ]; then
		echo "Error: Invalid duration: $timer_input"
		print_usage
		exit 1
	fi

	if awk -v seconds="$timer_seconds" 'BEGIN { exit !(seconds > 0) }'; then
		:
	else
		echo "Error: Duration must be greater than 0."
		exit 1
	fi

	if [ -z "$cmd" ]; then
		echo "Warning: No command specified to execute after timer elapses."
	fi

	wait_for_timer "$timer_seconds" "$timer_input"
	execute_command
	exit $?
fi

# Interactive mode: use fzf to select PIDs
if [ $interactive_mode -eq 1 ]; then
	if [ $pid_mode -eq 1 ]; then
		echo "Error: Interactive mode cannot be combined with PID mode."
		print_usage
		exit 1
	fi

	# Check if fzf is installed
	if ! command -v fzf &> /dev/null; then
		echo "Error: fzf is not installed. Please install fzf to use interactive mode."
		echo "Install with: brew install fzf (macOS) or apt install fzf (Linux)"
		exit 1
	fi

	echo "Select processes to monitor (use TAB to select multiple, ENTER to confirm):"

	# Get process list with PID and full command, format for fzf
	# Use ps with custom format: PID, full command
	selected=$(ps -eo pid,args | tail -n +2 | \
		fzf --multi \
		    --header="TAB: select/deselect | ENTER: confirm | ESC: cancel" \
		    --preview="ps -p {1} -o pid,ppid,user,%cpu,%mem,etime,command" \
		    --preview-window=down:3:wrap \
		    --bind="tab:toggle+down" \
		    --height=80%)

	# Check if user cancelled
	if [ -z "$selected" ]; then
		echo "No processes selected. Exiting."
		exit 0
	fi

	# Extract PIDs from selected lines
	while IFS= read -r line; do
		pid=$(echo "$line" | awk '{print $1}')
		pids+=("$pid")
		completed+=(0)
	done <<< "$selected"

	echo "Selected ${#pids[@]} process(es): ${pids[*]}"
fi

# Check if we have PIDs to monitor
if [ ${#pids[@]} -eq 0 ]; then
	echo "Error: No PIDs specified."
	print_usage
	exit 1
fi

validate_pids

# Check if we have a command to execute
if [ -z "$cmd" ]; then
	echo "Warning: No command specified to execute after processes finish."
fi

# Display initial message
echo "Waiting for ${#pids[@]} process(es) to finish: ${pids[*]}"

# Set up spinner
spinner=("|" "/" "-" "\\")
spinner_length=${#spinner[@]}
idx=0
all_done=0

# Monitor all processes
while [ $all_done -eq 0 ]; do
	all_done=1 # Assume all are done

	# Update spinner
	spin_char=${spinner[$((idx % spinner_length))]}
	idx=$((idx + 1))

	# Status message
	status_msg="Waiting for processes: "
	remaining_count=0

	# Check each process
	for i in "${!pids[@]}"; do
		if [ ${completed[$i]} -eq 0 ]; then
			if kill -0 ${pids[$i]} 2>/dev/null; then
				# Process still running
				all_done=0
				status_msg+="${pids[$i]} "
				remaining_count=$((remaining_count + 1))
			else
				# Process finished
				completed[$i]=1
				echo -e "\rProcess ${pids[$i]} has finished."
			fi
		fi
	done

	# Print status with spinner if processes are still running
	if [ $remaining_count -gt 0 ]; then
		echo -ne "\r$status_msg $spin_char"
		sleep 1
	fi
done

echo -e "\rAll monitored processes have finished.\n"

# Execute the command if provided
execute_command
