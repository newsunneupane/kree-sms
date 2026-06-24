"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard({ admin, logout }) {
  const [requests, setRequests] = useState([]);
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

  useEffect(() => { 
    if (admin?.id) {
      loadRequests(); 
      fetchBalances();
    }
  }, [admin]);

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
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse";
      default:
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* ADMINISTRATIVE DASHBOARD TOP COMMAND NAV */}
        <header className="bg-slate-900/40 backdrop-blur-md border border-slate-900/80 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20">
              कृ
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 font-mono uppercase">
                KREESMS ADMIN
              </h1>
              <p className="text-[11px] tracking-wide text-slate-400 mt-0.5">
                Master Gateway Operator Console ({admin?.name})
              </p>
            </div>
          </div>
          <button 
            onClick={logout} 
            type="button"
            className="bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-transparent text-rose-400 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all duration-150 active:scale-[0.98] self-stretch sm:self-auto text-center"
          >
            🚪 Close System Console
          </button>
        </header>

        {/* THREE-COLUMN DISPLAY: MONITORS & REFILL INTERFACE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CARD 1: UNALLOCATED POOL */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[140px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 font-mono">Available Stock Pool</span>
                <button 
                  onClick={fetchBalances}
                  disabled={isSyncing}
                  type="button"
                  className={`text-xs p-1.5 rounded-lg bg-slate-950/40 border border-slate-900/60 hover:text-slate-200 transition-colors ${isSyncing ? "animate-spin text-violet-400" : "text-slate-500"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
                  </svg>
                </button>
              </div>
              <h4 className="text-sm font-bold text-slate-300 mt-2">Unallocated System Balance</h4>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                {unallocatedBalance !== null ? unallocatedBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Units Free</span>
            </div>
          </div>

          {/* CARD 2: REAL-TIME GATEWAY POOL */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">Live External Pool</span>
              <h4 className="text-sm font-bold text-slate-300 mt-2">Aakash API Gateway Balance</h4>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
                {gatewayBalance !== null ? gatewayBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">On Server</span>
            </div>
          </div>

          {/* CARD 3: STOCK REFILL CONSOLE */}
          <div className="bg-slate-900/20 border border-slate-900/80 p-5 rounded-2xl shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">Inventory Refill Console</span>
            <h4 className="text-sm font-bold text-slate-300 mt-1">Load Free Distribution Stock</h4>
            
            <form onSubmit={handleSystemTopUp} className="mt-3 flex items-center gap-2">
              <input 
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount e.g. 5000"
                disabled={isSubmittingTopUp}
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-800 text-slate-100 bg-slate-950/50 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-600"
                required
              />
              <button
                type="submit"
                disabled={isSubmittingTopUp}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                ➕ Add Stock
              </button>
            </form>
          </div>

        </div>

        {/* SYSTEM FEEDBACK BANNER ALERTS */}
        {msg && (
          <div className="p-4 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <span className="text-base">⚙️</span>
              <span>{msg}</span>
            </div>
            <button type="button" onClick={() => setMsg("")} className="text-slate-500 hover:text-slate-300 transition-colors p-1 font-bold">✕</button>
          </div>
        )}

        {/* REQUEST MANAGEMENT MONITOR PANEL */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="mb-5">
            <h3 className="text-base font-extrabold text-slate-200 tracking-tight flex items-center space-x-2">
              <span>💳</span>
              <span>Credit Load Allocation Requests</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Approve incoming deposit assertions or audit chronological accounting records.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/25">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Requested Units</th>
                  <th className="p-4">Reference Log</th>
                  <th className="p-4">Current Status</th>
                  <th className="p-4 text-right">Actions Console</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-900/60 text-slate-300">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500 font-medium tracking-wide">
                      No credit acquisition manifests currently pending or archived inside system storage.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-100">{r.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">{r.email}</div>
                      </td>
                      <td className="p-4 font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 font-mono tracking-wide text-sm">
                        {r.requested_credits} <span className="text-[10px] text-slate-500 font-bold font-sans">SMS</span>
                      </td>
                      <td className="p-4 font-medium max-w-xs truncate text-slate-400" title={r.payment_reference}>
                        {r.payment_reference}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block text-[10px] px-2.5 py-0.5 font-bold rounded-lg uppercase tracking-wider ${getStatusChipStyle(r.status)}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {r.status?.toLowerCase() === 'pending' ? (
                          <button 
                            onClick={() => approveRequest(r.id)} 
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold tracking-wide py-2 px-3 rounded-xl shadow-lg shadow-emerald-600/10 transition-all whitespace-nowrap active:scale-[0.97]"
                          >
                            ✓ Approve Deposit
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 pr-2 italic tracking-wide">Settled Ledger</span>
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
    </div>
  );
}