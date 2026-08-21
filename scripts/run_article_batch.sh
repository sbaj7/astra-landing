#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

set -a
source .env.local
source .article-generator.env
set +a

export SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
export SUPABASE_URL="$VITE_SUPABASE_URL"

printf '%s\n' "$$" > .article-batch/run.pid

caffeinate -i .article-batch/venv/bin/python -u scripts/generate_articles.py \
  --topics-file .article-batch/titles.txt \
  --delay 2 \
  --resume-file .article-batch/completed.txt \
  --log-level INFO 2>&1 | tee -a .article-batch/run.log
