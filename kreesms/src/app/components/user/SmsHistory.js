"use client";
import { useState, useEffect } from "react";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SmsHistory({ userId }) {
  const [historyTab, setHistoryTab] = useState("sms"); 
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistoryData = async (type) => {
    setLoading(true);
    try {
      let url = "";
      if (type === "sms") {
        url = `${baseUrl}/sms-backend/user.php?action=get_history&user_id=${userId}`;
      } else {
        url = `${baseUrl}/sms-backend/user.php?action=get_purchases&user_id=${userId}`;
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

  const getStatusChipStyle = (status) => {
    const s = status?.toLowerCase();
    if (s === "success" || s === "approved") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (s === "pending") {
      return "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse";
    }
    return "bg-rose-50 text-rose-700 border border-rose-200";
  };

  const getSmsTypeChipStyle = (type) => {
    switch (type?.toLowerCase()) {
      case "dynamic":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "bulk":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      default:
        return "bg-violet-50 text-violet-700 border border-violet-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 transition-all duration-300">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-5 pl-1">
        <div>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">Account Operational Ledger</h3>
          <p className="text-xs text-gray-500 mt-1">Audit live outbound messaging history streams and offline load requests records.</p>
        </div>

        <div className="flex bg-gray-200/50 p-1.5 rounded-xl items-center self-start w-full sm:w-fit border border-gray-300/30">
          <button
            type="button"
            onClick={() => setHistoryTab("sms")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              historyTab === "sms" 
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-sm">💬</span>
            <span>SMS History</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab("credits")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              historyTab === "credits" 
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-sm">💳</span>
            <span>Purchase Orders</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 font-medium bg-gray-50 p-3.5 rounded-xl border border-gray-200">
        <span>
          Showing: <strong className="text-gray-800 font-bold tracking-wide">{historyTab === "sms" ? "Outbound Messages Sent Log" : "Payment Deposits Requests Log"}</strong>
        </span>
        <button
          onClick={() => fetchHistoryData(historyTab)}
          type="button"
          disabled={loading}
          className="bg-white hover:bg-gray-100 hover:text-gray-800 text-gray-500 border border-gray-200 px-3 py-1.5 font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 flex items-center space-x-2 shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin text-violet-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
          </svg>
          <span>{loading ? "Syncing..." : "Refresh Index"}</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse">
          
          {historyTab === "sms" && (
            <>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Channel Type</th>
                  <th className="p-4">Recipient Node</th>
                  <th className="p-4">Message Body Content</th>
                  <th className="p-4">Transit Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium tracking-wide">
                      No active text transmissions recorded inside your profile data stack.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-gray-500 tracking-tight whitespace-nowrap">{log.created_at}</td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold uppercase tracking-wide border ${getSmsTypeChipStyle(log.sms_type)}`}>
                          {log.sms_type || "single"}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-800 tracking-wide whitespace-nowrap">{log.recipient}</td>
                      <td className="p-4 max-w-xs truncate text-gray-500 font-medium" title={log.message}>{log.message}</td>
                      <td className="p-4">
                        <span className={`inline-block text-[10px] px-2.5 py-0.5 font-bold rounded-lg uppercase tracking-wider ${getStatusChipStyle(log.status)}`}>
                          {log.status || "success"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {historyTab === "credits" && (
            <>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Order Token ID</th>
                  <th className="p-4">Requested Allocation</th>
                  <th className="p-4">Payment Reference / Remarks</th>
                  <th className="p-4">Approval Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium tracking-wide">
                      No balance acquisition manifests recorded under this account wallet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-gray-500 tracking-tight whitespace-nowrap">{log.created_at}</td>
                      <td className="p-4 font-mono font-bold text-gray-600">#CR-{log.id}</td>
                      <td className="p-4 font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 tracking-wide whitespace-nowrap text-sm font-mono">{log.requested_credits} Credits</td>
                      <td className="p-4 font-medium max-w-xs truncate text-gray-500" title={log.payment_reference}>{log.payment_reference}</td>
                      <td className="p-4">
                        <span className={`inline-block text-[10px] px-2.5 py-0.5 font-bold rounded-lg uppercase tracking-wider ${getStatusChipStyle(log.status)}`}>
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