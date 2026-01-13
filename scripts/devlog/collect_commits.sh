#!/bin/bash
# Collect commits from a git repository for weekly post generation
# Usage: ./collect_commits.sh [repo_path] [days_back]
#
# Examples:
#   ./collect_commits.sh ~/projects/my-project 7
#   ./collect_commits.sh . 7

set -e

REPO_PATH="${1:-.}"
DAYS_BACK="${2:-7}"
OUTPUT_FILE="commits_output.txt"

# Calculate date range
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SINCE_DATE=$(date -v-${DAYS_BACK}d +%Y-%m-%d)
else
    # Linux
    SINCE_DATE=$(date -d "${DAYS_BACK} days ago" +%Y-%m-%d)
fi
TODAY=$(date +%Y-%m-%d)

echo "Collecting commits from: $REPO_PATH"
echo "Date range: $SINCE_DATE to $TODAY"
echo "---"

cd "$REPO_PATH"

# Collect commits with full message (subject + body + trailers)
git log \
    --since="$SINCE_DATE" \
    --format="=== COMMIT ===%n%H%n%s%n%b%n=== END ===" \
    --no-merges \
    > "$OUTPUT_FILE"

COMMIT_COUNT=$(git log --since="$SINCE_DATE" --oneline --no-merges | wc -l)

echo "Found $COMMIT_COUNT commits"
echo "Output saved to: $OUTPUT_FILE"
echo ""
echo "Next step: Run generate_weekly_post.js with this output"
