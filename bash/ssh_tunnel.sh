#!/bin/bash

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <local_port> <remote_user> <remote_host> <remote_port>"
    exit 1
fi

# Remote machine's username and address
REMOTE_USER=$2
REMOTE_HOST=$3

# Local and remote ports
LOCAL_PORT=$1
REMOTE_PORT=$4

# Function to check if the tunnel is alive
check_tunnel() {
    # Use ss command to check if the port is listening
    if ss -tunlp | grep -q ":${LOCAL_PORT}"; then
        echo "Tunnel is alive"
        return 0
    else
        echo "Tunnel is not alive"
        return 1
    fi
}

# Function to create the tunnel
create_tunnel() {
    echo "Creating tunnel..."
    ssh -N -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} ${REMOTE_USER}@${REMOTE_HOST} &
    TUNNEL_PID=$!
}

# Main loop
while true; do
    if ! check_tunnel; then
        # If the tunnel is not alive, create a new one
        create_tunnel
    fi
    # Check every half hour
    sleep 1800
done
