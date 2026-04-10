"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type Integration = {
  id: string;
  deal_id: string;
  name: string;
  endpoint_url: string;
  auth_type: string;
  auth_header_name: string;
  content_type: string;
  response_lead_id_path: string;
  response_redirect_url_path: string | null;
  ip_whitelist_required: boolean;
  allowed_ips: string[] | null;
  notes: string | null;
  status: "active" | "inactive" | "testing";
  mappings: FieldMapping[];
  allowed_geos: string[] | null;
  priority: number;
  daily_cap: number | null;
  relay_mode: "instant" | "throttled";
  throttle_rate: number;
};

type FieldMapping = {
  id?: string;
  affinitrax_field: string;
  buyer_field: string;
  required: boolean;
  default_value: string | null;
  transform: string;
  sort_order: number;
};

type ApiKey = {
  id: string;
  deal_id: string;
  label: string;
  key_prefix: string;
  status: "active" | "revoked";
  last_used_at: string | null;
  created_at: string;
};

type QueueLead = {
  id: string; email: string; country: string | null; status: string;
  buyer_lead_id: string | null; relay_error: string | null;
  relayed_at: string | null; created_at: string;
};

type QueueStatus = {
  queued: number; relayed_today: number; failed_today: number;
  daily_cap: number | null; throttle_rate: number; relay_mode: string;
  status: string; last_relayed_at: string | null;
  next_lead_in_seconds: number | null; recent: QueueLead[];
};

const AFFINITRAX_FIELDS = [
  "email", "first_name", "last_name", "phone", "country",
  "ip", "click_id", "sub1", "sub2", "sub3",
];
const TRANSFORMS = ["none", "uppercase", "lowercase", "e164_phone", "strip_plus"];
const TABS = ["Overview", "Config", "Mappings", "Keys"] as const;
type Tab = typeof TABS[number];

// ── Small helpers ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color = status === "active" ? "bg-green-400" : status === "testing" ? "bg-amber-400" : "bg-[#334155]";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:   "bg-green-500/15 text-green-400 border border-green-500/30",
    testing:  "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    inactive: "bg-[#1e293b] text-[#475569] border border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? ""}`}>
      <StatusDot status={status} />
      {status}
    </span>
  );
}

function Input({ label, value, onChange, mono = false, span2 = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  mono?: boolean; span2?: boolean; placeholder?: string;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
      <label className="block text-xs text-[#64748b] mb-1.5 font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full
          focus:outline-none focus:border-[#00d4ff]/40 focus:bg-[#0d1117] transition-colors
          placeholder:text-[#334155] ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-[#64748b] mb-1.5 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full
          focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0d1117] border border-white/8 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">{children}</h3>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  // Form state (Config tab)
  const [form, setForm] = useState<Partial<Integration & { auth_credential?: string }>>({});
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // API key state
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Overview actions
  const [parkedCount, setParkedCount] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [testRelaying, setTestRelaying] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean; buyer_lead_id: string | null;
    relay_error: string | null; lead_country: string | null; lead_ip: string | null;
  } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const intData: Integration = await fetch(`/api/admin/integrations/${id}`).then((r) => r.json());
      if (!intData.id) { router.push("/portal/admin/integrations"); return; }
      setIntegration(intData);
      setForm({
        name: intData.name,
        endpoint_url: intData.endpoint_url,
        auth_type: intData.auth_type,
        auth_header_name: intData.auth_header_name,
        content_type: intData.content_type,
        response_lead_id_path: intData.response_lead_id_path,
        response_redirect_url_path: intData.response_redirect_url_path ?? "",
        ip_whitelist_required: intData.ip_whitelist_required,
        allowed_ips: intData.allowed_ips ?? null,
        notes: intData.notes ?? "",
        status: intData.status,
        allowed_geos: intData.allowed_geos ?? null,
        priority: intData.priority ?? 10,
        daily_cap: intData.daily_cap ?? null,
        relay_mode: intData.relay_mode ?? "instant",
        throttle_rate: intData.throttle_rate ?? 20,
      });
      setMappings(intData.mappings ?? []);

      const keysData: ApiKey[] = await fetch(`/api/admin/api-keys?deal_id=${intData.deal_id}`).then((r) => r.json());
      setApiKeys(Array.isArray(keysData) ? keysData : []);

      const parkedRes = await fetch(`/api/admin/leads?deal_id=${intData.deal_id}&status=parked&limit=1`).then((r) => r.json());
      setParkedCount(typeof parkedRes.total === "number" ? parkedRes.total : 0);
      setLoading(false);
    }
    load();

    async function refreshQueue() {
      const res = await fetch(`/api/admin/integrations/${id}/queue-status`);
      if (res.ok) setQueueStatus(await res.json());
    }
    refreshQueue();
    queuePollRef.current = setInterval(refreshQueue, 30_000);
    return () => { if (queuePollRef.current) clearInterval(queuePollRef.current); };
  }, [id, router]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  function setF(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveIntegration() {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "Saved." });
      setIntegration((prev) => prev ? { ...prev, ...(form as Partial<Integration>) } : prev);
    } else {
      const d = await res.json();
      setMsg({ type: "err", text: d.error ?? "Save failed" });
    }
    setSaving(false);
  }

  async function saveMappings() {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/mappings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappings.map((m, i) => ({ ...m, sort_order: i }))),
    });
    if (res.ok) setMsg({ type: "ok", text: "Mappings saved." });
    else { const d = await res.json(); setMsg({ type: "err", text: d.error ?? "Save failed" }); }
    setSaving(false);
  }

  async function toggleStatus() {
    if (!integration) return;
    setTogglingStatus(true);
    const next = integration.status === "active" ? "testing" : "active";
    const res = await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setIntegration((prev) => prev ? { ...prev, status: next } : prev);
      setForm((f) => ({ ...f, status: next }));
    }
    setTogglingStatus(false);
  }

  async function testRelay() {
    setTestRelaying(true); setTestResult(null); setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/test-relay`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTestResult(data);
      setMsg(data.success
        ? { type: "ok", text: `Accepted ✓  buyer_lead_id: ${data.buyer_lead_id ?? "—"}  ·  ${data.lead_country}  ·  IP ${data.lead_ip}` }
        : { type: "err", text: `Rejected: ${data.relay_error ?? "unknown error"}` }
      );
    } else {
      setMsg({ type: "err", text: data.error ?? "Test relay failed" });
    }
    setTestRelaying(false);
  }

  async function replayParked() {
    setReplaying(true); setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/replay`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setMsg({ type: "ok", text: data.message ?? `Queued ${data.queued} leads.` });
    else setMsg({ type: "err", text: data.error ?? "Replay failed" });
    setReplaying(false);
  }

  async function generateKey() {
    if (!integration) return;
    setGeneratingKey(true); setNewKeyResult(null);
    const res = await fetch("/api/admin/api-keys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: integration.deal_id, label: newKeyLabel || "Default" }),
    });
    const data = await res.json();
    if (res.ok) { setNewKeyResult(data.full_key); setApiKeys((prev) => [data, ...prev]); setNewKeyLabel(""); }
    else setMsg({ type: "err", text: data.error ?? "Failed to generate key" });
    setGeneratingKey(false);
  }

  async function revokeKey(keyId: string) {
    await fetch(`/api/admin/api-keys/${keyId}`, { method: "DELETE" });
    setApiKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, status: "revoked" as const } : k));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-[#475569] text-sm animate-pulse">Loading integration…</p>
        </div>
      </main>
    );
  }

  if (!integration) return null;

  const isActive = integration.status === "active";

  return (
    <main className="flex-1 p-8 max-w-4xl space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => router.push("/portal/admin/integrations")}
          className="text-[#334155] text-xs hover:text-[#94a3b8] transition-colors mb-3 flex items-center gap-1"
        >
          ← Integrations
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">{integration.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <StatusBadge status={integration.status} />
              <span className="text-[#334155] font-mono text-xs">deal: {integration.deal_id.slice(0, 8)}</span>
              {integration.relay_mode === "throttled" && (
                <span className="text-[#334155] text-xs">🕐 {integration.throttle_rate}/hr</span>
              )}
              {integration.daily_cap && (
                <span className="text-[#334155] text-xs">cap: {integration.daily_cap}/day</span>
              )}
            </div>
          </div>

          {/* Status toggle */}
          <button
            onClick={toggleStatus}
            disabled={togglingStatus}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40 flex items-center gap-2 ${
              isActive
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20"
            }`}
          >
            {togglingStatus ? "…" : isActive ? "⏸  Pause relay" : "▶  Resume relay"}
          </button>
        </div>
      </div>

      {/* ── Toast message ───────────────────────────────────────────────────── */}
      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm flex items-start justify-between gap-3 ${
          msg.type === "ok"
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-current opacity-50 hover:opacity-100 shrink-0">✕</button>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#0d1117] border border-white/8 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white/8 text-white"
                : "text-[#475569] hover:text-[#94a3b8]"
            }`}
          >
            {tab}
            {tab === "Overview" && queueStatus && queueStatus.queued > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400">
                {queueStatus.queued}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Overview" && (
        <div className="space-y-5">

          {/* Queue stats */}
          {queueStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Queued",         value: queueStatus.queued,         color: "text-amber-400" },
                { label: "Relayed today",  value: `${queueStatus.relayed_today}${queueStatus.daily_cap ? ` / ${queueStatus.daily_cap}` : ""}`, color: "text-green-400" },
                { label: "Failed today",   value: queueStatus.failed_today,   color: queueStatus.failed_today > 0 ? "text-red-400" : "text-[#475569]" },
                { label: "Next lead",      value: queueStatus.relay_mode === "throttled" && queueStatus.queued > 0
                    ? queueStatus.next_lead_in_seconds !== null
                      ? queueStatus.next_lead_in_seconds <= 60
                        ? `~${queueStatus.next_lead_in_seconds}s`
                        : `~${Math.ceil(queueStatus.next_lead_in_seconds / 60)}m`
                      : "—"
                    : queueStatus.queued === 0 ? "Empty" : "Instant",
                  color: "text-white" },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <p className="text-[#475569] text-xs mb-1.5">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Parked leads action */}
          {parkedCount !== null && parkedCount > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-amber-400 font-semibold text-sm">{parkedCount} parked leads waiting</p>
                  <p className="text-amber-400/60 text-xs mt-0.5">Arrived before this integration was active.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={testRelay}
                    disabled={testRelaying}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/15 hover:border-white/30 transition-colors disabled:opacity-40 bg-white/5"
                  >
                    {testRelaying ? "Testing…" : "Send 1 test"}
                  </button>
                  <button
                    onClick={replayParked}
                    disabled={replaying || integration.status !== "active"}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-colors"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  >
                    {replaying ? "Queuing…" : `Replay all ${parkedCount}`}
                  </button>
                </div>
              </div>
              {testResult && (
                <div className={`mt-3 text-xs font-mono px-3 py-2 rounded-lg ${
                  testResult.success
                    ? "bg-green-500/10 text-green-400 border border-green-500/15"
                    : "bg-red-500/10 text-red-400 border border-red-500/15"
                }`}>
                  {testResult.success
                    ? `✓ Accepted  ·  buyer_lead_id: ${testResult.buyer_lead_id ?? "—"}  ·  geo: ${testResult.lead_country}  ·  ip: ${testResult.lead_ip}`
                    : `✗ Rejected  ·  ${testResult.relay_error}`}
                </div>
              )}
            </Card>
          )}

          {/* Recent activity feed */}
          {queueStatus && queueStatus.recent.length > 0 && (
            <div>
              <SectionTitle>Recent activity</SectionTitle>
              <div className="space-y-1">
                {queueStatus.recent.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#0d1117] border border-white/5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${
                        lead.status === "relayed"  ? "bg-green-400" :
                        lead.status === "failed"   ? "bg-red-400"   :
                        lead.status === "queued"   ? "bg-amber-400" : "bg-blue-400"
                      }`} />
                      <span className="text-[#94a3b8] font-mono truncate">{lead.email}</span>
                      {lead.country && <span className="text-[#334155] shrink-0 font-mono">{lead.country}</span>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      {lead.buyer_lead_id && (
                        <span className="text-green-400 font-mono">#{lead.buyer_lead_id.slice(0, 12)}</span>
                      )}
                      {lead.relay_error && (
                        <span className="text-red-400 max-w-[180px] truncate">{lead.relay_error}</span>
                      )}
                      <span className="text-[#334155] font-mono w-16 text-right">
                        {lead.relayed_at
                          ? new Date(lead.relayed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : lead.status === "queued" ? "waiting" : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#1e293b] text-xs mt-2 text-right">auto-refreshes every 30s</p>
            </div>
          )}

          {/* Empty state */}
          {(!queueStatus || queueStatus.recent.length === 0) && parkedCount === 0 && (
            <Card className="text-center py-10">
              <p className="text-[#334155] text-sm">No activity yet — leads will appear here once the integration goes active.</p>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CONFIG
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Config" && (
        <div className="space-y-5">

          {/* Endpoint & Auth */}
          <Card>
            <SectionTitle>Endpoint & Authentication</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Integration name" value={(form.name as string) ?? ""} onChange={(v) => setF("name", v)} span2 />
              <Input label="Endpoint URL" value={(form.endpoint_url as string) ?? ""} onChange={(v) => setF("endpoint_url", v)} mono span2 />
              <Select label="Auth type" value={(form.auth_type as string) ?? "header_key"} onChange={(v) => setF("auth_type", v)}
                options={[
                  { value: "header_key",   label: "Header key" },
                  { value: "bearer",       label: "Bearer token" },
                  { value: "basic",        label: "Basic auth" },
                  { value: "query_param",  label: "Query param" },
                  { value: "multi_header", label: "Multi-header (JSON)" },
                ]}
              />
              <Input label="Auth header / param name" value={(form.auth_header_name as string) ?? ""} onChange={(v) => setF("auth_header_name", v)} mono />
              <div className="md:col-span-2">
                <label className="block text-xs text-[#64748b] mb-1.5 font-medium">New credential <span className="text-[#334155] font-normal">(leave blank to keep existing)</span></label>
                <input
                  type="password"
                  placeholder="Paste new credential to update…"
                  onChange={(e) => setF("auth_credential", e.target.value)}
                  className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full font-mono
                    focus:outline-none focus:border-[#00d4ff]/40 transition-colors placeholder:text-[#334155]"
                />
              </div>
            </div>
          </Card>

          {/* Response parsing */}
          <Card>
            <SectionTitle>Response Parsing</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Content type" value={(form.content_type as string) ?? "json"} onChange={(v) => setF("content_type", v)}
                options={[{ value: "json", label: "JSON" }, { value: "form_urlencoded", label: "Form URL-encoded" }]}
              />
              <Input label="Lead ID path" value={(form.response_lead_id_path as string) ?? ""} onChange={(v) => setF("response_lead_id_path", v)} mono
                placeholder="e.g. id  or  details.leadRequest.ID" />
              <Input label="Redirect URL path (optional)" value={(form.response_redirect_url_path as string) ?? ""} onChange={(v) => setF("response_redirect_url_path", v)} mono span2
                placeholder="e.g. autologin" />
            </div>
          </Card>

          {/* Relay settings */}
          <Card>
            <SectionTitle>Relay Settings</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Status" value={(form.status as string) ?? "testing"} onChange={(v) => setF("status", v)}
                options={[
                  { value: "active",   label: "Active — relay live leads" },
                  { value: "testing",  label: "Testing — paused" },
                  { value: "inactive", label: "Inactive — disabled" },
                ]}
              />
              <Select label="Relay mode" value={(form.relay_mode as string) ?? "instant"} onChange={(v) => setF("relay_mode", v)}
                options={[{ value: "instant", label: "⚡ Instant" }, { value: "throttled", label: "🕐 Throttled" }]}
              />
              {(form.relay_mode === "throttled") && (
                <div>
                  <label className="block text-xs text-[#64748b] mb-1.5 font-medium">Throttle rate <span className="text-[#334155] font-normal">(leads/hour)</span></label>
                  <input type="number" min={1} max={3600}
                    value={(form.throttle_rate as number) ?? 20}
                    onChange={(e) => setF("throttle_rate", parseInt(e.target.value) || 20)}
                    className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                  />
                  <p className="text-[#334155] text-xs mt-1">
                    {(form.throttle_rate as number) ? `≈ 1 lead every ${Math.round(3600 / (form.throttle_rate as number))}s` : ""}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs text-[#64748b] mb-1.5 font-medium">Daily cap <span className="text-[#334155] font-normal">(leave blank for unlimited)</span></label>
                <input type="number" min={1}
                  value={(form.daily_cap as number) ?? ""}
                  onChange={(e) => setF("daily_cap", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g. 100"
                  className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 placeholder:text-[#334155]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748b] mb-1.5 font-medium">Allowed geos <span className="text-[#334155] font-normal">(comma-separated ISO-2, blank = all)</span></label>
                <input
                  value={(form.allowed_geos as string[])?.join(", ") ?? ""}
                  onChange={(e) => setF("allowed_geos", e.target.value ? e.target.value.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean) : null)}
                  placeholder="e.g. DE, IT, CH"
                  className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full font-mono focus:outline-none focus:border-[#00d4ff]/40 placeholder:text-[#334155]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748b] mb-1.5 font-medium">Priority <span className="text-[#334155] font-normal">(lower = picked first)</span></label>
                <input type="number"
                  value={(form.priority as number) ?? 10}
                  onChange={(e) => setF("priority", parseInt(e.target.value) || 10)}
                  className="bg-[#0d1117] border border-white/8 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                />
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <SectionTitle>Notes</SectionTitle>
            <textarea
              rows={3}
              value={(form.notes as string) ?? ""}
              onChange={(e) => setF("notes", e.target.value)}
              placeholder="Deal terms, agreed rates, contact info…"
              className="bg-[#080c14] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-[#94a3b8] w-full
                focus:outline-none focus:border-[#00d4ff]/40 resize-none placeholder:text-[#1e293b]"
            />
          </Card>

          <button
            onClick={saveIntegration}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ background: "linear-gradient(135deg, #00d4ff22, #7c3aed22)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            {saving ? "Saving…" : "Save integration"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MAPPINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Mappings" && (
        <div className="space-y-4">
          <p className="text-[#475569] text-xs">
            Maps Affinitrax lead fields → buyer CRM field names. Static values use <span className="font-mono text-[#64748b]">default_value</span> with any affinitrax field name that won&apos;t exist on the lead.
          </p>

          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold text-[#334155] uppercase tracking-wide">
            <div className="col-span-3">Affinitrax field</div>
            <div className="col-span-2">Buyer field</div>
            <div className="col-span-2">Transform</div>
            <div className="col-span-2">Default value</div>
            <div className="col-span-1 text-center">Req</div>
            <div className="col-span-2" />
          </div>

          {mappings.map((m, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2.5">
              <div className="col-span-3">
                <select value={m.affinitrax_field} onChange={(e) => {
                  setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, affinitrax_field: e.target.value } : x));
                }} className="bg-transparent text-sm text-[#94a3b8] w-full focus:outline-none font-mono">
                  {AFFINITRAX_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  {!AFFINITRAX_FIELDS.includes(m.affinitrax_field) && (
                    <option value={m.affinitrax_field}>{m.affinitrax_field}</option>
                  )}
                </select>
              </div>
              <div className="col-span-2">
                <input value={m.buyer_field} onChange={(e) => {
                  setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, buyer_field: e.target.value } : x));
                }} className="bg-transparent text-sm text-white font-mono w-full focus:outline-none border-b border-white/10 focus:border-[#00d4ff]/40 pb-0.5" />
              </div>
              <div className="col-span-2">
                <select value={m.transform} onChange={(e) => {
                  setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, transform: e.target.value } : x));
                }} className="bg-transparent text-xs text-[#64748b] w-full focus:outline-none">
                  {TRANSFORMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input value={m.default_value ?? ""} placeholder="—"
                  onChange={(e) => {
                    setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, default_value: e.target.value || null } : x));
                  }}
                  className="bg-transparent text-sm text-[#64748b] font-mono w-full focus:outline-none border-b border-white/10 focus:border-[#00d4ff]/40 pb-0.5 placeholder:text-[#1e293b]"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input type="checkbox" checked={m.required}
                  onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, required: e.target.checked } : x))}
                  className="accent-[#00d4ff] w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[#334155] hover:text-red-400 transition-colors text-xs px-2 py-1">
                  remove
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setMappings((prev) => [...prev, { affinitrax_field: "email", buyer_field: "", required: false, default_value: null, transform: "none", sort_order: prev.length }])}
            className="w-full py-2.5 rounded-lg text-xs font-medium text-[#475569] border border-dashed border-white/10 hover:border-white/20 hover:text-[#94a3b8] transition-colors"
          >
            + Add mapping
          </button>

          <button onClick={saveMappings} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #00d4ff22, #7c3aed22)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            {saving ? "Saving…" : "Save mappings"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: KEYS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "Keys" && (
        <div className="space-y-5">
          <p className="text-[#475569] text-xs">
            API keys authenticate sellers submitting leads to <span className="font-mono text-[#64748b]">POST /api/v1/leads</span> for this deal.
          </p>

          {/* Generate new key */}
          <Card>
            <SectionTitle>Generate new key</SectionTitle>
            <div className="flex gap-3">
              <input
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="Label (e.g. seller name)"
                className="bg-[#080c14] border border-white/8 rounded-lg px-3 py-2 text-sm text-white flex-1
                  focus:outline-none focus:border-[#00d4ff]/40 placeholder:text-[#334155]"
              />
              <button onClick={generateKey} disabled={generatingKey}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/15 hover:border-white/30 transition-colors disabled:opacity-40 shrink-0">
                {generatingKey ? "Generating…" : "Generate"}
              </button>
            </div>
            {newKeyResult && (
              <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1 font-medium">Copy now — shown once only</p>
                <p className="font-mono text-xs text-green-300 break-all">{newKeyResult}</p>
              </div>
            )}
          </Card>

          {/* Keys list */}
          <div className="space-y-2">
            {apiKeys.length === 0 && (
              <Card className="text-center py-8">
                <p className="text-[#334155] text-sm">No API keys yet.</p>
              </Card>
            )}
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-white/5 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${k.status === "active" ? "bg-green-400" : "bg-[#334155]"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium">{k.label}</p>
                    <p className="text-xs text-[#334155] font-mono">{k.key_prefix}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-[#334155]">
                    {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                  </span>
                  {k.status === "active" && (
                    <button onClick={() => revokeKey(k.id)}
                      className="text-xs text-[#475569] hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-500/20">
                      Revoke
                    </button>
                  )}
                  {k.status === "revoked" && (
                    <span className="text-xs text-[#334155] px-2 py-1">Revoked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
