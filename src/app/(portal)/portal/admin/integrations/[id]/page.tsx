"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

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

const AFFINITRAX_FIELDS = [
  "email", "first_name", "last_name", "phone", "country",
  "ip", "click_id", "sub1", "sub2", "sub3",
];

const TRANSFORMS = ["none", "uppercase", "lowercase", "e164_phone", "strip_plus"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/15 text-green-400 border border-green-500/30",
    testing: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    inactive: "bg-[#1e293b] text-[#475569] border border-white/10",
    revoked: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Edit state
  const [form, setForm] = useState<Partial<Integration & { auth_credential?: string }>>({});
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  // New API key state
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [parkedCount, setParkedCount] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [testRelaying, setTestRelaying] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; buyer_lead_id: string | null; relay_error: string | null; lead_country: string | null; lead_ip: string | null } | null>(null);

  // Queue status (throttled relay live feed)
  type QueueLead = { id: string; email: string; country: string | null; status: string; buyer_lead_id: string | null; relay_error: string | null; relayed_at: string | null; created_at: string };
  type QueueStatus = { queued: number; relayed_today: number; failed_today: number; daily_cap: number | null; throttle_rate: number; relay_mode: string; status: string; last_relayed_at: string | null; next_lead_in_seconds: number | null; recent: QueueLead[] };
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Count parked leads for this deal
      const parkedRes = await fetch(`/api/admin/leads?deal_id=${intData.deal_id}&status=parked&limit=1`).then((r) => r.json());
      setParkedCount(typeof parkedRes.total === "number" ? parkedRes.total : 0);

      setLoading(false);
    }
    load();

    // Poll queue status every 30s
    async function refreshQueue() {
      const res = await fetch(`/api/admin/integrations/${id}/queue-status`);
      if (res.ok) setQueueStatus(await res.json());
    }
    refreshQueue();
    queuePollRef.current = setInterval(refreshQueue, 30_000);
    return () => { if (queuePollRef.current) clearInterval(queuePollRef.current); };
  }, [id, router]);

  async function saveIntegration() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "Integration saved." });
    } else {
      const d = await res.json();
      setMsg({ type: "err", text: d.error ?? "Save failed" });
    }
    setSaving(false);
  }

  async function saveMappings() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/mappings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappings.map((m, i) => ({ ...m, sort_order: i }))),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: "Field mappings saved." });
    } else {
      const d = await res.json();
      setMsg({ type: "err", text: d.error ?? "Save failed" });
    }
    setSaving(false);
  }

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { affinitrax_field: "email", buyer_field: "", required: false, default_value: null, transform: "none", sort_order: prev.length },
    ]);
  }

  function removeMapping(idx: number) {
    setMappings((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMapping(idx: number, key: keyof FieldMapping, value: string | boolean | null) {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  }

  async function generateKey() {
    if (!integration) return;
    setGeneratingKey(true);
    setNewKeyResult(null);
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: integration.deal_id, label: newKeyLabel || "Default" }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKeyResult(data.full_key);
      setApiKeys((prev) => [data, ...prev]);
      setNewKeyLabel("");
    } else {
      setMsg({ type: "err", text: data.error ?? "Failed to generate key" });
    }
    setGeneratingKey(false);
  }

  async function revokeKey(keyId: string) {
    await fetch(`/api/admin/api-keys/${keyId}`, { method: "DELETE" });
    setApiKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, status: "revoked" as const } : k));
  }

  async function testRelay() {
    setTestRelaying(true);
    setTestResult(null);
    setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/test-relay`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTestResult(data);
      if (data.success) {
        setMsg({ type: "ok", text: `Test lead accepted ✓ buyer_lead_id: ${data.buyer_lead_id ?? "—"} (${data.lead_country}, IP: ${data.lead_ip})` });
      } else {
        setMsg({ type: "err", text: `Test lead rejected: ${data.relay_error ?? "unknown error"}` });
      }
    } else {
      setMsg({ type: "err", text: data.error ?? "Test relay failed" });
    }
    setTestRelaying(false);
  }

  async function replayParked() {
    setReplaying(true);
    setMsg(null);
    const res = await fetch(`/api/admin/integrations/${id}/replay`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: `Replay complete — ${data.replayed} relayed, ${data.failed} failed` });
      setParkedCount(data.failed);
    } else {
      setMsg({ type: "err", text: data.error ?? "Replay failed" });
    }
    setReplaying(false);
  }

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="glass rounded-2xl p-10 text-center border border-white/5">
          <p className="text-[#475569] text-sm">Loading…</p>
        </div>
      </main>
    );
  }

  if (!integration) return null;

  return (
    <main className="flex-1 p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/portal/admin/integrations")}
            className="text-[#475569] text-xs hover:text-[#94a3b8] transition-colors mb-2 flex items-center gap-1"
          >
            ← Back to Integrations
          </button>
          <h1 className="text-2xl font-bold text-white font-display">{integration.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={integration.status} />
            <span className="text-[#334155] font-mono text-xs">deal: {integration.deal_id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
          {msg.text}
        </div>
      )}

      {/* ── Parked leads banner ────────────────────────────────────────────── */}
      {parkedCount !== null && parkedCount > 0 && (
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-400 font-semibold text-sm">
                {parkedCount} parked lead{parkedCount !== 1 ? "s" : ""} waiting
              </p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                These leads arrived before the buyer integration was active. Test first, then replay all.
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={testRelay}
                disabled={testRelaying}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap bg-[#13131f] border border-white/20 hover:border-[#00d4ff]/40 transition-colors"
              >
                {testRelaying ? "Testing…" : "Send 1 Test Lead"}
              </button>
              <button
                onClick={replayParked}
                disabled={replaying || integration?.status !== "active"}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                {replaying ? "Replaying…" : `Replay All ${parkedCount}`}
              </button>
            </div>
          </div>
          {testResult && (
            <div className={`text-xs font-mono px-3 py-2 rounded-lg ${testResult.success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {testResult.success
                ? `✓ Accepted — buyer_lead_id: ${testResult.buyer_lead_id ?? "—"} | geo: ${testResult.lead_country} | ip: ${testResult.lead_ip}`
                : `✗ Rejected — ${testResult.relay_error}`}
            </div>
          )}
        </div>
      )}

      {/* ── Queue Status ──────────────────────────────────────────────────── */}
      {queueStatus && (queueStatus.queued > 0 || queueStatus.relayed_today > 0 || queueStatus.recent.length > 0) && (
        <section className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Queue Status</h2>
            <span className="text-[#475569] text-xs">auto-refreshes every 30s</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#13131f] rounded-xl p-3 border border-white/5">
              <p className="text-[#475569] text-xs mb-1">Queued</p>
              <p className="text-white text-xl font-bold">{queueStatus.queued}</p>
            </div>
            <div className="bg-[#13131f] rounded-xl p-3 border border-white/5">
              <p className="text-[#475569] text-xs mb-1">Relayed today</p>
              <p className="text-green-400 text-xl font-bold">
                {queueStatus.relayed_today}
                {queueStatus.daily_cap !== null && (
                  <span className="text-[#475569] text-sm font-normal"> / {queueStatus.daily_cap}</span>
                )}
              </p>
            </div>
            <div className="bg-[#13131f] rounded-xl p-3 border border-white/5">
              <p className="text-[#475569] text-xs mb-1">Failed today</p>
              <p className={`text-xl font-bold ${queueStatus.failed_today > 0 ? "text-red-400" : "text-[#475569]"}`}>
                {queueStatus.failed_today}
              </p>
            </div>
            <div className="bg-[#13131f] rounded-xl p-3 border border-white/5">
              <p className="text-[#475569] text-xs mb-1">Next lead</p>
              <p className="text-white text-sm font-semibold">
                {queueStatus.relay_mode === "throttled" && queueStatus.queued > 0
                  ? queueStatus.next_lead_in_seconds !== null && queueStatus.next_lead_in_seconds <= 60
                    ? `~${queueStatus.next_lead_in_seconds}s`
                    : queueStatus.next_lead_in_seconds !== null
                    ? `~${Math.ceil(queueStatus.next_lead_in_seconds / 60)}m`
                    : "—"
                  : queueStatus.queued === 0 ? "Queue empty" : "Instant"}
              </p>
              {queueStatus.relay_mode === "throttled" && (
                <p className="text-[#334155] text-xs mt-0.5">{queueStatus.throttle_rate}/hr</p>
              )}
            </div>
          </div>

          {/* Recent leads feed */}
          {queueStatus.recent.length > 0 && (
            <div>
              <p className="text-[#475569] text-xs mb-2 uppercase tracking-wide">Recent activity</p>
              <div className="space-y-1">
                {queueStatus.recent.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#13131f] border border-white/5 text-xs font-mono">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${
                        lead.status === "relayed"  ? "bg-green-400" :
                        lead.status === "failed"   ? "bg-red-400" :
                        lead.status === "queued"   ? "bg-amber-400" :
                        lead.status === "relaying" ? "bg-blue-400" : "bg-[#334155]"
                      }`} />
                      <span className="text-[#94a3b8] truncate">{lead.email}</span>
                      {lead.country && <span className="text-[#334155] shrink-0">{lead.country}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {lead.buyer_lead_id && (
                        <span className="text-green-400/70">#{lead.buyer_lead_id.slice(0, 12)}</span>
                      )}
                      {lead.relay_error && (
                        <span className="text-red-400/70 max-w-[160px] truncate">{lead.relay_error}</span>
                      )}
                      <span className="text-[#334155]">
                        {lead.relayed_at
                          ? new Date(lead.relayed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : lead.status === "queued" ? "waiting" : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Integration Config ─────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 border border-white/5">
        <h2 className="text-white font-semibold mb-5">Buyer CRM Config</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Name", key: "name" },
            { label: "Endpoint URL", key: "endpoint_url" },
            { label: "Auth Header Name", key: "auth_header_name" },
            { label: "Response Lead ID Path", key: "response_lead_id_path" },
            { label: "Redirect URL Path (optional)", key: "response_redirect_url_path" },
          ].map(({ label, key }) => (
            <div key={key} className={key === "endpoint_url" ? "md:col-span-2" : ""}>
              <label className="block text-xs text-[#94a3b8] mb-1.5">{label}</label>
              <input
                value={(form as Record<string, string>)[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Auth Type</label>
            <select
              value={form.auth_type ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value }))}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            >
              {["header_key", "bearer", "basic", "query_param"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Content Type</label>
            <select
              value={form.content_type ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="json">JSON</option>
              <option value="form_urlencoded">Form URL-encoded</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Status</label>
            <select
              value={form.status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" | "testing" }))}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="testing">Testing</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">New Credential (leave blank to keep existing)</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={form.auth_credential ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, auth_credential: e.target.value }))}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-[#94a3b8] mb-1.5">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 resize-none"
            />
          </div>

          {/* ── Buyer IP Whitelist ──────────────────────────────────────────── */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#94a3b8]">
                Buyer IP Whitelist
                <span className="ml-2 text-[#334155]">— only these IPs can fire postbacks for this deal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-[#475569]">Enforce</span>
                <div
                  onClick={() => setForm((f) => ({ ...f, ip_whitelist_required: !f.ip_whitelist_required }))}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${form.ip_whitelist_required ? "bg-[#00d4ff]/80" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.ip_whitelist_required ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </label>
            </div>
            <textarea
              value={(form.allowed_ips ?? []).join("\n")}
              onChange={(e) => {
                const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
                setForm((f) => ({ ...f, allowed_ips: lines.length > 0 ? lines : null }));
              }}
              rows={3}
              placeholder={"One IP per line, e.g.\n185.220.101.47\n194.165.16.11"}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 resize-none font-mono placeholder:text-[#334155]"
            />
            {form.ip_whitelist_required && (!form.allowed_ips || form.allowed_ips.length === 0) && (
              <p className="text-amber-400 text-xs mt-1">⚠ Enforcement is on but no IPs are listed — all postbacks will be blocked.</p>
            )}
          </div>

          {/* ── Geo Routing ─────────────────────────────────────────────────── */}
          <div className="md:col-span-2 pt-2 border-t border-white/5">
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">Geo Routing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#94a3b8] mb-1.5">Allowed GEOs</label>
                {form.allowed_geos && form.allowed_geos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {form.allowed_geos.map((geo) => (
                      <span key={geo} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 font-mono">
                        {geo}
                      </span>
                    ))}
                  </div>
                )}
                <input
                  placeholder="Leave empty for all geos, or enter: ES, IT, UK"
                  value={form.allowed_geos ? form.allowed_geos.join(", ") : ""}
                  onChange={(e) => {
                    const parsed = e.target.value.trim()
                      ? e.target.value.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean)
                      : null;
                    setForm((f) => ({ ...f, allowed_geos: parsed }));
                  }}
                  className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
                />
                <p className="text-[#475569] text-xs mt-1">Comma-separated ISO-2 country codes. Empty = accept all geos.</p>
              </div>
              <div>
                <label className="block text-xs text-[#94a3b8] mb-1.5">Priority</label>
                <input
                  type="number"
                  value={form.priority ?? 10}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 10 }))}
                  className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                />
                <p className="text-[#475569] text-xs mt-1">Lower number = higher priority when multiple integrations match a geo.</p>
              </div>
              <div>
                <label className="block text-xs text-[#94a3b8] mb-1.5">Daily Cap (leads/day)</label>
                <input
                  type="number"
                  placeholder="Leave empty for no cap"
                  value={form.daily_cap ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, daily_cap: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                />
                <p className="text-[#475569] text-xs mt-1">Max leads relayed to this buyer per calendar day (UTC). Leave empty for unlimited.</p>
              </div>
              {/* Relay Mode */}
              <div className="col-span-2">
                <label className="block text-xs text-[#94a3b8] mb-2">Relay Mode</label>
                <div className="flex gap-3">
                  {(["instant", "throttled"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, relay_mode: mode }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.relay_mode === mode
                          ? mode === "instant"
                            ? "bg-[#00d4ff]/10 border-[#00d4ff]/40 text-[#00d4ff]"
                            : "bg-amber-500/10 border-amber-500/40 text-amber-400"
                          : "bg-[#13131f] border-white/10 text-[#475569] hover:border-white/20"
                      }`}
                    >
                      {mode === "instant" ? "⚡ Instant" : "🕐 Throttled"}
                    </button>
                  ))}
                </div>
                <p className="text-[#475569] text-xs mt-1.5">
                  {form.relay_mode === "instant"
                    ? "Leads are relayed to the buyer immediately as they arrive."
                    : "Leads are queued and dripped to the buyer at the configured rate to mimic live traffic."}
                </p>
              </div>
              {form.relay_mode === "throttled" && (
                <div>
                  <label className="block text-xs text-[#94a3b8] mb-1.5">Throttle Rate (leads/hour)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.throttle_rate}
                    onChange={(e) => setForm((f) => ({ ...f, throttle_rate: parseInt(e.target.value, 10) || 20 }))}
                    className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-500/40"
                  />
                  <p className="text-[#475569] text-xs mt-1">e.g. 10 = ~1 lead every 6 minutes spread across the hour.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={saveIntegration}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {saving ? "Saving…" : "Save Integration"}
          </button>
        </div>
      </section>

      {/* ── Field Mappings ─────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">Field Mappings</h2>
            <p className="text-[#475569] text-xs mt-0.5">Map Affinitrax lead fields to the buyer CRM&apos;s expected field names.</p>
          </div>
          <button
            onClick={addMapping}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
          >
            + Add field
          </button>
        </div>

        {mappings.length === 0 ? (
          <p className="text-[#334155] text-sm text-center py-4">No mappings — the raw lead payload will be sent as-is.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1 pb-1">
              <div className="col-span-3 text-[10px] text-[#334155] uppercase tracking-widest font-semibold">Affinitrax Field</div>
              <div className="col-span-3 text-[10px] text-[#334155] uppercase tracking-widest font-semibold">Buyer Field</div>
              <div className="col-span-2 text-[10px] text-[#334155] uppercase tracking-widest font-semibold">Transform</div>
              <div className="col-span-2 text-[10px] text-[#334155] uppercase tracking-widest font-semibold">Default</div>
              <div className="col-span-1 text-[10px] text-[#334155] uppercase tracking-widest font-semibold">Req</div>
              <div className="col-span-1" />
            </div>
            {mappings.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <select
                    value={m.affinitrax_field}
                    onChange={(e) => updateMapping(i, "affinitrax_field", e.target.value)}
                    className="bg-[#13131f] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                  >
                    {AFFINITRAX_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    value={m.buyer_field}
                    onChange={(e) => updateMapping(i, "buyer_field", e.target.value)}
                    placeholder="e.g. firstName"
                    className="bg-[#13131f] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={m.transform}
                    onChange={(e) => updateMapping(i, "transform", e.target.value)}
                    className="bg-[#13131f] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                  >
                    {TRANSFORMS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    value={m.default_value ?? ""}
                    onChange={(e) => updateMapping(i, "default_value", e.target.value || null)}
                    placeholder="optional"
                    className="bg-[#13131f] border border-white/10 rounded px-2 py-1.5 text-xs text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={m.required}
                    onChange={(e) => updateMapping(i, "required", e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#00d4ff]"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeMapping(i)}
                    className="text-[#475569] hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={saveMappings}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {saving ? "Saving…" : "Save Mappings"}
          </button>
        </div>
      </section>

      {/* ── API Keys ───────────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">Seller API Keys</h2>
            <p className="text-[#475569] text-xs mt-0.5">Keys issued to sellers for this deal. Each key authenticates to <code className="text-[#475569] font-mono">POST /api/v1/leads</code>.</p>
          </div>
        </div>

        {/* Generate new key */}
        <div className="flex gap-3 mb-4">
          <input
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            placeholder="Key label (e.g. Main Seller)"
            className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-[#00d4ff]/40"
          />
          <button
            onClick={generateKey}
            disabled={generatingKey}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {generatingKey ? "Generating…" : "Generate Key"}
          </button>
        </div>

        {/* Show new key once */}
        {newKeyResult && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 text-xs font-semibold mb-1.5">Save this key — it will not be shown again</p>
            <code className="text-amber-300 text-xs font-mono break-all">{newKeyResult}</code>
          </div>
        )}

        {/* Keys table */}
        {apiKeys.length === 0 ? (
          <p className="text-[#334155] text-sm text-center py-4">No API keys for this deal yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/7">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-4 py-2.5 text-[#475569] text-xs uppercase tracking-widest font-semibold">Label</th>
                  <th className="text-left px-4 py-2.5 text-[#475569] text-xs uppercase tracking-widest font-semibold">Prefix</th>
                  <th className="text-left px-4 py-2.5 text-[#475569] text-xs uppercase tracking-widest font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 text-[#475569] text-xs uppercase tracking-widest font-semibold">Last used</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k, i) => (
                  <tr key={k.id} className={`border-b border-white/5 ${i === apiKeys.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-2.5 text-white text-xs">{k.label}</td>
                    <td className="px-4 py-2.5">
                      <code className="text-[#94a3b8] text-xs font-mono">{k.key_prefix}…</code>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={k.status} />
                    </td>
                    <td className="px-4 py-2.5 text-[#475569] text-xs">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {k.status === "active" && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
