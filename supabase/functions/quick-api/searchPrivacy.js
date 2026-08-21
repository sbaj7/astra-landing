const MONTH_NAME = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const LABELED_DATE = `(?:\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|${MONTH_NAME}\\s+\\d{1,2},?\\s+\\d{4})`;

// This is deliberately a light search-boundary scrubber, not a general-purpose
// de-identification engine. Only explicit direct identifiers are removed so
// medical vocabulary, gene names, drug names, and organisms remain untouched.
export function sanitizeSearchQuery(input) {
  let query = String(input || "").split("=== VISION ANALYSIS")[0];

  query = query
    .replace(/data:[^,\s]+;base64,[A-Za-z0-9+/=]+/gi, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, " ")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, " ")
    .replace(/\b(?:MRN|medical record(?: number)?|patient ID|member ID|account ID)\s*[:#=-]?\s*[A-Z0-9][A-Z0-9._/-]{1,}\b/gi, " ")
    .replace(new RegExp(`\\b(?:DOB|date of birth|born)\\s*(?:on|[:#=-])?\\s*${LABELED_DATE}\\b`, "gi"), " ")
    .replace(/\b(?:patient\s+(?:named|name is)|patient name\s*[:=])\s*[A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){1,2}\b/gi, "patient")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return query.slice(0, 300);
}
