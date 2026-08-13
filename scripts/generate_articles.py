#!/usr/bin/env python3
"""Batch generator for clinical articles using the Astra researcher edge function.

This script demonstrates how to:
  1. Build a structured prompt for the researcher endpoint
  2. Request JSON-formatted articles for a list of topics
  3. Validate and persist the results locally
  4. Optionally upload the article payload and metadata to Supabase Storage + PostgREST

Environment variables (expected):
  RESEARCHER_ENDPOINT   – Supabase edge function URL (e.g. https://<project>.supabase.co/functions/v1/quick-api)
  SUPABASE_ANON_KEY     – Supabase anon key (used for edge auth)
  SUPABASE_URL          – Supabase project URL (required for uploads)
  SUPABASE_SERVICE_ROLE_KEY – Supabase service role key (required for storage/rest upserts)
  ARTICLE_BUCKET        – Storage bucket name for articles (default: "articles")

Install requirements (if not already available):
  pip install requests python-slugify
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests

try:
  from slugify import slugify as _slugify
except ImportError:  # pragma: no cover - optional dependency fallback
  def _slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value or "article"


LOGGER = logging.getLogger("article_generator")
DEFAULT_OUTPUT_DIR = Path("generated_articles")
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_PATH = DEFAULT_OUTPUT_DIR / "index.json"

DEFAULT_TOPICS = [
    "Community-acquired pneumonia first 24-hour workflow",
    "Acute kidney injury on surgical wards",
    "Hospital management of hyperkalemia in CKD"
]


def getenv(name: str, default: Optional[str] = None) -> Optional[str]:
  value = os.environ.get(name, default)
  if value is None:
    LOGGER.debug("Environment variable %s not set", name)
  return value


def extract_content_from_response(data: Dict[str, Any]) -> str:
  if not isinstance(data, dict):
    return ""

  content = data.get("choices", [{}])[0].get("message", {}).get("content")
  if isinstance(content, str) and content.strip():
    return content

  output_text = data.get("output_text")
  if isinstance(output_text, str) and output_text.strip():
    return output_text

  output = data.get("output")
  pieces: List[str] = []
  if isinstance(output, list):
    for item in output:
      if isinstance(item, dict):
        text = item.get("text")
        if isinstance(text, str) and text.strip():
          pieces.append(text)
        content_list = item.get("content")
        if isinstance(content_list, list):
          for chunk in content_list:
            if isinstance(chunk, dict):
              chunk_text = chunk.get("text")
              if isinstance(chunk_text, str) and chunk_text.strip():
                pieces.append(chunk_text)
  if pieces:
    return "\n".join(pieces)

  return ""


DEFAULT_RESEARCHER_ENDPOINT = "https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/quick-api"
DEFAULT_SUPABASE_ANON_KEY = None
DEFAULT_SUPABASE_SERVICE_ROLE_KEY = None
DEFAULT_SUPABASE_URL = "https://shwitfgtpfszjjoczbxp.supabase.co"
DEFAULT_ARTICLE_BUCKET = "articles"

RESEARCHER_ENDPOINT = getenv("RESEARCHER_ENDPOINT", DEFAULT_RESEARCHER_ENDPOINT)
SUPABASE_ANON_KEY = getenv("SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY)
SUPABASE_URL = getenv("SUPABASE_URL", DEFAULT_SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY = getenv("SUPABASE_SERVICE_ROLE_KEY", DEFAULT_SUPABASE_SERVICE_ROLE_KEY)
ARTICLE_BUCKET = getenv("ARTICLE_BUCKET", DEFAULT_ARTICLE_BUCKET)


def build_prompt(topic: str) -> str:
  """Instruct the researcher model to emit JSON matching the front-end schema."""

  schema_description = json.dumps(
      {
          "heroLabel": "string",
          "title": "string",
          "summary": "string",
          "updated": "string (e.g. February 2025)",
          "clinicalQuestion": "string",
          "tags": ["string"],
          "heroStats": [{"label": "string", "value": "string"}],
          "keyMoments": [
              {
                  "icon": "Sparkles | Stethoscope | ShieldCheck | Activity | ClipboardList",
                  "title": "string",
                  "body": "string"
              }
          ],
          "sections": [
              {
                  "type": "steps",
                  "eyebrow": "string",
                  "title": "string",
                  "blurb": "string",
                  "steps": [{"title": "string", "body": "string"}]
              },
              {
                  "type": "checklists",
                  "eyebrow": "string",
                  "title": "string",
                  "blurb": "string",
                  "layout": "grid | column",
                  "maxWidth": "optional number",
                  "cards": [
                      {
                          "icon": "TestTube2 | Clock | AlertTriangle | ShieldCheck | ClipboardList | Activity",
                          "title": "string",
                          "items": ["string"]
                      }
                  ]
              }
          ],
          "references": [
              {
                  "title": "string",
                  "detail": "journal + year + doi",
                  "url": "https://(journal or PubMed landing page)"
              }
          ]
      },
      indent=2
  )

  # CRITICAL: Keep prompt SHORT so query planner can extract topic
  # Backend searches for topic, then model uses search results to generate JSON
  return (
      f"{topic}\n\n"
      f"Output JSON: {schema_description}\n"
      "Use search results [1]-[N] for references. No markdown fences."
  )


def call_researcher(prompt: str) -> Tuple[str, List[Dict[str, Any]]]:
  if not RESEARCHER_ENDPOINT:
    raise RuntimeError("RESEARCHER_ENDPOINT environment variable is required")
  if not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_ANON_KEY environment variable is required")

  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
      "apikey": SUPABASE_ANON_KEY
  }
  payload = {
      "query": prompt,
      "mode": "search",
      "isClinical": False,
      "isReason": False,
      "isWrite": False,
      "stream": True
  }

  LOGGER.info("Requesting article from researcher endpoint …")
  response = requests.post(RESEARCHER_ENDPOINT, headers=headers, json=payload, stream=True, timeout=300)
  if response.status_code >= 400:
    raise RuntimeError(f"Researcher error {response.status_code}: {response.text}")

  citations: List[Dict[str, Any]] = []
  content_parts: List[str] = []

  try:
    for raw_line in response.iter_lines(decode_unicode=False):
      if raw_line is None:
        continue
      try:
        line = raw_line.decode('utf-8').strip()
      except UnicodeDecodeError:
        LOGGER.debug("Skipping undecodable SSE payload: %r", raw_line)
        continue
      if not line or not line.startswith("data:"):
        continue
      payload_str = line[5:].strip()
      if payload_str == "[DONE]":
        break

      try:
        payload_json = json.loads(payload_str)
      except json.JSONDecodeError:
        LOGGER.debug("Skipping non-JSON SSE payload: %s", payload_str)
        continue

      if isinstance(payload_json, dict) and "citations" in payload_json:
        new_citations = payload_json.get("citations", [])
        LOGGER.info("📚 Received citations event with %d citations", len(new_citations))
        citations = new_citations or citations
        continue

      if LOGGER.isEnabledFor(logging.DEBUG):
        LOGGER.debug("SSE payload: %s", json.dumps(payload_json, indent=2))

      choices = payload_json.get("choices")
      if not isinstance(choices, list):
        continue
      for choice in choices:
        if not isinstance(choice, dict):
          continue
        delta = choice.get("delta", {})
        if isinstance(delta, dict):
          chunk = delta.get("content")
          if isinstance(chunk, str):
            content_parts.append(chunk)
  finally:
    response.close()

  content = "".join(content_parts).strip()
  if not content:
    raise ValueError("No article content returned from researcher endpoint")

  return content, citations


def extract_json_payload(text: str) -> Dict[str, Any]:
  first = text.find("{")
  last = text.rfind("}")
  if first == -1 or last == -1 or first >= last:
    raise ValueError("Unable to locate JSON object in model output")

  json_blob = text[first:last + 1]

  # Try parsing as-is first
  try:
    return json.loads(json_blob)
  except json.JSONDecodeError as exc:
    LOGGER.warning("Initial JSON parse failed: %s. Attempting cleanup...", exc)

    # Try common fixes for malformed JSON
    cleaned = json_blob

    # 1. Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)

    # 2. Fix missing quotes around field values
    # Pattern: "field": <unquoted text> -> "field": "<text>"
    # This handles cases like: "body": **MINS** and... -> "body": "**MINS** and..."
    cleaned = re.sub(r'("(?:body|title|value|label|eyebrow|blurb)":\s*)(\*\*[^"]+?)(\s*[,\n}])', r'\1"\2"\3', cleaned)

    # 3. Try parsing the cleaned version
    try:
      return json.loads(cleaned)
    except json.JSONDecodeError:
      # If still failing, save the problematic JSON for debugging
      debug_file = DEFAULT_OUTPUT_DIR / "failed_json_debug.txt"
      with open(debug_file, "w", encoding="utf-8") as f:
        f.write(f"Original error: {exc}\n\n")
        f.write(f"Attempted JSON:\n{json_blob}\n\n")
        f.write(f"After cleanup:\n{cleaned}\n")
      LOGGER.error("Saved problematic JSON to %s", debug_file)
      raise ValueError(f"Failed to parse article JSON: {exc}") from exc


def ensure_references(article: Dict[str, Any], citations: Iterable[Dict[str, Any]]) -> None:
  built: List[Dict[str, Any]] = []
  for index, citation in enumerate(citations or []):
    if not isinstance(citation, dict):
      continue

    url = citation.get("url")
    if not url:
      continue

    number = citation.get("number")
    try:
      number = int(number)
    except (TypeError, ValueError):
      number = index + 1

    title = citation.get("title") or url
    detail = citation.get("detail") or citation.get("authors") or citation.get("source")

    entry: Dict[str, Any] = {
        "number": number,
        "title": title,
        "detail": detail,
        "url": url
    }

    for key, value in citation.items():
      if key in entry:
        continue
      if value in (None, ""):
        continue
      entry[key] = value

    built.append(entry)

  if built:
    article["references"] = built
    article["citations"] = built
  elif not article.get("references"):
    article["references"] = []

def validate_article(article: Dict[str, Any]) -> None:
  required_top_level = ["title", "summary", "heroStats", "keyMoments", "sections", "references"]
  for key in required_top_level:
    if key not in article or not article[key]:
      raise ValueError(f"Article missing required field: {key}")

  for stat in article.get("heroStats", []):
    if "label" not in stat or "value" not in stat:
      raise ValueError("Each hero stat requires label and value")

  for moment in article.get("keyMoments", []):
    if "title" not in moment or "body" not in moment:
      raise ValueError("Each key moment requires title and body")

  for section in article.get("sections", []):
    section_type = section.get("type")
    if section_type not in {"steps", "checklists", "highlights"}:
      raise ValueError(f"Unsupported section type: {section_type}")
    if section_type == "steps" and not section.get("steps"):
      raise ValueError("Step sections require a steps array")
    if section_type == "checklists" and not section.get("cards"):
      raise ValueError("Checklist sections require cards array")


def slugify_article(article: Dict[str, Any]) -> str:
  existing = article.get("slug")
  if existing:
    return _slugify(existing)
  return _slugify(article["title"])


def write_local_files(slug: str, article: Dict[str, Any], raw_text: str) -> Tuple[Path, Path]:
  article_path = DEFAULT_OUTPUT_DIR / f"{slug}.json"
  raw_path = DEFAULT_OUTPUT_DIR / f"{slug}.txt"
  article_path.write_text(json.dumps(article, indent=2), encoding="utf-8")
  raw_path.write_text(raw_text, encoding="utf-8")
  LOGGER.info("Saved local artifacts: %s, %s", article_path, raw_path)
  return article_path, raw_path


def update_manifest(slug: str, article: Dict[str, Any]) -> None:
  manifest: List[Dict[str, Any]] = []
  if MANIFEST_PATH.exists():
    try:
      manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
      LOGGER.warning("Manifest at %s is malformed; rebuilding", MANIFEST_PATH)
      manifest = []

  # Remove existing entry for slug
  manifest = [entry for entry in manifest if entry.get("slug") != slug]

  manifest.append(
      {
          "slug": slug,
          "title": article.get("title"),
          "summary": article.get("summary"),
          "updated": article.get("updated"),
          "generatedAt": datetime.now(datetime.UTC).isoformat() if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat() + "Z",
          "source": f"generated_articles/{slug}.json"
      }
  )

  MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=False), encoding="utf-8")
  LOGGER.info("Manifest updated with %s", slug)


def upload_to_storage(slug: str, article: Dict[str, Any]) -> Optional[str]:
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    LOGGER.info("Supabase upload skipped (service role key or URL missing)")
    return None

  storage_path = f"{ARTICLE_BUCKET}/{slug}/article.json"
  url = f"{SUPABASE_URL}/storage/v1/object/{storage_path}"
  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "x-upsert": "true"
  }
  response = requests.put(url, headers=headers, data=json.dumps(article).encode("utf-8"), timeout=60)
  if response.status_code not in {200, 201}:
    raise RuntimeError(f"Storage upload failed ({response.status_code}): {response.text}")

  LOGGER.info("Uploaded article JSON to storage path %s", storage_path)
  return storage_path


def upsert_article_row(slug: str, article: Dict[str, Any], storage_path: Optional[str]) -> None:
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    return

  url = f"{SUPABASE_URL}/rest/v1/articles"
  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Prefer": "resolution=merge-duplicates"
  }
  payload = {
      "slug": slug,
      "title": article.get("title"),
      "summary": article.get("summary"),
      "hero_stats": article.get("heroStats"),
      "tags": article.get("tags"),
      "storage_path": storage_path,
      "references": article.get("references"),
      "updated_at": datetime.now(datetime.UTC).isoformat() if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat() + "Z"
  }
  response = requests.post(url, headers=headers, params={"select": "slug"}, json=payload, timeout=60)
  if response.status_code not in {200, 201}:
    raise RuntimeError(f"Failed to upsert article row ({response.status_code}): {response.text}")
  LOGGER.info("Upserted article metadata for slug %s", slug)


def load_topics(args: argparse.Namespace) -> List[str]:
  topics: List[str] = []
  if args.topics_file:
    lines = Path(args.topics_file).read_text(encoding="utf-8").splitlines()
    topics.extend([line.strip() for line in lines if line.strip()])
  if args.topic:
    topics.extend(args.topic)
  if not topics:
    topics = DEFAULT_TOPICS
  return topics


def generate_articles(topics: Iterable[str], delay: float = 2.0) -> None:
  failed_topics = []
  successful_count = 0

  for topic in topics:
    try:
      LOGGER.info("Processing topic: %s", topic)
      prompt = build_prompt(topic)
      raw_text, citations = call_researcher(prompt)
      LOGGER.info("🔍 Backend sent %d citations", len(citations))
      article = extract_json_payload(raw_text)
      LOGGER.info("📄 Model generated article with %d references", len(article.get('references', [])))
      ensure_references(article, citations)
      LOGGER.info("✅ After ensure_references: %d references", len(article.get('references', [])))
      validate_article(article)
      slug = slugify_article(article)
      article["slug"] = slug

      write_local_files(slug, article, raw_text)
      update_manifest(slug, article)

      storage_path = None
      try:
        storage_path = upload_to_storage(slug, article)
        upsert_article_row(slug, article, storage_path)
      except Exception as exc:  # pragma: no cover - optional upload path
        LOGGER.error("Supabase upload failed: %s", exc)

      LOGGER.info("✅ Topic complete: %s", topic)
      successful_count += 1

    except Exception as exc:
      LOGGER.error("❌ Failed to generate article for '%s': %s", topic, exc)
      failed_topics.append((topic, str(exc)))
      # Continue with next topic instead of failing completely

    if delay:
      time.sleep(delay)

  # Summary at the end
  LOGGER.info("")
  LOGGER.info("=" * 60)
  LOGGER.info("Generation Summary:")
  LOGGER.info("  ✅ Successful: %d", successful_count)
  LOGGER.info("  ❌ Failed: %d", len(failed_topics))
  if failed_topics:
    LOGGER.info("")
    LOGGER.info("Failed topics:")
    for topic, error in failed_topics:
      LOGGER.info("  - %s", topic)
      LOGGER.info("    Error: %s", error[:100])  # Truncate long error messages
  LOGGER.info("=" * 60)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Generate structured clinical articles at scale")
  parser.add_argument("--topic", action="append", help="Topic to generate (can be repeated)")
  parser.add_argument("--topics-file", help="File with one topic per line")
  parser.add_argument("--delay", type=float, default=2.0, help="Pause between requests in seconds (default: 2.0)")
  parser.add_argument("--log-level", default="INFO", help="Logging level (default: INFO)")
  return parser.parse_args(argv)


def configure_logging(level: str) -> None:
  logging.basicConfig(
      level=getattr(logging, level.upper(), logging.INFO),
      format="%(asctime)s | %(levelname)s | %(message)s",
      datefmt="%Y-%m-%d %H:%M:%S"
  )


def main(argv: Optional[List[str]] = None) -> int:
  args = parse_args(argv)
  configure_logging(args.log_level)
  try:
    topics = load_topics(args)
    generate_articles(topics, delay=args.delay)
  except KeyboardInterrupt:
    LOGGER.warning("Interrupted by user")
    return 130
  except Exception as exc:
    LOGGER.error("Generation failed: %s", exc)
    return 1
  return 0


if __name__ == "__main__":
  sys.exit(main())
