import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/portal/CopyButton";

export const metadata: Metadata = {
  title: "Seller API Reference — Affinitrax",
  description: "Complete API documentation for sellers integrating leads with Affinitrax.",
  robots: { index: false, follow: false },
};

const BASE = "https://affinitrax.com";

const CURL_SUBMIT = `curl -X POST ${BASE}/api/v1/leads \\
  -H "X-API-Key: afx_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john.doe@example.com",
    "phone": "+4917612345678",
    "first_name": "John",
    "last_name": "Doe",
    "country": "DE",
    "click_id": "your_click_id_here"
  }'`;

const CURL_STATUS = `curl ${BASE}/api/v1/leads/LEAD_ID \\
  -H "X-API-Key: afx_YOUR_API_KEY"`;

const RESPONSE_OK = `{
  "lead_id": "a3f1c2d4-...",
  "status": "relayed",
  "buyer_lead_id": "12345",
  "redirect_url": null
}`;

const RESPONSE_ERROR = `{
  "error": "email is required"
}`;

const JS_EXAMPLE = `const res = await fetch("${BASE}/api/v1/leads", {
  method: "POST",
  headers: {
    "X-API-Key": "afx_YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "john.doe@example.com",
    phone: "+4917612345678",
    first_name: "John",
    last_name: "Doe",
    country: "DE",
    click_id: "your_click_id",
  }),
});

const lead = await res.json();
console.log(lead.id, lead.status);`;

const PHP_EXAMPLE = `$ch = curl_init("${BASE}/api/v1/leads");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => [
    "X-API-Key: afx_YOUR_API_KEY",
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS     => json_encode([
    "email"      => "john.doe@example.com",
    "phone"      => "+4917612345678",
    "first_name" => "John",
    "last_name"  => "Doe",
    "country"    => "DE",
    "click_id"   => "your_click_id",
  ]),
]);

$response = json_decode(curl_exec($ch), true);
echo $response["id"];`;

type Field = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

const FIELDS: Field[] = [
  { name: "email",      type: "string", required: true,  description: "Lead email address" },
  { name: "phone",      type: "string", required: true,  description: "Phone number — any format accepted (e.g. +4917612345678 or 00491761...)" },
  { name: "first_name", type: "string", required: false, description: "Lead first name" },
  { name: "last_name",  type: "string", required: false, description: "Lead last name" },
  { name: "country",    type: "string", required: true,  description: "2-letter country code (ISO 3166-1 alpha-2). Example: DE, GB, US" },
  { name: "ip",         type: "string", required: false, description: "Lead IP address (IPv4 or IPv6)" },
  { name: "click_id",   type: "string", required: false, description: "Your tracking / click ID — sent back in postbacks to match conversions" },
  { name: "sub1",       type: "string", required: false, description: "Custom sub-parameter 1 (campaign, source, etc.)" },
  { name: "sub2",       type: "string", required: false, description: "Custom sub-parameter 2" },
  { name: "sub3",       type: "string", required: false, description: "Custom sub-parameter 3" },
];

const STATUSES = [
  { s: "pending",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30",   desc: "Lead received and queued for relay" },
  { s: "relayed",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30",      desc: "Lead delivered to buyer CRM successfully" },
  { s: "ftd",      color: "bg-green-500/15 text-green-400 border-green-500/30",   desc: "First-time deposit confirmed by buyer" },
  { s: "failed",   color: "bg-red-500/15 text-red-400 border-red-500/30",         desc: "Relay failed — buyer CRM rejected or unreachable" },
  { s: "rejected", color: "bg-red-500/15 text-red-400 border-red-500/30",         desc: "Lead rejected (duplicate, invalid fields, etc.)" },
];

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/7 mt-3">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/3 border-b border-white/7">
          <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre
        className="px-4 py-4 text-xs text-[#00d4ff] overflow-x-auto leading-relaxed"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: "#0d0d1a" }}
      >
        {code}
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="text-lg font-bold text-white font-display border-b border-white/7 pb-3">{title}</h2>
      {children}
    </section>
  );
}

function Tag({ children, color = "cyan" }: { children: React.ReactNode; color?: "cyan" | "green" | "amber" | "red" }) {
  const colors: Record<string, string> = {
    cyan:  "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/25",
    green: "bg-green-500/10 text-green-400 border-green-500/25",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    red:   "bg-red-500/10 text-red-400 border-red-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function SellerApiDocs() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a14" }}>
      {/* Top nav */}
      <nav className="border-b border-white/7 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white font-bold font-display text-lg tracking-tight">Affinitrax</Link>
          <span className="text-[#334155] text-sm">/</span>
          <span className="text-[#94a3b8] text-sm">Seller API Reference</span>
        </div>
        <a
          href="/portal/login"
          className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          Partner portal →
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-8 space-y-1 text-sm">
            {[
              { id: "overview",     label: "Overview" },
              { id: "auth",         label: "Authentication" },
              { id: "submit-lead",  label: "Submit a lead" },
              { id: "check-status", label: "Check lead status" },
              { id: "postbacks",    label: "Postbacks" },
              { id: "fields",       label: "Field reference" },
              { id: "statuses",     label: "Lead statuses" },
              { id: "errors",       label: "Errors" },
              { id: "examples",     label: "Code examples" },
            ].map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="block px-3 py-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/5 transition-colors text-xs"
              >
                {label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">
          {/* Hero */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
              Seller API v1
            </div>
            <h1 className="text-3xl font-bold text-white font-display mb-3">Seller API Reference</h1>
            <p className="text-[#94a3b8] text-base leading-relaxed max-w-2xl">
              Submit leads directly to Affinitrax via HTTP. Your leads are authenticated, validated, and
              relayed to the buyer&apos;s CRM automatically. You get postbacks when conversions are confirmed.
            </p>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-white/7">
                <span className="text-[#475569] text-xs uppercase tracking-widest font-semibold">Base URL</span>
                <code className="text-[#00d4ff] text-sm font-mono">{BASE}</code>
                <CopyButton text={BASE} />
              </div>
              <Tag>REST JSON API</Tag>
              <Tag color="green">Always HTTPS</Tag>
            </div>
          </div>

          {/* Authentication */}
          <Section id="auth" title="Authentication">
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              Every request must include your API key. Keys start with <code className="text-[#00d4ff] font-mono text-xs">afx_</code> and are
              issued by your Affinitrax account manager. Keep your key secret — treat it like a password.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="glass rounded-xl p-4 border border-white/7">
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold mb-2">Option 1 — Header (recommended)</p>
                <code className="text-[#00d4ff] text-xs font-mono block">X-API-Key: afx_YOUR_KEY</code>
              </div>
              <div className="glass rounded-xl p-4 border border-white/7">
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold mb-2">Option 2 — Bearer token</p>
                <code className="text-[#00d4ff] text-xs font-mono block">Authorization: Bearer afx_YOUR_KEY</code>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
              <p className="text-amber-400 text-xs">
                <span className="font-semibold">Rate limit:</span> 200 requests per IP per minute.
                Exceeding this returns HTTP 429 — implement exponential back-off.
              </p>
            </div>
          </Section>

          {/* Submit lead */}
          <Section id="submit-lead" title="Submit a lead">
            <div className="flex items-center gap-3">
              <Tag color="green">POST</Tag>
              <code className="text-white font-mono text-sm">/api/v1/leads</code>
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              Sends a lead to Affinitrax. The lead is validated, stored, and immediately relayed to the
              buyer&apos;s CRM. The response includes the lead ID you should store for status checks and
              postback matching.
            </p>
            <CodeBlock label="cURL example" code={CURL_SUBMIT} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold mb-2">Success response — 200</p>
                <CodeBlock code={RESPONSE_OK} />
              </div>
              <div>
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold mb-2">Validation error — 400</p>
                <CodeBlock code={RESPONSE_ERROR} />
              </div>
            </div>

            <div className="mt-2 p-3 rounded-lg bg-[#00d4ff]/5 border border-[#00d4ff]/15">
              <p className="text-[#00d4ff] text-xs">
                <span className="font-semibold">Tip:</span> Store the returned <code className="font-mono">id</code> alongside your{" "}
                <code className="font-mono">click_id</code>. You&apos;ll receive this ID in postbacks so you can match FTDs back to your traffic.
              </p>
            </div>
          </Section>

          {/* Check status */}
          <Section id="check-status" title="Check lead status">
            <div className="flex items-center gap-3">
              <Tag>GET</Tag>
              <code className="text-white font-mono text-sm">/api/v1/leads/:id</code>
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              Returns the current status of a lead. Use this to confirm relay or to poll for FTD status
              if you are not using postbacks.
            </p>
            <CodeBlock label="cURL example" code={CURL_STATUS} />
            <div className="mt-2 p-3 rounded-lg bg-white/3 border border-white/7">
              <p className="text-[#94a3b8] text-xs leading-relaxed">
                <span className="font-semibold text-white">Note:</span> You can only fetch leads that belong to your API key&apos;s deal.
                Attempting to fetch another deal&apos;s lead returns HTTP 404.
              </p>
            </div>
          </Section>

          {/* Postbacks */}
          <Section id="postbacks" title="Postbacks (conversion tracking)">
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              When a buyer confirms a conversion (FTD, deposit, etc.), Affinitrax fires a postback to
              your configured URL. You must provide your postback URL to your Affinitrax account manager
              so it can be set up in the system.
            </p>

            <div className="glass rounded-xl border border-white/7 overflow-hidden mt-4">
              <div className="px-4 py-2.5 bg-white/3 border-b border-white/7">
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold">Postback URL template</p>
              </div>
              <div className="px-4 py-4">
                <code className="text-[#00d4ff] text-xs font-mono block leading-relaxed break-all">
                  https://your-tracker.com/postback?click_id=[[click_id]]&payout=[[payout]]&event=[[event_type]]&lead_id=[[lead_id]]
                </code>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold">Supported placeholder syntaxes</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[["[[param]]", "Recommended"], ["{param}", "Alternative"], ["%param%", "Alternative"], ["[param]", "Alternative"]].map(([s, note]) => (
                  <div key={s} className="glass rounded-lg px-3 py-2 border border-white/7">
                    <code className="text-[#00d4ff] text-xs font-mono block">{s}</code>
                    <span className="text-[#334155] text-[10px]">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 glass rounded-xl border border-white/7 overflow-hidden">
              <div className="px-4 py-2.5 bg-white/3 border-b border-white/7">
                <p className="text-xs text-[#475569] uppercase tracking-widest font-semibold">Available postback parameters</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Parameter</th>
                    <th className="text-left px-4 py-2 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["click_id",   "Your original click ID — use this to match to your traffic"],
                    ["lead_id",    "Affinitrax lead UUID"],
                    ["event_type", "ftd | deposit | conversion | chargeback"],
                    ["payout",     "Agreed payout amount for this event"],
                    ["geo",        "Lead country code (DE, GB, etc.)"],
                    ["sub1",       "Your original sub1 parameter"],
                    ["sub2",       "Your original sub2 parameter"],
                    ["sub3",       "Your original sub3 parameter"],
                  ].map(([p, d], i, a) => (
                    <tr key={p} className={i < a.length - 1 ? "border-b border-white/5" : ""}>
                      <td className="px-4 py-2.5"><code className="text-[#00d4ff] font-mono">{p}</code></td>
                      <td className="px-4 py-2.5 text-[#94a3b8]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Field reference */}
          <Section id="fields" title="Field reference">
            <p className="text-[#94a3b8] text-sm">
              All fields sent in the JSON body of <code className="text-[#00d4ff] font-mono text-xs">POST /api/v1/leads</code>.
            </p>
            <div className="glass rounded-xl border border-white/7 overflow-hidden mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Field</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Type</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Required</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map((f, i) => (
                    <tr key={f.name} className={i < FIELDS.length - 1 ? "border-b border-white/5" : ""}>
                      <td className="px-4 py-2.5"><code className="text-[#00d4ff] font-mono">{f.name}</code></td>
                      <td className="px-4 py-2.5 text-[#475569] font-mono">{f.type}</td>
                      <td className="px-4 py-2.5">
                        {f.required
                          ? <Tag color="amber">required</Tag>
                          : <span className="text-[#334155] text-[10px]">optional</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[#94a3b8]">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Lead statuses */}
          <Section id="statuses" title="Lead statuses">
            <div className="glass rounded-xl border border-white/7 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Status</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUSES.map((s, i) => (
                    <tr key={s.s} className={i < STATUSES.length - 1 ? "border-b border-white/5" : ""}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
                          {s.s}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8]">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Errors */}
          <Section id="errors" title="Error codes">
            <div className="glass rounded-xl border border-white/7 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">HTTP Status</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Meaning</th>
                    <th className="text-left px-4 py-2.5 text-[#334155] font-semibold uppercase tracking-widest text-[10px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "Validation error — missing or invalid field", "Fix the request body and retry"],
                    ["401", "Missing or invalid API key", "Check your X-API-Key header"],
                    ["403", "API key revoked or deal inactive", "Contact your account manager"],
                    ["404", "Lead not found (status check)", "Verify the lead ID"],
                    ["429", "Rate limit exceeded (200 req/min)", "Back off and retry after 1 minute"],
                    ["500", "Server error", "Retry with back-off; contact support if persistent"],
                  ].map(([code, meaning, action], i, a) => (
                    <tr key={code} className={i < a.length - 1 ? "border-b border-white/5" : ""}>
                      <td className="px-4 py-2.5">
                        <code className={`font-mono font-bold ${code.startsWith("4") || code.startsWith("5") ? "text-red-400" : "text-green-400"}`}>{code}</code>
                      </td>
                      <td className="px-4 py-2.5 text-[#94a3b8]">{meaning}</td>
                      <td className="px-4 py-2.5 text-[#475569]">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Code examples */}
          <Section id="examples" title="Code examples">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-[#94a3b8] mb-1">JavaScript / Node.js</p>
                <CodeBlock label="fetch example" code={JS_EXAMPLE} />
              </div>
              <div>
                <p className="text-sm text-[#94a3b8] mb-1">PHP</p>
                <CodeBlock label="cURL (PHP)" code={PHP_EXAMPLE} />
              </div>
            </div>
          </Section>

          {/* Support footer */}
          <div className="glass rounded-2xl p-6 border border-white/7 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white font-semibold text-sm">Need help with your integration?</p>
              <p className="text-[#475569] text-xs mt-0.5">Your account manager is available on Telegram.</p>
            </div>
            <a
              href="https://t.me/Jochem_top"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z"/>
              </svg>
              Contact support
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
