const FALLBACK_BASE_URL = 'https://astramd.org';

const stripTrailingSlash = (input) => input.replace(/\/+$/, '');

export function getBaseUrl() {
  const raw =
    process.env.PRERENDER_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    FALLBACK_BASE_URL;

  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      '[site-config] Unable to resolve base URL. Set PRERENDER_BASE_URL or PUBLIC_BASE_URL.'
    );
  }

  const normalized = stripTrailingSlash(raw.trim());

  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(
      `[site-config] Base URL must include protocol (http/https). Received "${raw}".`
    );
  }

  if (
    normalized === 'https://example.com' &&
    !process.env.PRERENDER_BASE_URL &&
    !process.env.PUBLIC_BASE_URL
  ) {
    throw new Error(
      '[site-config] Refusing to build with placeholder domain https://example.com. Set PRERENDER_BASE_URL or PUBLIC_BASE_URL.'
    );
  }

  if (!process.env.PRERENDER_BASE_URL && !process.env.PUBLIC_BASE_URL) {
    console.warn(
      `[site-config] Using fallback base URL ${FALLBACK_BASE_URL}. Set PRERENDER_BASE_URL to override.`
    );
  }

  return normalized;
}
