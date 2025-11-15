#!/bin/bash

# Script to generate 100 clinical articles
# Usage: bash scripts/generate_100_articles.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOPICS_FILE="$SCRIPT_DIR/topics_100.txt"

echo "=========================================="
echo "Generating 100 Clinical Articles"
echo "=========================================="
echo ""

# Check if topics file exists
if [ ! -f "$TOPICS_FILE" ]; then
    echo "❌ Error: Topics file not found at $TOPICS_FILE"
    exit 1
fi

# Count topics
TOPIC_COUNT=$(wc -l < "$TOPICS_FILE" | tr -d ' ')
echo "📚 Found $TOPIC_COUNT topics to generate"
echo ""

# Run the Python script with the topics file
# Using --delay 2 to avoid rate limiting (2 seconds between articles)
python3 "$SCRIPT_DIR/generate_articles.py" \
    --topics-file "$TOPICS_FILE" \
    --delay 2 \
    --log-level INFO

EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Article generation completed successfully!"
else
    echo "❌ Article generation failed with exit code $EXIT_CODE"
fi
echo "=========================================="

exit $EXIT_CODE
