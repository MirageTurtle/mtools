#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# This script is used to run a task when a specific task(<pid>) is finished.
# Usage:
#   ./wait_for_it.sh <pid> <command>
# Example:
#   ./wait_for_it.sh 1234 echo "Task 1234 is finished."
#   ./wait_for_it.sh 1234 "cd /path/to/your/project && your_command"  # note the quotes

pid=$1
shift  # remove the first argument
cmd=$@

spinner=("|" "/" "-" "\\")
spinner_length=${#spinner[@]}
idx=0

while kill -0 $pid 2>/dev/null; do
    idx=$((idx % spinner_length))
    echo -ne "\rWaiting for task $pid to finish... ${spinner[$idx]}"
    idx=$((idx + 1))
    sleep 1
done
echo -e "\rTask $pid is finished.\n"


eval $cmd
