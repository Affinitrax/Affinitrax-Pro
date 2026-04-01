"use client";

import { useEffect, useState } from "react";
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
  notes: string | null;
  status: "active" | "inactive" | "testing";
  mappings: FieldMapping[];
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
        notes: intData.notes ?? "",
        status: intData.status,
      });
      setMappings(intData.mappings ?? []);

      const keysData: ApiKey[] = await fetch(`/api/admin/api-keys?deal_id=${intData.deal_id}`).then((r) => r.json());
      setApiKeys(Array.isArray(keysData) ? keysData : []);

      setLoading(false);
    }
    load();
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
