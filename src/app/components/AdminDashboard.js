"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard({ admin, logout }) {
  const [requests, setRequests] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]); // 🚀 NEW VECTOR FOR ONBOARDING REQUESTS
  
  const [gatewayBalance, setGatewayBalance] = useState(null);
  const [unallocatedBalance, setUnallocatedBalance] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  const fetchBalances = async () => {
    if (!admin?.id) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`http://127.0.0.1/sms-backend/admin.php?action=get_gateway_balance&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) {
        setGatewayBalance(data.gateway_balance);
        setUnallocatedBalance(data.unallocated_balance);
      }
    } catch (err) {
      console.error("Failed to connect with live balance tracker:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch(`http://127.0.0.1/sms-backend/admin.php?action=get_requests&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } catch (err) {
      console.error("Failed to synchronize administration requests manifest:", err);
    }
  };

  // 🚀 NEW FUNCTION: FETCH PENDING REGISTRATION ROWS FROM STAGING
  const loadPendingRegistrations = async () => {
    try {
      const res = await fetch(`http://127.0.0.1/sms-backend/admin.php?action=get_pending_registrations&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) setPendingUsers(data.pending_users || []);
    } catch (err) {
      console.error("Failed to read pending registrations staging list:", err);
    }
  };

  useEffect(() => { 
    if (admin?.id) {
      loadRequests(); 
      loadPendingRegistrations(); // Instantly pull unverified queue items down on screen start
      fetchBalances();
    }
  }, [admin]);

  // 🚀 NEW FUNCTION: APPROVE USER REGISTRATION TRANSITION ROUTINE
  const approveNewUser = async (id) => {
    setMsg("Authorizing registration profile credentials row...");
    try {
      const res = await fetch("http://127.0.0.1/sms-backend/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_new_user", admin_id: admin.id, registration_id: id }),
      });
      const data = await res.json();
      setMsg(data.message);
      
      loadPendingRegistrations(); // Refresh staging grid lists
    } catch (err) {
      setMsg("Failed to broadcast whitelist authorization instruction packets.");
    }
  };

  const handleSystemTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || parseInt(topUpAmount) <= 0) return;
    
    setIsSubmittingTopUp(true);
    setMsg("Updating stock inventory ledger...");
    
    try {
      const res = await fetch("http://127.0.0.1/sms-backend/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "add_gateway_credit", 
          admin_id: admin.id, 
          credits: parseInt(topUpAmount) 
        }),
      });
      const data = await res.json();
      setMsg(data.message);
      if(data.success) {
        setTopUpAmount("");
        fetchBalances(); 
      }
    } catch (err) {
      setMsg("Failed to communicate with configuration database.");
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const approveRequest = async (id) => {
    setMsg("Processing confirmation...");
    try {
      const res = await fetch("http://127.0.0.1/sms-backend/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_request", admin_id: admin.id, request_id: id }),
      });
      const data = await res.json();
      setMsg(data.message);
      
      loadRequests();
      fetchBalances();
    } catch (err) {
      setMsg("Critical network failure handling transaction authorization request.");
    }
  };

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

      {/* THREE-COLUMN DISPLAY: MONITORS & REFILL INTERFACE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: UNALLOCATED POOL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 font-mono">Available Stock Pool</span>
              <button 
                onClick={fetchBalances}
                disabled={isSyncing}
                type="button"
                className={`text-xs p-1 rounded-md hover:bg-slate-100 ${isSyncing ? "animate-spin text-blue-500" : "text-slate-400"}`}
              >
                🔄
              </button>
            </div>
            <h4 className="text-sm font-extrabold text-slate-700 mt-2">Unallocated System Balance</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Increases via form below; decreases when granted to users.</p>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600">
              {unallocatedBalance !== null ? unallocatedBalance.toLocaleString() : "•••"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 ml-1.5 uppercase tracking-wide">Units Free</span>
          </div>
        </div>

        {/* CARD 2: REAL-TIME GATEWAY POOL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-mono">Live External Pool</span>
            <h4 className="text-sm font-extrabold text-slate-700 mt-2">Aakash API Gateway Balance</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Deducts only when live users physically fire out outbound SMS texts.</p>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
              {gatewayBalance !== null ? gatewayBalance.toLocaleString() : "•••"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 ml-1.5 uppercase tracking-wide">Units on Server</span>
          </div>
        </div>

        {/* CARD 3: STOCK REFILL CONSOLE */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">Inventory Refill Console</span>
          <h4 className="text-sm font-extrabold text-slate-800 mt-2">Load Free Distribution Stock</h4>
          
          <form onSubmit={handleSystemTopUp} className="mt-3 flex items-center gap-2">
            <input 
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="Add e.g. 5000"
              disabled={isSubmittingTopUp}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
              required
            />
            <button
              type="submit"
              disabled={isSubmittingTopUp}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              ➕ Add Stock
            </button>
          </form>
        </div>

      </div>

      {/* SYSTEM FEEDBACK BANNER ALERTS */}
      {msg && (
        <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <span>⚙️</span>
            <span>{msg}</span>
          </div>
          <button type="button" onClick={() => setMsg("")} className="text-amber-400 font-bold ml-2">✕</button>
        </div>
      )}

      {/* 🚀 NEW SECTION LAYOUT: PENDING REGISTRATION AUDITING SYSTEM PANEL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
            <span>🛡️</span>
            <span>Pending Account Signups Awaiting Verification</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Review users who have successfully verified their email OTP codes and authorize their login profiles.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Applicant Details</th>
                <th className="p-3.5">Email Identity</th>
                <th className="p-3.5">Submission Timestamp</th>
                <th className="p-3.5 text-right">Whitelisting Operations</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
              {pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 font-medium font-sans italic">
                    No onboarding applications currently waiting inside the verification staging queue.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900">{u.name}</td>
                    <td className="p-3.5 font-mono text-blue-600 font-semibold">{u.email}</td>
                    <td className="p-3.5 text-gray-400 font-medium">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      <button 
                        onClick={() => approveNewUser(u.id)} 
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-[11px] font-black tracking-wide py-2 px-3 rounded-lg shadow-sm transition-all whitespace-nowrap"
                      >
                        ⚡ Authorize & Onboard User
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <th className="p-3.5">Reference Log</th>
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
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-[11px] font-black tracking-wide py-2 px-3 rounded-lg shadow-sm transition-all whitespace-nowrap"
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