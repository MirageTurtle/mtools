#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# This script is used to run a task when specific tasks(PIDs) are finished.
# Usage:
#   ./wait_for_it.sh <pid1> <pid2> ... <pidN> -- <command>
# Example:
#   ./wait_for_it.sh 1234 5678 -- echo "Tasks 1234 and 5678 are finished."
#   ./wait_for_it.sh 1234 5678 9012 -- "cd /path/to/your/project && your_command"  # note the quotes

# Initialize arrays to store PIDs and track their status
pids=()
completed=()

# Parse arguments to separate PIDs from the command
while [[ $# -gt 0 ]]; do
	if [[ "$1" == "--" ]]; then
		shift # Remove the -- separator
		break # Everything after -- is the command
	fi
	pids+=("$1")
	completed+=(0) # 0 means not completed (numeric, not string)
	shift
done

# The rest of the arguments form the command
cmd="$@"

# Check if we have PIDs to monitor
if [ ${#pids[@]} -eq 0 ]; then
	echo "Error: No PIDs specified."
	echo "Usage: ./wait_for_it.sh <pid1> <pid2> ... <pidN> -- <command>"
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
