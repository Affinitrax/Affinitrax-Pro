/**
 * Email quality detection — identifies test/disposable email patterns
 * that must not be relayed to buyers.
 *
 * Blocked categories:
 *  1. Domains that exist exclusively for testing or disposable mail
 *  2. Local part ending in `_test`      → e.g. alejandro.pingree9563_test@gmail.com
 *  3. Local part starting with "test" followed by digit, underscore, or dot
 *     → e.g. test20250826103205@gmail.com, test_jennings81@mail.com,
 *            test.silviu20526@gmail.com, testlead1761397420@gmail.com
 */

const BLOCKED_DOMAINS = new Set([
  "mailtest.dev",
  "yopmail.com",
  "testmail.com",
  "test.com",
  "mailinator.com",
  "guerrillamail.com",
  "trashmail.com",
  "throwam.com",
  "sharklasers.com",
  "maildrop.cc",
  "discard.email",
  "spam4.me",
  "grr.la",
  "guerrillamailblock.com",
  "asda.gg",
  "aswda.gg",
]);

/**
 * Returns `true` when an email address matches a known test/fake pattern.
 * Safe to call with any string — returns `false` on malformed input.
 */
export function isTestPatternEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const atIdx = lower.indexOf("@");
  if (atIdx < 1) return false;

  const local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);

  // 1. Blocked disposable / test-only domains
  if (BLOCKED_DOMAINS.has(domain)) return true;

  // 2. Local part ends with _test  (name_test@gmail.com pattern)
  if (local.endsWith("_test")) return true;

  // 3. Local part starts with "test" followed by digit, underscore, or dot
  //    Catches: test20250826103205, test_jennings81, test.silviu20526, testlead1761397420
  if (/^test[\d_.]/.test(local)) return true;

  return false;
}
