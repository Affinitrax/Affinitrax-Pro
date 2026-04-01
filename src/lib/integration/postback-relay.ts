/**
 * Seller postback relay — fires GET requests to seller tracker URLs
 * after substituting placeholders with lead data.
 *
 * Supported placeholder syntaxes:
 *   double_bracket  [[param]]
 *   curly           {param}
 *   percent         %param%
 *   single_bracket  [param]
 */

export type PlaceholderSyntax =
  | "double_bracket"
  | "curly"
  | "percent"
  | "single_bracket";

export interface PostbackConfig {
  id: string;
  deal_id: string;
  event_type: string;
  seller_postback_url: string;
  placeholder_syntax: PlaceholderSyntax;
  status: "active" | "inactive";
}

export interface PostbackParams {
  lead_id?: string;
  click_id?: string;
  buyer_lead_id?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  event_type?: string;
  [key: string]: string | undefined;
}

function buildRegex(syntax: PlaceholderSyntax): RegExp {
  switch (syntax) {
    case "double_bracket":
      return /\[\[(\w+)\]\]/g;
    case "curly":
      return /\{(\w+)\}/g;
    case "percent":
      return /%(\w+)%/g;
    case "single_bracket":
      return /\[(\w+)\]/g;
  }
}

export function resolveUrl(
  template: string,
  params: PostbackParams,
  syntax: PlaceholderSyntax
): string {
  const regex = buildRegex(syntax);
  return template.replace(regex, (_match, key: string) => {
    const val = params[key];
    return val !== undefined ? encodeURIComponent(val) : "";
  });
}

export interface PostbackResult {
  raw_url: string;
  resolved_url: string;
  response_status: number | null;
  response_body: string | null;
  fired_at: string;
}

/** Fire a single postback and return the result record. */
export async function firePostback(
  config: PostbackConfig,
  params: PostbackParams
): Promise<PostbackResult> {
  const resolved = resolveUrl(
    config.seller_postback_url,
    params,
    config.placeholder_syntax
  );
  const firedAt = new Date().toISOString();

  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const resp = await fetch(resolved, {
      method: "GET",
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });
    responseStatus = resp.status;
    responseBody = await resp.text().then((t) => t.slice(0, 2000)); // cap body
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err);
  }

  return {
    raw_url: config.seller_postback_url,
    resolved_url: resolved,
    response_status: responseStatus,
    response_body: responseBody,
    fired_at: firedAt,
  };
}
