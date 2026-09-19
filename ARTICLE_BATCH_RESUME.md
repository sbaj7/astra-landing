# Article Batch Resume Note

Resumed on September 15, 2026 from the saved checkpoint of 347 of 1,000 topics completed.

The final completed topic before resuming was **Oppositional Defiant Disorder**. The next topic in source order is **Panic Disorder**. Check `.article-batch/completed.txt` for the latest checkpoint while running.

Drafts with fewer than six retrieved citations or explicit retrieval-failure language are skipped before saving and remain pending for a later run. Failures are recorded in `.article-batch/run.log`.

The resume file is `.article-batch/completed.txt`. Resume from the repository root with:
The queue runs 100 priority decision topics from `scripts/topics_search_intent_priority.txt` first, then the 40 topics in `scripts/topics_search_intent.txt`, then the original list. Completed topics are still skipped. New generations use the updated decision-focused prompt; existing articles are not regenerated automatically. Total queued titles: 1,140 before deduplication.

```bash
bash scripts/run_article_batch.sh
```

The script automatically skips every topic already recorded in `.article-batch/completed.txt`.

The paused run saved articles locally but logged `Supabase upload skipped (service role key or URL missing)`. Git contains the generated article files; Supabase Storage was not updated by this run.
