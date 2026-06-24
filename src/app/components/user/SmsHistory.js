"use client";
import { useState, useEffect } from "react";

export default function SmsHistory({ userId }) {
  const [historyTab, setHistoryTab] = useState("sms"); 
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistoryData = async (type) => {
    setLoading(true);
    try {
      let url = "";
      if (type === "sms") {
        url = `http://localhost/sms-backend/user.php?action=get_history&user_id=${userId}`;
      } else {
        url = `http://localhost/sms-backend/user.php?action=get_purchases&user_id=${userId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error(`Failed to fetch ${type} tracking logs:`, err);
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

  // Status mapping colors helper utility
  const getStatusChipStyle = (status) => {
    const s = status?.toLowerCase();
    if (s === "success" || s === "approved") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-100/80";
    }
    if (s === "pending") {
      return "bg-amber-50 text-amber-700 border border-amber-100/80 animate-pulse";
    }
    return "bg-rose-50 text-rose-700 border border-rose-100/80";
  };

  const getSmsTypeChipStyle = (type) => {
    switch (type?.toLowerCase()) {
      case "dynamic":
        return "bg-purple-50 text-purple-700 border border-purple-100/50";
      case "bulk":
        return "bg-orange-50 text-orange-700 border border-orange-100/50";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-100/50";
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6 transition-all duration-300">
      
      {/* ACCOUNT LOG ANALYTICS TITLE AREA */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Account Operational Ledger</h3>
          <p className="text-xs text-gray-400 mt-0.5">Audit live outbound messaging history streams and offline load requests records.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl items-center self-start w-full sm:w-fit border border-gray-200/20">
          <button
            type="button"
            onClick={() => setHistoryTab("sms")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              historyTab === "sms" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>💬</span>
            <span>SMS History</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab("credits")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              historyTab === "credits" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>💳</span>
            <span>Purchase Orders</span>
          </button>
        </div>
      </div>

      {/* FILTER METRICS CONTROL BAR */}
      <div className="flex justify-between items-center text-xs text-gray-500 font-medium bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        <span>
          Showing: <strong className="text-gray-800 font-bold">{historyTab === "sms" ? "Outbound Messages Sent Log" : "Payment Deposits Requests Log"}</strong>
        </span>
        <button
          onClick={() => fetchHistoryData(historyTab)}
          type="button"
          disabled={loading}
          className="bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 border border-gray-200 px-3 py-1.5 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
        >
          <span>{loading ? "⚙️" : "🔄"}</span>
          <span>{loading ? "Syncing..." : "Refresh Index"}</span>
        </button>
      </div>

      {/* DATA VISUALIZATION ELEMENT */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
        <table className="w-full text-left border-collapse">
          
          {/* RENDER GRID A: OUTBOUND MESSAGING REPOSITORY LOGS */}
          {historyTab === "sms" && (
            <>
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Channel Type</th>
                  <th className="p-3.5">Recipient Node</th>
                  <th className="p-3.5">Message Body Content</th>
                  <th className="p-3.5">Transit Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans">
                      No active text transmissions recorded inside your profile data stack.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-gray-400 tracking-tight whitespace-nowrap">{log.created_at}</td>
                      <td className="p-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide ${getSmsTypeChipStyle(log.sms_type)}`}>
                          {log.sms_type || "single"}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-gray-800 tracking-wide whitespace-nowrap">{log.recipient}</td>
                      <td className="p-3.5 max-w-xs truncate text-gray-500 font-medium" title={log.message}>{log.message}</td>
                      <td className="p-3.5">
                        <span className={`inline-block text-[10px] px-2 py-0.5 font-black rounded-md uppercase tracking-wider ${getStatusChipStyle(log.status)}`}>
                          {log.status || "success"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {/* RENDER GRID B: TRANSACTION DEPOSITS TRACKING ENTRIES */}
          {historyTab === "credits" && (
            <>
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Order Token ID</th>
                  <th className="p-3.5">Requested Allocation</th>
                  <th className="p-3.5">Payment Reference / Remarks</th>
                  <th className="p-3.5">Approval Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans">
                      No balance acquisition manifests recorded under this account wallet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-gray-400 tracking-tight whitespace-nowrap">{log.created_at}</td>
                      <td className="p-3.5 font-mono font-bold text-gray-500">#CR-{log.id}</td>
                      <td className="p-3.5 font-black text-blue-600 tracking-wide whitespace-nowrap">{log.requested_credits} Credits</td>
                      <td className="p-3.5 font-medium max-w-xs truncate text-gray-600" title={log.payment_reference}>{log.payment_reference}</td>
                      <td className="p-3.5">
                        <span className={`inline-block text-[10px] px-2.5 py-0.5 font-black rounded-md uppercase tracking-wider ${getStatusChipStyle(log.status)}`}>
                          {log.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

        </table>
      </div>
    </div>
  );
}