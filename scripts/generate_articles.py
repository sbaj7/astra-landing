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
  ARTICLE_GENERATOR_KEY – Secret batch key configured on the researcher edge function

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
from datetime import datetime, timezone
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
ARTICLE_GENERATOR_ANONYMOUS_ID = getenv("ARTICLE_GENERATOR_ANONYMOUS_ID", "astra_article_generator_v2")
ARTICLE_GENERATOR_KEY = getenv("ARTICLE_GENERATOR_KEY")
ARTICLE_USAGE_LOG = Path(getenv("ARTICLE_USAGE_LOG", ".article-batch/usage.jsonl"))
OPENAI_INPUT_COST_PER_MILLION = float(getenv("OPENAI_INPUT_COST_PER_MILLION", "2.0"))
OPENAI_CACHED_INPUT_COST_PER_MILLION = float(getenv("OPENAI_CACHED_INPUT_COST_PER_MILLION", "0.2"))
OPENAI_CACHE_WRITE_COST_PER_MILLION = float(getenv("OPENAI_CACHE_WRITE_COST_PER_MILLION", "2.5"))
OPENAI_OUTPUT_COST_PER_MILLION = float(getenv("OPENAI_OUTPUT_COST_PER_MILLION", "12.0"))
OPENAI_PLANNER_INPUT_COST_PER_MILLION = float(getenv("OPENAI_PLANNER_INPUT_COST_PER_MILLION", "0.2"))
OPENAI_PLANNER_CACHED_INPUT_COST_PER_MILLION = float(getenv("OPENAI_PLANNER_CACHED_INPUT_COST_PER_MILLION", "0.02"))
OPENAI_PLANNER_CACHE_WRITE_COST_PER_MILLION = float(getenv("OPENAI_PLANNER_CACHE_WRITE_COST_PER_MILLION", "0.25"))
OPENAI_PLANNER_OUTPUT_COST_PER_MILLION = float(getenv("OPENAI_PLANNER_OUTPUT_COST_PER_MILLION", "1.2"))
ARTICLE_MAX_ESTIMATED_OPENAI_COST_USD = float(getenv("ARTICLE_MAX_ESTIMATED_OPENAI_COST_USD", "0.25"))


class CostSafetyError(RuntimeError):
  pass


def build_prompt(topic: str) -> str:
  """Instruct the researcher model to emit JSON matching the front-end schema."""

  schema_description = json.dumps(
      {
          "schemaVersion": 2,
          "eyebrow": "short specialty label",
          "title": "concise clinical topic only, usually 2-6 words; no subtitle, colon, or list of covered domains",
          "summary": "one compelling 35-45 word description answering search intent",
          "seoDescription": "one natural 120-160 character search description with no citations",
          "clinicalQuestion": "one sentence, no more than 25 words",
          "specialty": "string",
          "audience": "U.S. physicians and medical trainees",
          "tags": ["specific search terms when useful"],
          "keyTakeaways": ["concise, practice-changing statements with citations"],
          "sections": [
              {
                  "id": "short-kebab-case-id",
                  "eyebrow": "optional short label",
                  "heading": "descriptive heading matching real search intent",
                  "intro": "optional orientation, no more than 20 words",
                  "paragraphs": ["1-3 concise, decision-focused paragraphs with inline [N] citations"],
                  "bullets": ["optional practical bullets with citations"],
                  "subsections": [
                      {
                          "heading": "string",
                          "paragraphs": ["use only when essential; concise and decision-focused"],
                          "bullets": ["optional bullets with inline [N] citations"]
                      }
                  ],
                  "table": {
                      "caption": "accessible caption with citations when it makes a clinical claim",
                      "columns": ["clear decision-oriented column headings"],
                      "rows": [["compact cell values with inline [N] citations for clinical claims"]]
                  }
              }
          ],
          "faq": [{"question": "useful physician search question", "answer": "concise decision-relevant answer with citations"}],
          "references": [],
          "editorialNote": "Prepared from cited clinical literature using Astra's research workflow. Verify recommendations against current guidance and patient-specific factors."
      },
      indent=2
  )

  # The backend receives `topic` separately as research_query, so these editorial
  # instructions do not dilute search-query planning.
  return (
      f"{topic}\n\n"
      f"Output JSON: {schema_description}\n"
      "Create an original point-of-care article for U.S. physicians. Aim for roughly 1,800 words, usually 1,500-2,200 when the topic warrants it. Start at the "
      "decision layer: assume the reader already knows basic definitions and common symptoms. Every paragraph must add a named test, threshold, interpretation, "
      "drug and source-supported dose, procedure indication, timing rule, quantified risk, exception, tradeoff, or next step. Delete any sentence that merely "
      "sounds medical without changing a decision. "
      "For a syndrome or umbrella topic, build an actionable branching framework: immediate threats, the initial workup, the major etiologic patterns and how to "
      "distinguish them, when pathology or specialist escalation is needed, immediate supportive management, and cause-directed next steps. Name the actual diseases, "
      "tests, serologies, imaging, pathology patterns, agents, and monitoring parameters supported by the sources. For narrower topics, use only the domains that matter. "
      "Do not narrate the research process or complain about evidence retrieval. Never write 'the supplied evidence,' 'the supplied sources,' 'the available results,' "
      "or similar source commentary. If a specific detail is unsupported, omit it. Discuss uncertainty only when it is a real clinical controversy that changes care. "
      "Avoid throat-clearing, generic background, vague advice, repeated summaries, and duplicated facts across takeaways, prose, tables, and FAQs. Use tables only to "
      "compress a true differential, threshold comparison, treatment selection, or monitoring algorithm. FAQs are optional and should be empty unless they add a decision "
      "not already answered. Use a short title containing only the recognized clinical topic. "
      "Return references as an empty array because the API attaches them separately. Cite every pathophysiologic, quantitative, diagnostic, prognostic, testing, "
      "dosing, procedural, and treatment claim as [N], including claims in tables. Write multiple citations as separate markers such as [1][8][9][12], never "
      "inside one bracket such as [1,8,9,12]. Prefer primary guidelines, FDA labels, systematic reviews, and pivotal trials. "
      "Use only supplied search results [1]-[N]. Never invent evidence, numbers, doses, thresholds, or recommendations, and never make a claim stronger than its "
      "source. Return only valid JSON with no markdown fences."
  )


def build_research_query(topic: str) -> str:
  return f"{topic}"


def call_researcher(prompt: str, research_query: str) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
  if not RESEARCHER_ENDPOINT:
    raise RuntimeError("RESEARCHER_ENDPOINT environment variable is required")
  if not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_ANON_KEY environment variable is required")
  if not ARTICLE_GENERATOR_KEY:
    raise RuntimeError("ARTICLE_GENERATOR_KEY environment variable is required")

  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
      "apikey": SUPABASE_ANON_KEY,
      "x-astra-article-key": ARTICLE_GENERATOR_KEY
  }
  payload = {
      "query": prompt,
      "research_query": research_query,
      "mode": "article-research",
      "isClinical": False,
      "isReason": False,
      "isWrite": False,
      "stream": True,
      "anonymous_id": ARTICLE_GENERATOR_ANONYMOUS_ID
  }

  LOGGER.info("Requesting article from researcher endpoint …")
  response = requests.post(RESEARCHER_ENDPOINT, headers=headers, json=payload, stream=True, timeout=300)
  if response.status_code >= 400:
    raise RuntimeError(f"Researcher error {response.status_code}: {response.text}")

  citations: List[Dict[str, Any]] = []
  content_parts: List[str] = []
  usage: Dict[str, Any] = {}

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

      if isinstance(payload_json, dict) and "usage" in payload_json:
        usage = payload_json
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

  return content, citations, usage


def estimate_usage_cost(
    usage: Dict[str, Any],
    input_rate: float,
    cached_input_rate: float,
    cache_write_rate: float,
    output_rate: float
) -> float:
  input_tokens = int(usage.get("input_tokens") or 0)
  output_tokens = int(usage.get("output_tokens") or 0)
  input_details = usage.get("input_tokens_details") or {}
  cached_tokens = min(input_tokens, int(input_details.get("cached_tokens") or 0))
  cache_write_tokens = min(
      input_tokens - cached_tokens,
      int(input_details.get("cache_write_tokens") or 0)
  )
  uncached_tokens = input_tokens - cached_tokens - cache_write_tokens
  long_context = input_tokens > 272_000
  input_multiplier = 2.0 if long_context else 1.0
  output_multiplier = 1.5 if long_context else 1.0
  return (
      uncached_tokens * input_rate * input_multiplier
      + cached_tokens * cached_input_rate * input_multiplier
      + cache_write_tokens * cache_write_rate * input_multiplier
      + output_tokens * output_rate * output_multiplier
  ) / 1_000_000


def estimate_openai_cost(usage_event: Dict[str, Any]) -> float:
  article_cost = estimate_usage_cost(
      usage_event.get("usage") or {},
      OPENAI_INPUT_COST_PER_MILLION,
      OPENAI_CACHED_INPUT_COST_PER_MILLION,
      OPENAI_CACHE_WRITE_COST_PER_MILLION,
      OPENAI_OUTPUT_COST_PER_MILLION
  )
  planner_cost = estimate_usage_cost(
      usage_event.get("plannerUsage") or {},
      OPENAI_PLANNER_INPUT_COST_PER_MILLION,
      OPENAI_PLANNER_CACHED_INPUT_COST_PER_MILLION,
      OPENAI_PLANNER_CACHE_WRITE_COST_PER_MILLION,
      OPENAI_PLANNER_OUTPUT_COST_PER_MILLION
  )
  return article_cost + planner_cost


def record_usage(topic: str, usage_event: Dict[str, Any]) -> float:
  if not usage_event:
    raise CostSafetyError(f"No usage event returned for {topic}; stopping to prevent unmetered generation")
  estimated_cost = estimate_openai_cost(usage_event)
  entry = {
      "timestamp": datetime.now(timezone.utc).isoformat(),
      "topic": topic,
      **usage_event,
      "estimatedOpenAICostUsd": round(estimated_cost, 6)
  }
  ARTICLE_USAGE_LOG.parent.mkdir(parents=True, exist_ok=True)
  with ARTICLE_USAGE_LOG.open("a", encoding="utf-8") as usage_file:
    usage_file.write(json.dumps(entry, ensure_ascii=False) + "\n")
  usage = usage_event.get("usage") or {}
  LOGGER.info(
      "💵 Usage: %s input tokens, %s output tokens, approximately $%.4f OpenAI",
      usage.get("input_tokens", 0),
      usage.get("output_tokens", 0),
      estimated_cost
  )
  if estimated_cost > ARTICLE_MAX_ESTIMATED_OPENAI_COST_USD:
    raise CostSafetyError(
        f"Estimated OpenAI cost ${estimated_cost:.4f} exceeded the "
        f"${ARTICLE_MAX_ESTIMATED_OPENAI_COST_USD:.2f} per-article safety limit"
    )
  return estimated_cost


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


def normalize_grouped_citations(value: Any) -> Any:
  if isinstance(value, str):
    return re.sub(
        r"\[((?:\d+\s*,\s*)+\d+)\]",
        lambda match: "".join(f"[{number}]" for number in re.findall(r"\d+", match.group(1))),
        value
    )
  if isinstance(value, list):
    return [normalize_grouped_citations(item) for item in value]
  if isinstance(value, dict):
    return {key: normalize_grouped_citations(item) for key, item in value.items()}
  return value

def article_editorial_word_count(article: Dict[str, Any]) -> int:
  text_parts: List[str] = [article.get("summary", ""), article.get("clinicalQuestion", "")]
  text_parts.extend(article.get("keyTakeaways", []))

  for section in article.get("sections", []):
    text_parts.extend([section.get("heading", ""), section.get("intro", "")])
    text_parts.extend(section.get("paragraphs", []))
    text_parts.extend(section.get("bullets", []))

    for subsection in section.get("subsections", []):
      text_parts.append(subsection.get("heading", ""))
      text_parts.extend(subsection.get("paragraphs", []))
      text_parts.extend(subsection.get("bullets", []))

    table = section.get("table") or {}
    text_parts.append(table.get("caption", ""))
    text_parts.extend(table.get("columns", []))
    for row in table.get("rows", []):
      text_parts.extend(row)

  for item in article.get("faq", []):
    text_parts.extend([item.get("question", ""), item.get("answer", "")])

  text = " ".join(str(part) for part in text_parts if part)
  text = re.sub(r"\[\d+(?:\s*[,–-]\s*\d+)*\]", "", text)
  return len(text.split())


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
          "seoDescription": article.get("seoDescription"),
          "specialty": article.get("specialty"),
          "tags": article.get("tags", []),
          "publishedAt": article.get("publishedAt"),
          "updatedAt": article.get("updatedAt"),
          "generatedAt": article.get("updatedAt"),
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


def upload_manifest_to_storage() -> None:
  if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
    return

  url = f"{SUPABASE_URL}/storage/v1/object/{ARTICLE_BUCKET}/index.json"
  headers = {
      "Content-Type": "application/json",
      "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "x-upsert": "true"
  }
  response = requests.put(url, headers=headers, data=MANIFEST_PATH.read_bytes(), timeout=60)
  if response.status_code not in {200, 201}:
    raise RuntimeError(f"Manifest upload failed ({response.status_code}): {response.text}")
  LOGGER.info("Uploaded article manifest to %s/index.json", ARTICLE_BUCKET)


def estimate_reading_minutes(article: Dict[str, Any]) -> int:
  text_parts: List[str] = [article.get("summary", "")]
  text_parts.extend(article.get("keyTakeaways", []))
  for section in article.get("sections", []):
    text_parts.extend(section.get("paragraphs", []))
    text_parts.extend(section.get("bullets", []))
    for subsection in section.get("subsections", []):
      text_parts.extend(subsection.get("paragraphs", []))
      text_parts.extend(subsection.get("bullets", []))
  word_count = len(" ".join(str(part) for part in text_parts).split())
  return max(1, round(word_count / 220))


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


def normalize_topic(value: str) -> str:
  return re.sub(r"\s+", " ", value).strip().casefold()


def load_completed_topics(path: Optional[Path]) -> set[str]:
  if not path or not path.exists():
    return set()
  return {normalize_topic(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def record_completed_topic(path: Optional[Path], topic: str) -> None:
  if not path:
    return
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("a", encoding="utf-8") as progress_file:
    progress_file.write(f"{topic.strip()}\n")
    progress_file.flush()


def generate_articles(topics: Iterable[str], delay: float = 2.0, resume_file: Optional[Path] = None) -> None:
  failed_topics = []
  successful_count = 0
  skipped_count = 0
  completed_topics = load_completed_topics(resume_file)

  for topic in topics:
    if normalize_topic(topic) in completed_topics:
      LOGGER.info("Skipping completed topic: %s", topic)
      skipped_count += 1
      continue
    try:
      LOGGER.info("Processing topic: %s", topic)
      prompt = build_prompt(topic)
      raw_text, citations, usage = call_researcher(prompt, build_research_query(topic))
      record_usage(topic, usage)
      LOGGER.info("🔍 Backend sent %d citations", len(citations))
      article = normalize_grouped_citations(extract_json_payload(raw_text))
      LOGGER.info("📄 Model generated article with %d references", len(article.get('references', [])))
      ensure_references(article, citations)
      article = normalize_grouped_citations(article)
      LOGGER.info("✅ After ensure_references: %d references", len(article.get('references', [])))
      now = datetime.now(timezone.utc).isoformat()
      article["schemaVersion"] = 2
      article.setdefault("publishedAt", now)
      article["updatedAt"] = now
      article["readingMinutes"] = estimate_reading_minutes(article)
      article.setdefault("audience", "U.S. physicians and medical trainees")
      article.setdefault("editorialNote", "Prepared from cited clinical literature using Astra's research workflow. Verify recommendations against current guidance and patient-specific factors.")
      article["slug"] = _slugify(article.get("title") or topic)
      editorial_word_count = article_editorial_word_count(article)
      LOGGER.info("📝 Editorial word count: %d", editorial_word_count)
      slug = slugify_article(article)
      article["slug"] = slug

      write_local_files(slug, article, raw_text)
      update_manifest(slug, article)

      storage_path = None
      try:
        storage_path = upload_to_storage(slug, article)
        if storage_path:
          upload_manifest_to_storage()
      except Exception as exc:  # pragma: no cover - optional upload path
        LOGGER.error("Supabase upload failed: %s", exc)

      LOGGER.info("✅ Topic complete: %s", topic)
      successful_count += 1
      completed_topics.add(normalize_topic(topic))
      record_completed_topic(resume_file, topic)

    except CostSafetyError as exc:
      LOGGER.critical("🛑 Cost safety stop: %s", exc)
      raise
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
  LOGGER.info("  ⏭️ Skipped: %d", skipped_count)
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
  parser.add_argument("--resume-file", help="Append completed topics here and skip them on restart")
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
    generate_articles(topics, delay=args.delay, resume_file=Path(args.resume_file) if args.resume_file else None)
  except KeyboardInterrupt:
    LOGGER.warning("Interrupted by user")
    return 130
  except Exception as exc:
    LOGGER.error("Generation failed: %s", exc)
    return 1
  return 0


if __name__ == "__main__":
  sys.exit(main())
