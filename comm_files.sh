#!/bin/bash

# TOOD:
# Read two directories from the user
OLD_DIR="LLaMA-Factory"
NEW_DIR="tmp/LLaMA-Factory"

# Check if directories exist
if [ ! -d "$OLD_DIR" ] || [ ! -d "$NEW_DIR" ]; then
	echo "Error: One or both directories do not exist."
	exit 1
fi

# Create temporary files for storing file lists
OLD_LIST=$(mktemp)
NEW_LIST=$(mktemp)
trap 'rm -f "$OLD_LIST" "$NEW_LIST"' EXIT

# Generate sorted file lists
(
	cd "$NEW_DIR" || exit
	find . -type f | sort >"$NEW_LIST"
)
(
	cd "$OLD_DIR" || exit
	find . -type f | sort >"$OLD_LIST"
)

# Find missing files in OLD_DIR that are present in NEW_DIR
MISSING_FILES=$(comm -23 "$NEW_LIST" "$OLD_LIST")

if [ -z "$MISSING_FILES" ]; then
	echo "✅ No missing files in $OLD_DIR."
	exit 0
fi

# Display missing files
echo "📄 The following files are missing from $OLD_DIR:"
echo "$MISSING_FILES"

# Prompt user for confirmation to copy ALL missing files
echo ""
read -p "Do you want to copy ALL missing files into $OLD_DIR? [y/N] " ANSWER

if [[ ! "$ANSWER" =~ ^[Yy]$ ]]; then
	echo "❌ No files were copied."
	exit 0
fi

# Copy missing files
echo ""
echo "🔁 Copying missing files..."
while IFS= read -r REL_PATH; do
	SRC="$NEW_DIR/$REL_PATH"
	DST="$OLD_DIR/$REL_PATH"
	DST_DIR=$(dirname "$DST")
	mkdir -p "$DST_DIR"
	if [ -e "$DST" ]; then
		echo "⚠️  File already exists, skipping: $REL_PATH"
	else
		cp "$SRC" "$DST"
		echo "✅ Copied: $REL_PATH"
	fi
done <<<"$MISSING_FILES"

echo ""
echo "✅ Done."
