/**
 * Applies integration_field_mappings to a raw lead payload.
 * Translates Affinitrax field names → buyer CRM field names and
 * applies any configured transform.
 */

export type Transform =
  | "none"
  | "uppercase"
  | "lowercase"
  | "e164_phone"
  | "strip_plus";

export interface FieldMapping {
  affinitrax_field: string;
  buyer_field: string;
  required: boolean;
  default_value: string | null;
  transform: Transform;
}

/** Normalise a phone number to E.164 format (+XXXXXXXXXXX). */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  // Already looks like it starts with country code (length >= 10)
  return `+${digits}`;
}

function applyTransform(value: string, transform: Transform): string {
  switch (transform) {
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "e164_phone":
      return toE164(value);
    case "strip_plus":
      return value.startsWith("+") ? value.slice(1) : value;
    default:
      return value;
  }
}

/**
 * Map a flat lead object using the provided field mapping config.
 * Returns { mapped, missingRequired } so the caller can reject if needed.
 */
export function applyFieldMappings(
  lead: Record<string, string | null | undefined>,
  mappings: FieldMapping[]
): { mapped: Record<string, string>; missingRequired: string[] } {
  const mapped: Record<string, string> = {};
  const missingRequired: string[] = [];

  // Sort by sort_order (already enforced at DB level, but defensive here)
  const sorted = [...mappings]; // already ordered by sort_order from DB

  for (const m of sorted) {
    const raw = lead[m.affinitrax_field] ?? m.default_value ?? null;

    if (raw === null || raw === "") {
      if (m.required) {
        missingRequired.push(m.affinitrax_field);
      }
      // Skip empty optional fields — don't send them to buyer
      continue;
    }

    mapped[m.buyer_field] = applyTransform(String(raw), m.transform);
  }

  return { mapped, missingRequired };
}

/**
 * Extract a nested value from an object using dot-notation path.
 * e.g. path="details.leadRequest.ID" on { details: { leadRequest: { ID: "123" } } }
 */
export function extractByPath(
  obj: unknown,
  path: string
): string | null {
  if (!path || obj === null || typeof obj !== "object") return null;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  if (current === null || current === undefined) return null;
  return String(current);
}
