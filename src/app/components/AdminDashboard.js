"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard({ admin, logout }) {
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState("");

  const loadRequests = async () => {
    try {
      const res = await fetch(`http://localhost/sms-backend/admin.php?action=get_requests&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } catch (err) {
      console.error("Failed to synchronize administration requests manifest:", err);
    }
  };

  useEffect(() => { 
    if (admin?.id) {
      loadRequests(); 
    }
  }, [admin]);

  const approveRequest = async (id) => {
    setMsg("Processing confirmation...");
    try {
      const res = await fetch("http://localhost/sms-backend/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_request", admin_id: admin.id, request_id: id }),
      });
      const data = await res.json();
      setMsg(data.message);
      loadRequests();
    } catch (err) {
      setMsg("Critical network failure handling transaction authorization request.");
    }
  };

  // Status mapping colors helper utility
  const getStatusChipStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100/60";
      case "pending":
        return "bg-amber-50 text-amber-700 border border-amber-100/80 animate-pulse";
      default:
        return "bg-rose-50 text-rose-700 border border-rose-100/60";
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 text-gray-800 transition-all duration-300">
      
      {/* ADMINISTRATIVE DASHBOARD TOP COMMAND NAV */}
      <header className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-slate-900/10 z-10">
        <div>
          <h1 className="text-lg font-black tracking-wider text-blue-400 font-mono uppercase">KREESMS ADMIN</h1>
          <p className="text-[11px] tracking-wide text-slate-400 mt-0.5">Master Gateway Node Operator Workspace ({admin?.name})</p>
        </div>
        <button 
          onClick={logout} 
          type="button"
          className="bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-xs font-black tracking-wide py-2.5 px-4 rounded-xl transition-all shadow-md shadow-red-500/10 self-stretch sm:self-auto text-center"
        >
          🚪 Close System Console
        </button>
      </header>

      {/* SYSTEM FEEDBACK BANNER ALERTS */}
      {msg && (
        <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <span>⚙️</span>
            <span>{msg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setMsg("")} 
            className="text-amber-400 hover:text-amber-600 font-bold ml-2 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* REQUEST MANAGEMENT MONITOR PANEL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
            <span>💳</span>
            <span>Credit Load Allocation Requests</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Approve incoming deposit assertions or audit chronological accounting records.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">User Details</th>
                <th className="p-3.5">Requested Units</th>
                <th className="p-3.5">Reference Log / Remarks</th>
                <th className="p-3.5">Current Status</th>
                <th className="p-3.5 text-right">Actions Console</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans">
                    No credit acquisition manifests currently pending or archived inside system storage.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{r.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium tracking-tight mt-0.5">{r.email}</div>
                    </td>
                    <td className="p-3.5 font-black text-blue-600 font-mono tracking-wide text-sm">{r.requested_credits} <span className="text-[10px] text-gray-400 font-bold font-sans">SMS</span></td>
                    <td className="p-3.5 font-medium max-w-xs truncate text-gray-500" title={r.payment_reference}>{r.payment_reference}</td>
                    <td className="p-3.5">
                      <span className={`inline-block text-[10px] px-2.5 py-0.5 font-black rounded-md uppercase tracking-wider ${getStatusChipStyle(r.status)}`}>
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {r.status?.toLowerCase() === 'pending' ? (
                        <button 
                          onClick={() => approveRequest(r.id)} 
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-[11px] font-black tracking-wide py-2 px-3 rounded-lg shadow-sm shadow-emerald-600/10 transition-all whitespace-nowrap"
                        >
                          ✓ Approve Deposit
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-gray-400 pr-2 italic">Settled Ledger</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}