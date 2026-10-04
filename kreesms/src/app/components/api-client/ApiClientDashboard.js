"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";
import { StatCard, StatusChip, DataTable, EmptyState, Notice, CopyButton, selectCls } from "../ui/ui";
import { IconLogout, IconKey, IconDoc } from "../ui/Icons";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent (200)" },
  { value: "failed", label: "All failures" },
  { value: "402", label: "402 No credits" },
  { value: "429", label: "429 Rate limited" },
  { value: "502", label: "502 Provider failed" },
];

function CodeBlock({ title, code }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{title}</span>
        <CopyButton text={code} label="Copy curl" dark />
      </div>
      <pre className="text-[11px] leading-relaxed font-mono bg-slate-900 text-slate-100 p-4 overflow-x-auto nice-scroll whitespace-pre">{code}</pre>
    </div>
  );
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
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        <header className="bg-slate-900 text-white px-6 py-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-bold shadow-lg shadow-violet-600/30">
              कृ
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-widest font-mono">KREESMS · API PANEL</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {profile ? profile.name : user?.name} · {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            type="button"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-rose-600 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
          >
            <IconLogout className="w-4 h-4" />
            Log out
          </button>
        </header>

        {msg && <Notice tone="info" onDismiss={() => setMsg("")}>{msg}</Notice>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            eyebrow="Balance"
            value={profile ? profile.sms_balance.toLocaleString() : "···"}
            valueClass={(profile?.sms_balance ?? 0) < 20 ? "text-rose-600" : "text-emerald-700"}
            hint={(profile?.sms_balance ?? 0) < 20 ? "Running low — contact admin" : "credits available"}
          />
          <StatCard
            eyebrow="Sent 24h"
            value={stats ? stats.sent24h.toLocaleString() : "···"}
            valueClass="text-blue-700"
            hint={stats ? `${stats.creditsUsed24h.toLocaleString()} credits used` : " "}
          />
          <StatCard
            eyebrow="Failures 24h"
            value={stats ? stats.failed24h.toLocaleString() : "···"}
            valueClass={stats && stats.failed24h > 0 ? "text-rose-600" : "text-slate-400"}
            hint="incl. rate limits & provider errors"
          />
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Key prefix</p>
            <p className="text-[13px] font-mono font-bold text-violet-700 mt-2 break-all leading-relaxed">{profile?.key_prefix || "···"}</p>
            <button type="button" onClick={() => profile && copyText(profile.key_prefix, "Key prefix")} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 mt-1.5 underline underline-offset-2">
              Copy prefix
            </button>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
            <IconKey className="w-4 h-4 text-slate-400" />
            Connect your software
          </h3>
          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
            Send <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/public/send-sms</code> (single) or{" "}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/public/send-bulk</code> (same message to 2–100 numbers) with these headers.
            Sign the <em>exact JSON bytes</em> you send: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">HMAC_SHA256(secret, timestamp + &quot;.&quot; + body)</code>.
            Keep your secret on your server — never in frontend code.
          </p>
          <CodeBlock title="Single SMS" code={curlExample} />
          <CodeBlock title="Bulk SMS" code={curlExampleBulk} />
          <p className="text-[12px] text-slate-500 mt-3 leading-relaxed">
            Responses: <strong>200</strong> sent · <strong>400</strong> bad data · <strong>401</strong> bad key/signature · <strong>402</strong> out of credits (contact admin) · <strong>429</strong> too fast (respect Retry-After) · <strong>502</strong> provider failed, credits refunded.
            Reuse <code className="font-mono bg-slate-100 px-1 rounded">x-request-id</code> safely — retries never double-charge.
          </p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <IconDoc className="w-4 h-4 text-slate-400" />
                My API calls
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Every call from your key, including failures.</p>
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); loadAll(1, e.target.value); }}
              className={`${selectCls} sm:w-52 !py-2.5 !text-xs`}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <DataTable headers={[{ label: "Time" }, { label: "To" }, { label: "Status" }, { label: "Credits" }, { label: "Latency" }, { label: "Error" }]}>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-0">
                  <EmptyState title={loading ? "Loading calls..." : "No calls yet"} subtitle="Send your first request to see it here." />
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
                onClick={() => loadAll(pagination.page - 1)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= totalPages || loading}
                onClick={() => loadAll(pagination.page + 1)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
