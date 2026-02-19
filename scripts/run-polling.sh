#!/bin/bash
while true; do
  echo "Starting bot..."
  npm run start:poll
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Bot crashed with exit code $EXIT_CODE. Restarting in 5 seconds..."
    sleep 5
  else
    echo "Bot exited normally. Restarting in 2 seconds..."
    sleep 2
  fi
done
