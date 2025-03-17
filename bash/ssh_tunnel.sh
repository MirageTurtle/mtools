#!/bin/bash

if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <local_port> <remote_user> <remote_host> <remote_port> <ssh_key>"
    exit 1
fi

# Remote machine's username and address
REMOTE_USER=$2
REMOTE_HOST=$3

# Local and remote ports
LOCAL_PORT=$1
REMOTE_PORT=$4

# SSH key
SSH_KEY=$(realpath $5)

# Function to check if the tunnel is alive
check_tunnel() {
    # Check if the specific SSH process is running
    if ps auxww | grep -q "[s]sh -N -i ${SSH_KEY} -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} ${REMOTE_USER}@${REMOTE_HOST}" > /dev/null; then
        echo -n -e "\r$(date) Tunnel is alive!"
        return 0
    else
        echo -e "\n$(date) Tunnel is not alive"
        return 1
    fi
}

# Function to create the tunnel
create_tunnel() {
    echo "$(date) Creating tunnel..."
    ssh -N -i ${SSH_KEY} -R ${REMOTE_PORT}:localhost:${LOCAL_PORT} ${REMOTE_USER}@${REMOTE_HOST} &
    TUNNEL_PID=$!
}

# Main loop
while true; do
    if ! check_tunnel; then
        # If the tunnel is not alive, create a new one
        create_tunnel
    fi
    # Check every minute
    sleep 60
done
