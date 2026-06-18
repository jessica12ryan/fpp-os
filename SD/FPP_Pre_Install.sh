#!/bin/bash
echo "FPP (Falcon Player) is about to be installed momentarily."
echo "Checking for internet connectivity..."

MAX_WAIT=60
INTERVAL=5
ELAPSED=0

while ! curl -fsSL --connect-timeout 5 --max-time 10 -o /dev/null https://github.com 2>/dev/null; do
    ELAPSED=$((ELAPSED + INTERVAL))
    if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
        echo "=========================================================="
        echo "ERROR: No internet connection detected after ${MAX_WAIT}s."
        echo "Please connect this machine to the internet and reboot."
        echo "FPP installation requires internet access."
        echo "=========================================================="
        exit 1
    fi
    echo "Waiting for network... (${ELAPSED}s elapsed, retrying in ${INTERVAL}s)"
    sleep "$INTERVAL"
done

echo "Internet connection confirmed. Starting FPP installation..."
