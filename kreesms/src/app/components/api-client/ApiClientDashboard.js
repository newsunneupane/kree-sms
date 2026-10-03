"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "✓ Sent (200)" },
  { value: "failed", label: "✗ All failures" },
  { value: "402", label: "402 No credits" },
  { value: "429", label: "429 Rate limited" },
  { value: "502", label: "502 Provider failed" },
];

function statusChip(code) {
  if (code === 200) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (code === 429) return "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse";
  return "bg-rose-50 text-rose-700 border border-rose-200";
}

export default function ApiClientDashboard({ user, logout }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0 });
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadAll = async (page = 1, statusFilter = status) => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api("/api/client/profile"), api("/api/client/stats")]);
      if (p.success) setProfile(p.project);
      if (s.success) setStats(s);
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const l = await api(`/api/client/logs?${params.toString()}`);
      if (l.success) {
        setLogs(l.logs || []);
        setPagination(l.pagination || { page: 1, limit: 30, total: 0 });
      }
    } catch (err) {
      console.error("Could not load panel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(1, "all");
  }, []);

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${label} copied.`);
    } catch {
      setMsg("Copy failed — select the text manually.");
    }
  };

  const curlExample = profile
    ? [
        `BODY='{"to":"9841234567","message":"Hello from ${profile.name}"}'`,
        `TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)`,
        `# SIG=$(node -e "console.log(require('crypto').createHmac('sha256',SECRET).update(TS+'.'+BODY).digest('hex'))")`,
        `curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/public/send-sms \\`,
        `  -H 'Content-Type: application/json' \\`,
        `  -H "x-api-key: YOUR_API_KEY" -H "x-timestamp: $TS" -H "x-signature: $SIG" \\`,
        `  -H 'x-request-id: unique-per-message' -d "$BODY"`,
      ].join("\n")
    : "";

  const curlExampleBulk = profile
    ? [
        `BODY='{"to":["9841234567","9851234567"],"message":"Hello from ${profile.name}"}'`,
        `TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)`,
        `# SIG=$(node -e "console.log(require('crypto').createHmac('sha256',SECRET).update(TS+'.'+BODY).digest('hex'))")`,
        `curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/public/send-bulk \\`,
        `  -H 'Content-Type: application/json' \\`,
        `  -H "x-api-key: YOUR_API_KEY" -H "x-timestamp: $TS" -H "x-signature: $SIG" \\`,
        `  -H 'x-request-id: unique-per-batch' -d "$BODY"`,
      ].join("\n")
    : "";

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 30)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 text-gray-800">
        <header className="bg-gray-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
          <div>
            <h1 className="text-lg font-black tracking-wider text-blue-400 font-mono uppercase">KreeSMS · API Panel</h1>
            <p className="text-[11px] tracking-wide text-gray-400 mt-0.5">
              {profile ? profile.name : user?.name} · signed in as {user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            type="button"
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-black tracking-wide py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            🚪 Log out
          </button>
        </header>

        {msg && (
          <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
            <span>{msg}</span>
            <button type="button" onClick={() => setMsg("")} className="text-amber-500 font-bold ml-2">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Balance</span>
            <p className={`text-2xl font-black font-mono mt-1 ${(profile?.sms_balance ?? 0) < 20 ? "text-rose-600" : "text-emerald-600"}`}>
              {profile ? profile.sms_balance.toLocaleString() : "•••"}
            </p>
            <p className="text-[11px] text-gray-500">credits {(profile?.sms_balance ?? 0) < 20 ? "— running low, contact admin" : "available"}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Sent 24h</span>
            <p className="text-2xl font-black font-mono mt-1 text-blue-600">{stats ? stats.sent24h.toLocaleString() : "•••"}</p>
            <p className="text-[11px] text-gray-500">{stats ? `${stats.creditsUsed24h.toLocaleString()} credits used` : ""}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Failures 24h</span>
            <p className={`text-2xl font-black font-mono mt-1 ${stats && stats.failed24h > 0 ? "text-rose-600" : "text-gray-400"}`}>
              {stats ? stats.failed24h.toLocaleString() : "•••"}
            </p>
            <p className="text-[11px] text-gray-500">incl. rate limits &amp; provider errors</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Key prefix</span>
            <p className="text-sm font-mono font-bold text-violet-600 mt-2 break-all">{profile?.key_prefix || "•••"}</p>
            <button type="button" onClick={() => profile && copyText(profile.key_prefix, "Key prefix")} className="text-[11px] font-bold text-gray-500 hover:text-gray-800 mt-1">
              Copy
            </button>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
          <h3 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center space-x-2">
            <span>🔌</span><span>Connect your software</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Send <code className="font-mono bg-gray-100 px-1 rounded">POST /api/public/send-sms</code> (single) or <code className="font-mono bg-gray-100 px-1 rounded">POST /api/public/send-bulk</code> (same message to 2–100 numbers) with these headers.
            Sign the <em>exact JSON bytes</em> you send: <code className="font-mono bg-gray-100 px-1 rounded">HMAC_SHA256(secret, timestamp + &quot;.&quot; + body)</code>.
            Keep your secret on your server — never in frontend code.
          </p>
          <pre className="mt-3 text-[11px] font-mono bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre">{curlExample}</pre>
          <pre className="mt-3 text-[11px] font-mono bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre">{curlExampleBulk}</pre>
          <p className="text-[11px] text-gray-500 mt-2">
            Responses: <b>200</b> sent · <b>400</b> bad data · <b>401</b> bad key/signature · <b>402</b> out of credits (contact admin) · <b>429</b> too fast (respect Retry-After) · <b>502</b> provider failed, credits refunded.
            Reuse <code className="font-mono bg-gray-100 px-1 rounded">x-request-id</code> safely — retries never double-charge.
          </p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center space-x-2">
                <span>📜</span><span>My API calls</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Every call from your key, including failures.</p>
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); loadAll(1, e.target.value); }}
              className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

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
                      {loading ? "Loading…" : "No calls yet — send your first request to see it here."}
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
                onClick={() => loadAll(pagination.page - 1)}
                className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= totalPages || loading}
                onClick={() => loadAll(pagination.page + 1)}
                className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
