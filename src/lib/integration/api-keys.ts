/**
 * Seller API key lifecycle management.
 *
 * Keys follow the format:  afx_<48 random hex chars>
 * Only the SHA-256 hash is stored in the DB (key_hash column).
 * The 12-char prefix (afx_ + first 8 hex) is stored for display (key_prefix).
 */

const PREFIX = "afx_";

/** Generate a new API key. Returns the full key (shown once) and its stored parts. */
export async function generateApiKey(): Promise<{
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
}> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const fullKey = `${PREFIX}${hex}`;
  const keyHash = await hashApiKey(fullKey);
  const keyPrefix = fullKey.slice(0, 12); // "afx_" + 8 hex chars
  return { fullKey, keyHash, keyPrefix };
}

/** SHA-256 hash of the raw key for DB storage. */
export async function hashApiKey(fullKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(fullKey);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify a raw key string against a stored hash. */
export async function verifyApiKey(
  fullKey: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashApiKey(fullKey);
  // Constant-time comparison to prevent timing attacks
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
