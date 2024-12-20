#!/usr/bin/bash

# Define color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if exactly three arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: script_name <bootstrap-server> <group> <topic>"
    exit 1
fi

# Assign arguments to variables
BOOTSTRAP_SERVER=$1
GROUP=$2
TOPIC=$3

if ! command -v kafka-consumer-groups.sh &> /dev/null; then
    if [ ! -f ./kafka-consumer-groups.sh ]; then
        echo -e "${RED}Error: kafka-consumer-groups.sh is not found in the system path or the current directory.${NC}"
        exit 1
    else
        KAFKA_CONSUMER_GROUPS_SH="./kafka-consumer-groups.sh"
    fi
else
    KAFKA_CONSUMER_GROUPS_SH=$(command -v kafka-consumer-groups.sh)
fi

echo -e "KAFKA_CONSUMER_GROUPS_SH is set to $KAFKA_CONSUMER_GROUPS_SH"

while true; do
    # get the sum
    sum=$(${KAFKA_CONSUMER_GROUPS_SH} --bootstrap-server ${BOOTSTRAP_SERVER} --describe --group ${GROUP} | awk -v topic="${TOPIC}" '$1 == topic {sum += $5} END {print sum}')
    # get current date
    current_time=$(date '+%Y-%m-%d %H:%M:%S')
    # output
    echo "Time: ${current_time}, Sum: ${sum}"
    sleep 1
done
