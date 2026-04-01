/**
 * AES-256-GCM encrypt / decrypt for buyer API credentials stored at rest.
 * Key is sourced from INTEGRATION_ENCRYPTION_KEY env var (32-byte hex string).
 */

const ALG = "AES-GCM";
const KEY_HEX_LEN = 64; // 32 bytes = 64 hex chars

function getKey(): Promise<CryptoKey> {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LEN) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY contains invalid characters — must be hex only"
    );
  }
  const bytes = new Uint8Array(
    hex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  return crypto.subtle.importKey("raw", bytes, ALG, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypts plaintext → base64(iv + ciphertext + authTag) */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: ALG, iv },
    key,
    encoded
  );
  // Concat iv + ciphertext+tag into one buffer
  const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.byteLength);
  return Buffer.from(combined).toString("base64");
}

/** Decrypts base64(iv + ciphertext + authTag) → plaintext */
export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey();
  const combined = new Uint8Array(Buffer.from(encoded, "base64"));
  const iv = combined.slice(0, 12);
  const cipherBuf = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt(
    { name: ALG, iv },
    key,
    cipherBuf
  );
  return new TextDecoder().decode(plainBuf);
}
