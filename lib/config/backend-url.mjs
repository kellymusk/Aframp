/**
 * Validate NEXT_API_URL at startup.
 *
 * next.config.mjs forwards every `/backend/*` request to this host, so an
 * attacker-controlled value would turn the proxy into an SSRF vector and leak
 * auth tokens. We therefore require an http(s) URL and refuse to build
 * otherwise.
 *
 * Values pasted into a hosting dashboard often arrive as a bare host
 * (`api.example.com`) or wrapped in quotes; both are normalized rather than
 * failing the deployment, with a bare host assumed to be https.
 *
 * There is no default: the backend origin is deployment configuration, and
 * local development sets it in `.env.local` like any other environment.
 *
 * @param {string | undefined} raw
 * @returns {string | null} normalized backend URL without a trailing slash,
 *   or null when NEXT_API_URL is unset
 */
export function resolveBackendUrl(raw) {
  // An empty value (e.g. an unset CI secret, which arrives as "") means unset.
  let value =
    raw
      ?.trim()
      .replace(/^(['"])(.*)\1$/, '$2')
      .trim() ?? ''
  if (!value) return null
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    value = `https://${value}`
  }
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      `Invalid NEXT_API_URL: "${raw}" is not a valid URL. ` +
        'Expected format: http(s)://host[:port] (e.g. https://api.example.com).'
    )
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid NEXT_API_URL: "${raw}" must use http or https, got "${parsed.protocol}". ` +
        'Expected format: http(s)://host[:port] (e.g. https://api.example.com).'
    )
  }
  return value.replace(/\/+$/, '')
}
