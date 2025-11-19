#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# This script is used to run a task when specific tasks(PIDs) are finished.
# Usage:
#   ./wait_for_it.sh <pid1> <pid2> ... <pidN> -- <command>
#   ./wait_for_it.sh --interactive -- <command>
#   ./wait_for_it.sh -i -- <command>
# Example:
#   ./wait_for_it.sh 1234 5678 -- echo "Tasks 1234 and 5678 are finished."
#   ./wait_for_it.sh 1234 5678 9012 -- "cd /path/to/your/project && your_command"  # note the quotes
#   ./wait_for_it.sh --interactive -- echo "All selected processes finished"

# Initialize arrays to store PIDs and track their status
pids=()
completed=()
interactive_mode=0

# Parse arguments to separate PIDs from the command
while [[ $# -gt 0 ]]; do
	if [[ "$1" == "--" ]]; then
		shift # Remove the -- separator
		break # Everything after -- is the command
	elif [[ "$1" == "--interactive" ]] || [[ "$1" == "-i" ]]; then
		interactive_mode=1
		shift
	else
		pids+=("$1")
		completed+=(0) # 0 means not completed (numeric, not string)
		shift
	fi
done

# The rest of the arguments form the command
cmd="$@"

# Interactive mode: use fzf to select PIDs
if [ $interactive_mode -eq 1 ]; then
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
	echo "Usage: ./wait_for_it.sh <pid1> <pid2> ... <pidN> -- <command>"
	echo "   or: ./wait_for_it.sh --interactive -- <command>"
	exit 1
fi

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
if [ -n "$cmd" ]; then
	echo "Executing: $cmd"
	eval $cmd
fi
