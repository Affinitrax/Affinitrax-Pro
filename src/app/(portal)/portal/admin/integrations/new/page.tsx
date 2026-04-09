"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Deal = { id: string; vertical: string | null; type: string | null; requester_id: string | null };

export default function NewIntegrationPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    deal_id: "",
    name: "",
    endpoint_url: "",
    auth_type: "header_key",
    auth_header_name: "Authorization",
    auth_credential: "",
    content_type: "json",
    response_lead_id_path: "id",
    response_redirect_url_path: "",
    notes: "",
    status: "testing",
    allowed_geos: "" as string,  // comma-separated ISO codes, empty = all geos
    priority: "10",
    daily_cap: "",
    relay_mode: "instant" as "instant" | "throttled",
    throttle_rate: "20",
  });

  useEffect(() => {
    fetch("/api/admin/deals")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setDeals(d))
      .catch(() => {});
  }, []);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        response_redirect_url_path: form.response_redirect_url_path || null,
        allowed_geos: form.allowed_geos.trim()
          ? form.allowed_geos.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean)
          : null,
        priority: parseInt(form.priority, 10) || 10,
        daily_cap: form.daily_cap ? parseInt(form.daily_cap, 10) : null,
        relay_mode: form.relay_mode,
        throttle_rate: parseInt(form.throttle_rate, 10) || 20,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/portal/admin/integrations/${data.id}`);
    } else {
      setError(data.error ?? "Failed to create integration");
      setSaving(false);
    }
  }

  return (
    <main className="flex-1 p-8 max-w-2xl">
      <button
        onClick={() => router.push("/portal/admin/integrations")}
        className="text-[#475569] text-xs hover:text-[#94a3b8] transition-colors mb-4 flex items-center gap-1"
      >
        ← Back to Integrations
      </button>

      <h1 className="text-2xl font-bold text-white font-display mb-1">New Integration</h1>
      <p className="text-[#94a3b8] text-sm mb-8">
        Configure a buyer CRM endpoint. You can set status to <span className="text-amber-400 font-mono text-xs">testing</span> and add field mappings after.
      </p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg text-sm bg-red-500/15 text-red-400 border border-red-500/30">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <section className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-white font-semibold">Basic Info</h2>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Deal</label>
            <select
              required
              value={form.deal_id}
              onChange={(e) => set("deal_id", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="">— Select a deal —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.vertical ?? "Deal"} · {d.type ?? "—"} · {d.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Integration Name</label>
            <input
              required
              placeholder="e.g. Jason DE CRM"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="testing">Testing</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-white font-semibold">Geo Routing &amp; Priority</h2>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Allowed GEOs</label>
            <input
              placeholder="Leave empty for all geos, or enter: ES, IT, UK"
              value={form.allowed_geos}
              onChange={(e) => set("allowed_geos", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
            />
            <p className="text-[#475569] text-xs mt-1">Comma-separated ISO-2 country codes. Empty = accept all geos.</p>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
            />
            <p className="text-[#475569] text-xs mt-1">Lower number = higher priority when multiple integrations match a geo.</p>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Daily Cap (leads/day)</label>
            <input
              type="number"
              placeholder="Leave empty for no cap"
              value={form.daily_cap}
              onChange={(e) => set("daily_cap", e.target.value)}
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
                  onClick={() => set("relay_mode", mode)}
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
                onChange={(e) => set("throttle_rate", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-500/40"
              />
              <p className="text-[#475569] text-xs mt-1">e.g. 10 = ~1 lead every 6 minutes spread across the hour.</p>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-white font-semibold">Buyer CRM Endpoint</h2>
          <p className="text-[#475569] text-xs">
            Leave blank if you don&apos;t have buyer details yet — you can fill these in later. Generate seller API keys after saving.
          </p>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Endpoint URL</label>
            <input
              placeholder="https://buyer-crm.com/api/leads"
              value={form.endpoint_url}
              onChange={(e) => set("endpoint_url", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Auth Type</label>
              <select
                value={form.auth_type}
                onChange={(e) => set("auth_type", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
              >
                <option value="header_key">Header Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="query_param">Query Param</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Content Type</label>
              <select
                value={form.content_type}
                onChange={(e) => set("content_type", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
              >
                <option value="json">JSON</option>
                <option value="form_urlencoded">Form URL-encoded</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Auth Header / Param Name</label>
              <input
                placeholder="X-API-Key"
                value={form.auth_header_name}
                onChange={(e) => set("auth_header_name", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Credential (encrypted at rest)</label>
              <input
                type="password"
                placeholder="buyer api key / token"
                value={form.auth_credential}
                onChange={(e) => set("auth_credential", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Response Lead ID Path</label>
              <input
                placeholder="e.g. data.id or leadId"
                value={form.response_lead_id_path}
                onChange={(e) => set("response_lead_id_path", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">Redirect URL Path (optional)</label>
              <input
                placeholder="e.g. data.redirect"
                value={form.response_redirect_url_path}
                onChange={(e) => set("response_redirect_url_path", e.target.value)}
                className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1.5">Notes</label>
            <textarea
              rows={2}
              placeholder="Internal notes about this buyer CRM…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="bg-[#13131f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-[#00d4ff]/40 resize-none"
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/admin/integrations")}
            className="px-5 py-2 rounded-lg text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.deal_id || !form.name || !form.auth_type}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7c3aed)" }}
          >
            {saving ? "Creating…" : "Create Integration →"}
          </button>
        </div>
      </form>
    </main>
  );
}
