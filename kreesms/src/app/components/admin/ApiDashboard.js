"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";
import { StatCard, StatusChip, DataTable, EmptyState, Notice, CopyButton, inputCls, selectCls } from "../ui/ui";
import { IconKey, IconDoc, IconPlus, IconX } from "../ui/Icons";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent (200)" },
  { value: "failed", label: "All failures" },
  { value: "401", label: "401 Auth failed" },
  { value: "402", label: "402 No credits" },
  { value: "429", label: "429 Rate limited" },
  { value: "502", label: "502 Provider failed" },
];

const PRODUCT_STYLES = {
  school: "bg-blue-50 text-blue-700 border-blue-200",
  restaurant: "bg-orange-50 text-orange-700 border-orange-200",
  accounting: "bg-violet-50 text-violet-700 border-violet-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ApiDashboard({ onPoolChange }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0 });
  const [filters, setFilters] = useState({ clientId: "", status: "all", from: "", to: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ name: "", product: "school", rateLimitPerMin: "60" });
  const [issuing, setIssuing] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState(null);

  const [topUp, setTopUp] = useState({});
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const loadStats = async () => {
    try {
      const data = await api("/api/admin/public-stats");
      if (data.success) setStats(data);
    } catch (err) {
      console.error("Could not load API stats:", err);
    }
  };

  const loadLogs = async (page = 1, override) => {
    setLoading(true);
    try {
      const f = override || filters;
      const params = new URLSearchParams({ page: String(page) });
      if (f.clientId) params.set("clientId", f.clientId);
      if (f.status && f.status !== "all") params.set("status", f.status);
      if (f.from) params.set("from", new Date(f.from).toISOString());
      if (f.to) params.set("to", new Date(f.to).toISOString());
      const data = await api(`/api/admin/public-logs?${params.toString()}`);
      if (data.success) {
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: 30, total: 0 });
      }
    } catch (err) {
      console.error("Could not load API logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadLogs(1);
  }, []);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    loadLogs(1);
  };

  const clearFilters = () => {
    const reset = { clientId: "", status: "all", from: "", to: "" };
    setFilters(reset);
    loadLogs(1, reset);
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssuing(true);
    setMsg("");
    try {
      const data = await api("/api/admin/api-clients", {
        method: "POST",
        body: {
          name: issueForm.name,
          product: issueForm.product,
          rateLimitPerMin: parseInt(issueForm.rateLimitPerMin || "60", 10),
        },
      });
      if (data.success) {
        setIssuedSecret({ apiKey: data.apiKey, secret: data.secret, prefix: data.client.key_prefix, panelEmail: data.panelEmail, panelPassword: data.panelPassword });
        setIssueForm({ name: "", product: "school", rateLimitPerMin: "60" });
        loadStats();
      } else {
        setMsg(data.message || "Could not issue key.");
      }
    } catch {
      setMsg("Could not issue key. Please try again.");
    } finally {
      setIssuing(false);
    }
  };

  const handleTopUp = async (id) => {
    const amount = parseInt(topUp[id] || "0", 10);
    if (!amount || amount <= 0) return;
    setMsg("Adding credits...");
    try {
      const data = await api(`/api/admin/api-clients/${id}/topup`, { method: "POST", body: { credits: amount } });
      setMsg(data.message);
      if (data.success) {
        setTopUp((t) => ({ ...t, [id]: "" }));
        loadStats();
        onPoolChange?.();
      }
    } catch {
      setMsg("Top-up failed. Please try again.");
    }
  };

  const handleStatus = async (client) => {
    // confirmRevoke replaces window.confirm with a styled modal — same API call.
    setConfirmRevoke(null);
    const action = client.is_active ? "revoke" : "activate";
    setMsg(`${action === "revoke" ? "Revoking" : "Activating"}...`);
    try {
      const data = await api(`/api/admin/api-clients/${client.id}/status`, {
        method: "POST",
        body: { is_active: !client.is_active },
      });
      setMsg(data.message);
      if (data.success) loadStats();
    } catch {
      setMsg("Could not update status. Please try again.");
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 30)));
  const successRate =
    stats && stats.sentToday + stats.failed24h > 0
      ? Math.round((stats.sentToday / (stats.sentToday + stats.failed24h)) * 100)
      : null;

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${label} copied.`);
    } catch {
      setMsg("Copy failed — select the text manually.");
    }
  };

  return (
    <div className="space-y-6">
      {msg && <Notice tone="info" onDismiss={() => setMsg("")}>{msg}</Notice>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard eyebrow="Clients" value={stats ? `${stats.activeClients}/${stats.totalClients}` : "···"} valueClass="text-blue-700" hint="Active / total" />
        <StatCard eyebrow="Sent 24h" value={stats ? stats.sentToday.toLocaleString() : "···"} valueClass="text-emerald-700" hint="Delivered" />
        <StatCard eyebrow="Credits 24h" value={stats ? stats.creditsToday.toLocaleString() : "···"} valueClass="text-violet-700" hint="Burn" />
        <StatCard eyebrow="Failures 24h" value={stats ? stats.failed24h.toLocaleString() : "···"} valueClass={stats && stats.failed24h > 0 ? "text-rose-600" : "text-slate-400"} hint="Watch" />
        <StatCard eyebrow="Success 24h" value={successRate !== null ? `${successRate}%` : "—"} valueClass="text-slate-800" hint="Health" />
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              <IconKey className="w-4 h-4 text-slate-400" />
              API clients
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">One key per product. Secrets are shown once and never again.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowIssue(true); setIssuedSecret(null); }}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Issue key
          </button>
        </div>

        <DataTable headers={[{ label: "Project" }, { label: "Key prefix" }, { label: "Balance" }, { label: "Sent 24h" }, { label: "Status" }, { label: "Actions", align: "right" }]}>
          {!stats || stats.clients.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-0">
                <EmptyState title="No API clients yet" subtitle="Issue the first key to onboard a product." />
              </td>
            </tr>
          ) : (
            stats.clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 font-bold rounded-md uppercase tracking-wider border ${PRODUCT_STYLES[c.product] || PRODUCT_STYLES.other}`}>
                    {c.product}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => copyText(c.key_prefix, "Key prefix")}
                    className="font-mono text-xs text-violet-700 font-semibold hover:underline"
                    title="Click to copy"
                  >
                    {c.key_prefix}
                  </button>
                </td>
                <td className={`px-4 py-3 font-bold font-mono ${c.sms_balance < 20 ? "text-rose-600" : "text-emerald-700"}`}>
                  {c.sms_balance.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{c.today.sent} <span className="text-slate-400">({c.today.credits} cr)</span></td>
                <td className="px-4 py-3">
                  <StatusChip value={c.is_active ? "Active" : "Revoked"} tone={c.is_active ? "success" : undefined} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      value={topUp[c.id] || ""}
                      onChange={(e) => setTopUp((t) => ({ ...t, [c.id]: e.target.value }))}
                      placeholder="+ credits"
                      aria-label={`Top-up credits for ${c.name}`}
                      className="w-24 text-xs font-mono px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleTopUp(c.id)}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg transition-all whitespace-nowrap"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => (c.is_active ? setConfirmRevoke(c) : handleStatus(c))}
                      className={`text-[11px] font-bold py-2 px-3 rounded-lg transition-all whitespace-nowrap ${c.is_active ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                    >
                      {c.is_active ? "Revoke" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-5">
          <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
            <IconDoc className="w-4 h-4 text-slate-400" />
            API request log
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Every call, including failures. Phones stay masked.</p>
        </div>

        <form onSubmit={applyFilters} className="mb-4 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Project</label>
            <select
              value={filters.clientId}
              onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
              className={`${selectCls} !py-2.5 !text-xs`}
            >
              <option value="">All projects</option>
              {(stats?.clients || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className={`${selectCls} !py-2.5 !text-xs`}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className={`${inputCls} !py-2.5 !text-xs`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className={`${inputCls} !py-2.5 !text-xs`}
            />
          </div>
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              {loading ? "Filtering..." : "Filter"}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              Clear
            </button>
          </div>
        </form>

        <DataTable headers={[{ label: "Time" }, { label: "To" }, { label: "Status" }, { label: "Credits" }, { label: "Latency" }, { label: "Error" }]}>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-0">
                <EmptyState title="No requests match these filters" subtitle="Adjust the filters or clear them to see all calls." />
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.to_masked || "—"}</td>
                <td className="px-4 py-3"><StatusChip value={String(l.status_code)} /></td>
                <td className="px-4 py-3 font-mono text-xs">{l.credits_used}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{l.latency_ms != null ? `${l.latency_ms}ms` : "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[240px] truncate" title={l.error_message || ""}>{l.error_message || "—"}</td>
              </tr>
            ))
          )}
        </DataTable>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>Page {pagination.page} of {totalPages} · {pagination.total.toLocaleString()} rows</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadLogs(pagination.page - 1)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 font-semibold"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= totalPages || loading}
              onClick={() => loadLogs(pagination.page + 1)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-[15px] font-bold text-slate-900">Revoke {confirmRevoke.name}?</h3>
            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">Its API calls will fail immediately. You can re-activate it later.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmRevoke(null)} className="flex-1 border border-slate-300 text-slate-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => handleStatus(confirmRevoke)} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm py-2.5 rounded-xl">
                Revoke key
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto nice-scroll">
            {issuedSecret ? (
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Key issued — copy now</h3>
                <p className="text-xs text-rose-600 font-semibold mt-1.5 leading-relaxed">
                  None of these will ever be shown again. API key + secret go in the product&apos;s server config; email + password are its panel login.
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "API key", value: issuedSecret.apiKey, tone: "bg-slate-50 border-slate-200" },
                    { label: "Secret", value: issuedSecret.secret, tone: "bg-amber-50 border-amber-200" },
                    { label: "Panel login email", value: issuedSecret.panelEmail, tone: "bg-blue-50 border-blue-200" },
                    { label: "Panel password", value: issuedSecret.panelPassword, tone: "bg-blue-50 border-blue-200" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className={`flex-1 text-xs font-mono border rounded-lg p-2.5 break-all ${s.tone}`}>{s.value}</code>
                        <CopyButton text={s.value} dark={false} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowIssue(false); setIssuedSecret(null); }}
                  className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 rounded-xl"
                >
                  I have saved all four — close
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssue}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">Issue API key</h3>
                    <p className="text-xs text-slate-500 mt-0.5">One key per product. Fund it after issuing.</p>
                  </div>
                  <button type="button" onClick={() => setShowIssue(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Close">
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    value={issueForm.name}
                    onChange={(e) => setIssueForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Project name, e.g. Shree School MIS"
                    required
                    minLength={2}
                    className={`${inputCls} !text-sm`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={issueForm.product}
                      onChange={(e) => setIssueForm((f) => ({ ...f, product: e.target.value }))}
                      className={`${selectCls} !text-sm`}
                      aria-label="Product type"
                    >
                      <option value="school">School</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="accounting">Accounting</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      value={issueForm.rateLimitPerMin}
                      onChange={(e) => setIssueForm((f) => ({ ...f, rateLimitPerMin: e.target.value }))}
                      placeholder="Rate/min"
                      min="1"
                      max="1000"
                      aria-label="Rate limit per minute"
                      className={`${inputCls} !text-sm font-mono`}
                    />
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIssue(false)}
                    className="flex-1 border border-slate-300 text-slate-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={issuing}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {issuing ? "Issuing..." : "Issue key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
