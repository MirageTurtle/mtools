#!/bin/bash

# Help message
usage() {
    echo "Usage: $0 [-y|--yes] OLD_DIR NEW_DIR"
    echo ""
    echo "This script compares two directories:"
    echo "  NEW_DIR is treated as the reference (source of truth)."
    echo "  OLD_DIR is treated as the destination (may have missing files)."
    echo ""
    echo "It lists files that exist in NEW_DIR but not in OLD_DIR,"
    echo "and optionally copies them (without overwriting existing files)."
    echo ""
    echo "Options:"
    echo "  -y, --yes     Automatically copy all missing files without prompting."
    echo "  -h, --help    Show this help message."
    exit 1
}

# Parse arguments
AUTO_CONFIRM=false
POSITIONAL=()

while [[ $# -gt 0 ]]; do
    case "$1" in
    -y | --yes)
        AUTO_CONFIRM=true
        shift
        ;;
    -h | --help)
        usage
        ;;
    -*)
        echo "Unknown option: $1"
        usage
        ;;
    *)
        POSITIONAL+=("$1")
        shift
        ;;
    esac
done

# Require exactly two positional arguments
if [ "${#POSITIONAL[@]}" -ne 2 ]; then
    echo "Error: OLD_DIR and NEW_DIR must be specified."
    usage
fi

OLD_DIR="${POSITIONAL[0]}"
NEW_DIR="${POSITIONAL[1]}"

# Check directories
if [ ! -d "$OLD_DIR" ] || [ ! -d "$NEW_DIR" ]; then
    echo "Error: One or both directories do not exist:"
    echo "  OLD_DIR=$OLD_DIR"
    echo "  NEW_DIR=$NEW_DIR"
    exit 1
fi

# Create temp files and cleanup trap
OLD_LIST=$(mktemp)
NEW_LIST=$(mktemp)
trap 'rm -f "$OLD_LIST" "$NEW_LIST"' EXIT

# Generate sorted file lists with relative paths
(cd "$NEW_DIR" && find . -type f | sort >"$NEW_LIST")
(cd "$OLD_DIR" && find . -type f | sort >"$OLD_LIST")

# Compute missing files
MISSING_FILES=$(comm -23 "$NEW_LIST" "$OLD_LIST")

# Exit if no missing files
if [ -z "$MISSING_FILES" ]; then
    echo "No missing files detected. $OLD_DIR is up to date."
    exit 0
fi

# Show missing files
echo "The following files exist in $NEW_DIR but are missing in $OLD_DIR:"
echo "$MISSING_FILES"

# Prompt once unless auto-confirm is set
if ! $AUTO_CONFIRM; then
    echo ""
    read -p "Do you want to copy ALL missing files into $OLD_DIR? [y/N] " ANSWER
    if [[ ! "$ANSWER" =~ ^[Yy]$ ]]; then
        echo "Aborted. No files were copied."
        exit 0
    fi
fi

# Copy missing files without overwriting existing ones
echo ""
echo "Copying missing files..."
while IFS= read -r REL_PATH; do
    SRC="$NEW_DIR/$REL_PATH"
    DST="$OLD_DIR/$REL_PATH"
    DST_DIR=$(dirname "$DST")
    mkdir -p "$DST_DIR"
    if [ -e "$DST" ]; then
        echo "Skipped (already exists): $REL_PATH"
    else
        cp "$SRC" "$DST"
        echo "Copied: $REL_PATH"
    fi
done <<<"$MISSING_FILES"

echo ""
echo "Done."
