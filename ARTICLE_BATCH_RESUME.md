# Article Batch Resume Note

Paused on August 20, 2026 after 191 of 1,000 topics were completed.

The generator was interrupted while producing **Eosinophilic Pneumonia**. That topic was not marked complete and will be generated again.

The resume file is `.article-batch/completed.txt`. The next run will first retry earlier unsuccessful topics in source order:

1. Severe Acute Malnutrition: Recognition and Management of Marasmus and Kwashiorkor
2. Gastrointestinal Bleeding Scan
3. Open Angle Glaucoma
4. Eosinophilic Pneumonia

Resume from the repository root with:

```bash
./scripts/run_article_batch.sh
```

The script automatically skips every topic already recorded in `.article-batch/completed.txt`.

The paused run saved articles locally but logged `Supabase upload skipped (service role key or URL missing)`. Git contains the generated article files; Supabase Storage was not updated by this run.
