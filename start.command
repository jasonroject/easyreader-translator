#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
sh start.sh
status=$?
if [ "$status" -ne 0 ]; then printf '\nStartup failed. Press Enter to close.'; read -r answer; fi
exit "$status"
