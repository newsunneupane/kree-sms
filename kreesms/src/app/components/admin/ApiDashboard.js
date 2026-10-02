"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "✓ Sent (200)" },
  { value: "failed", label: "✗ All failures" },
  { value: "401", label: "401 Auth failed" },
  { value: "402", label: "402 No credits" },
  { value: "429", label: "429 Rate limited" },
  { value: "502", label: "502 Provider failed" },
];

const PRODUCT_STYLES = {
  school: "bg-blue-50 text-blue-700 border-blue-200",
  restaurant: "bg-orange-50 text-orange-700 border-orange-200",
  accounting: "bg-violet-50 text-violet-700 border-violet-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

function statusChip(code) {
  if (code === 200) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (code === 429) return "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse";
  return "bg-rose-50 text-rose-700 border border-rose-200";
}

export default function ApiDashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0 });
  const [filters, setFilters] = useState({ clientId: "", status: "all", from: "", to: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ name: "", product: "school", credits: "100", rateLimitPerMin: "60" });
  const [issuing, setIssuing] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState(null);

  const [topUp, setTopUp] = useState({});

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
          credits: parseInt(issueForm.credits || "0", 10),
          rateLimitPerMin: parseInt(issueForm.rateLimitPerMin || "60", 10),
        },
      });
      if (data.success) {
        setIssuedSecret({ apiKey: data.apiKey, secret: data.secret, prefix: data.client.key_prefix, panelEmail: data.panelEmail, panelPassword: data.panelPassword });
        setIssueForm({ name: "", product: "school", credits: "100", rateLimitPerMin: "60" });
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
      }
    } catch {
      setMsg("Top-up failed. Please try again.");
    }
  };

  const handleStatus = async (client) => {
    const action = client.is_active ? "revoke" : "activate";
    if (client.is_active && !window.confirm(`Revoke ${client.name}? Its API calls will fail immediately.`)) return;
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

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${label} copied.`);
    } catch {
      setMsg("Copy failed — select the text manually.");
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 30)));
  const successRate =
    stats && stats.sentToday + stats.failed24h > 0
      ? Math.round((stats.sentToday / (stats.sentToday + stats.failed24h)) * 100)
      : null;

  const statCards = [
    { label: "Active API clients", value: stats ? `${stats.activeClients}/${stats.totalClients}` : "•••", color: "text-blue-600", tag: "PRODUCTS" },
    { label: "Sent in 24h", value: stats ? stats.sentToday.toLocaleString() : "•••", color: "text-emerald-600", tag: "DELIVERED" },
    { label: "Credits used 24h", value: stats ? stats.creditsToday.toLocaleString() : "•••", color: "text-violet-600", tag: "BURN" },
    {
      label: "Failures in 24h",
      value: stats ? stats.failed24h.toLocaleString() : "•••",
      color: stats && stats.failed24h > 0 ? "text-rose-600" : "text-gray-400",
      tag: "WATCH",
    },
    {
      label: "Success rate 24h",
      value: successRate !== null ? `${successRate}%` : "—",
      color: "text-gray-700",
      tag: "HEALTH",
    },
  ];

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
          <span>{msg}</span>
          <button type="button" onClick={() => setMsg("")} className="text-amber-500 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white p-4 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">{c.tag}</span>
            <p className={`text-2xl font-black font-mono tracking-tight mt-1 ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center space-x-2">
              <span>🔑</span><span>API clients</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">One key per product. Secrets are shown once and never again.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowIssue(true); setIssuedSecret(null); }}
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            ＋ Issue key
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Project</th>
                <th className="p-3.5">Key prefix</th>
                <th className="p-3.5">Balance</th>
                <th className="p-3.5">Sent 24h</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
              {!stats || stats.clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-medium italic">
                    No API clients yet. Issue the first key to onboard a product.
                  </td>
                </tr>
              ) : (
                stats.clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 font-black rounded-md uppercase tracking-wider border ${PRODUCT_STYLES[c.product] || PRODUCT_STYLES.other}`}>
                        {c.product}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => copyText(c.key_prefix, "Key prefix")}
                        className="font-mono text-violet-600 font-semibold hover:underline"
                        title="Click to copy"
                      >
                        {c.key_prefix}
                      </button>
                    </td>
                    <td className={`p-3.5 font-black font-mono ${c.sms_balance < 20 ? "text-rose-600" : "text-emerald-600"}`}>
                      {c.sms_balance.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono">{c.today.sent} <span className="text-gray-400">({c.today.credits} cr)</span></td>
                    <td className="p-3.5">
                      <span className={`inline-block text-[10px] px-2.5 py-0.5 font-black rounded-md uppercase tracking-wider border ${c.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {c.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={topUp[c.id] || ""}
                          onChange={(e) => setTopUp((t) => ({ ...t, [c.id]: e.target.value }))}
                          placeholder="+ credits"
                          className="w-24 text-xs font-mono p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-violet-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleTopUp(c.id)}
                          className="bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black py-2 px-3 rounded-lg transition-all whitespace-nowrap"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(c)}
                          className={`text-[11px] font-black py-2 px-3 rounded-lg transition-all whitespace-nowrap ${c.is_active ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        >
                          {c.is_active ? "Revoke" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center space-x-2">
            <span>📜</span><span>API request log</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Every call, including failures. Phones stay masked.</p>
        </div>

        <form onSubmit={applyFilters} className="mb-4 flex flex-wrap items-end gap-2">
          <select
            value={filters.clientId}
            onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
            className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
          >
            <option value="">All projects</option>
            {(stats?.clients || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
          />
          <button
            type="submit"
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            {loading ? "…" : "Filter"}
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Time</th>
                <th className="p-3.5">To</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Credits</th>
                <th className="p-3.5">Latency</th>
                <th className="p-3.5">Error</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-medium italic">
                    No requests match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3.5 text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3.5 font-mono">{l.to_masked || "—"}</td>
                    <td className="p-3.5">
                      <span className={`inline-block text-[10px] px-2.5 py-0.5 font-black rounded-md uppercase tracking-wider ${statusChip(l.status_code)}`}>
                        {l.status_code}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">{l.credits_used}</td>
                    <td className="p-3.5 font-mono text-gray-500">{l.latency_ms != null ? `${l.latency_ms}ms` : "—"}</td>
                    <td className="p-3.5 text-gray-500 max-w-xs truncate" title={l.error_message || ""}>{l.error_message || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>Page {pagination.page} of {totalPages} · {pagination.total.toLocaleString()} rows</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadLogs(pagination.page - 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= totalPages || loading}
              onClick={() => loadLogs(pagination.page + 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {issuedSecret ? (
              <div>
                <h3 className="text-base font-extrabold text-gray-800">🔑 Key issued — copy now</h3>
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  None of these will ever be shown again. API key + secret go in the product&apos;s server config; email + password are its panel login.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">API key</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2.5 break-all">{issuedSecret.apiKey}</code>
                      <button type="button" onClick={() => copyText(issuedSecret.apiKey, "API key")} className="text-xs font-bold px-3 py-2.5 rounded-lg bg-gray-900 text-white">Copy</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secret</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs font-mono bg-amber-50 border border-amber-200 rounded-lg p-2.5 break-all">{issuedSecret.secret}</code>
                      <button type="button" onClick={() => copyText(issuedSecret.secret, "Secret")} className="text-xs font-bold px-3 py-2.5 rounded-lg bg-gray-900 text-white">Copy</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Panel login email</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs font-mono bg-blue-50 border border-blue-200 rounded-lg p-2.5 break-all">{issuedSecret.panelEmail}</code>
                      <button type="button" onClick={() => copyText(issuedSecret.panelEmail, "Panel email")} className="text-xs font-bold px-3 py-2.5 rounded-lg bg-gray-900 text-white">Copy</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Panel password</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs font-mono bg-blue-50 border border-blue-200 rounded-lg p-2.5 break-all">{issuedSecret.panelPassword}</code>
                      <button type="button" onClick={() => copyText(issuedSecret.panelPassword, "Panel password")} className="text-xs font-bold px-3 py-2.5 rounded-lg bg-gray-900 text-white">Copy</button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowIssue(false); setIssuedSecret(null); }}
                  className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl"
                >
                  I have saved all four — close
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssue}>
                <h3 className="text-base font-extrabold text-gray-800">＋ Issue API key</h3>
                <p className="text-xs text-gray-500 mt-0.5">One key per product. Fund it after issuing.</p>
                <div className="mt-4 space-y-3">
                  <input
                    value={issueForm.name}
                    onChange={(e) => setIssueForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Project name, e.g. Shree School MIS"
                    required
                    minLength={2}
                    className="w-full text-sm p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-violet-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={issueForm.product}
                      onChange={(e) => setIssueForm((f) => ({ ...f, product: e.target.value }))}
                      className="text-sm p-2.5 rounded-xl border border-gray-300 bg-white"
                    >
                      <option value="school">🏫 School</option>
                      <option value="restaurant">🍽️ Restaurant</option>
                      <option value="accounting">🧾 Accounting</option>
                      <option value="other">📦 Other</option>
                    </select>
                    <input
                      type="number"
                      value={issueForm.rateLimitPerMin}
                      onChange={(e) => setIssueForm((f) => ({ ...f, rateLimitPerMin: e.target.value }))}
                      placeholder="Rate/min"
                      min="1"
                      max="1000"
                      className="text-sm font-mono p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <input
                    type="number"
                    value={issueForm.credits}
                    onChange={(e) => setIssueForm((f) => ({ ...f, credits: e.target.value }))}
                    placeholder="Starting credits"
                    min="0"
                    className="w-full text-sm font-mono p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIssue(false)}
                    className="flex-1 border border-gray-300 text-gray-600 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={issuing}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {issuing ? "Issuing…" : "Issue key"}
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
