#!/usr/bin/env bash
# clean_tmp.sh
# Remove top-level entries in ~/tmp that have not been modified within the last 7 days.
# For top-level directories: skip if any file/dir inside was modified within 7 days.
# For top-level files/symlinks: skip if the entry itself was modified within 7 days.

TARGET="$HOME/tmp"
DAYS=7

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*"
}

for entry in "$TARGET"/* "$TARGET"/.[!.]* "$TARGET"/..?*; do
    # Skip glob patterns that expanded to nothing
    [ -e "$entry" ] || [ -L "$entry" ] || continue

    name="${entry##*/}"

    if [ -d "$entry" ] && [ ! -L "$entry" ]; then
        # Directory: skip if any entry underneath was modified within DAYS days
        recent=$(find "$entry" -mtime -"$DAYS" -print -quit 2>/dev/null)
        if [ -n "$recent" ]; then
            log "SKIP  dir  $name  (contains recently modified entries)"
        else
            log "CLEAN dir  $name"
            rm -rf "$entry"
        fi
    else
        # Regular file or symlink: check its own mtime
        recent=$(find "$entry" -maxdepth 0 -mtime -"$DAYS" 2>/dev/null)
        if [ -n "$recent" ]; then
            log "SKIP  file $name  (modified within $DAYS days)"
        else
            log "CLEAN file $name"
            rm -f "$entry"
        fi
    fi
done
