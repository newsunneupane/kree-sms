"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "../../../lib/client-api";
import { CardHeader, StatusChip, DataTable, EmptyState, inputCls } from "../ui/ui";
import { IconRefresh, IconChat, IconCard } from "../ui/Icons";

export default function SmsHistory({ userId }) {
  const [historyTab, setHistoryTab] = useState("sms");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistoryData = async (type) => {
    setLoading(true);
    try {
      const url = type === "sms" ? "/api/user/history" : "/api/user/purchases";

      const data = await api(url);
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error(`Could not load ${type === "sms" ? "message" : "credit"} history:`, err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistoryData(historyTab);
    }
  }, [historyTab, userId]);

  // Client-side search only — no API change.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [l.recipient, l.message, l.payment_reference, l.sms_type, l.status, String(l.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [logs, query]);

  const formatDate = (v) => {
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return v;
      return d.toLocaleString();
    } catch {
      return v;
    }
  };

  return (
    <div>
      <CardHeader
        title="History"
        subtitle="Your sent messages and credit requests."
        action={
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            {[
              { id: "sms", label: "Messages", Icon: IconChat },
              { id: "credits", label: "Credit requests", Icon: IconCard },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setHistoryTab(t.id); setQuery(""); setExpandedId(null); }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  historyTab === t.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={historyTab === "sms" ? "Search number, message..." : "Search reference, order..."}
          className={`${inputCls} sm:max-w-xs !py-2.5`}
        />
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-1">
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of <strong className="text-slate-800">{logs.length}</strong>
          </span>
          <button
            onClick={() => fetchHistoryData(historyTab)}
            type="button"
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-2 font-semibold rounded-xl transition-all text-xs disabled:opacity-50 flex items-center gap-2"
          >
            <IconRefresh spin={loading} className="w-3.5 h-3.5 text-slate-400" />
            {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {historyTab === "sms" ? (
        <DataTable headers={[{ label: "Date" }, { label: "Type" }, { label: "To" }, { label: "Message" }, { label: "Status" }]}>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-0">
                <EmptyState title={loading ? "Loading messages..." : "No messages found"} subtitle={query ? "Try a different search." : "Messages you send will appear here."} />
              </td>
            </tr>
          ) : (
            filtered.map((log) => {
              const expanded = expandedId === log.id;
              return (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3"><StatusChip value={log.sms_type || "single"} /></td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap text-xs">{log.recipient}</td>
                  <td className="px-4 py-3 text-slate-500 min-w-[180px] max-w-[320px]">
                    <p className={expanded ? "whitespace-pre-wrap break-words" : "truncate"} title={log.message}>{log.message}</p>
                    {log.message && log.message.length > 60 && (
                      <button type="button" onClick={() => setExpandedId(expanded ? null : log.id)} className="text-[11px] font-bold text-violet-600 hover:text-violet-800 mt-1">
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusChip value={log.status || "success"} /></td>
                </tr>
              );
            })
          )}
        </DataTable>
      ) : (
        <DataTable headers={[{ label: "Date" }, { label: "Order" }, { label: "Credits" }, { label: "Reference" }, { label: "Status" }]}>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-0">
                <EmptyState title={loading ? "Loading requests..." : "No credit requests found"} subtitle={query ? "Try a different search." : "Top-up requests will appear here."} />
              </td>
            </tr>
          ) : (
            filtered.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3 font-mono font-bold text-slate-600 text-xs whitespace-nowrap">#CR-{log.id}</td>
                <td className="px-4 py-3 font-bold font-mono text-violet-700 whitespace-nowrap">{log.requested_credits} credits</td>
                <td className="px-4 py-3 max-w-[240px] truncate text-slate-500 text-xs" title={log.payment_reference}>{log.payment_reference}</td>
                <td className="px-4 py-3"><StatusChip value={log.status || "pending"} /></td>
              </tr>
            ))
          )}
        </DataTable>
      )}
    </div>
  );
}
