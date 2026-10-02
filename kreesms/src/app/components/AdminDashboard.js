"use client";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { api } from "../../lib/client-api";
import ApiDashboard from "./admin/ApiDashboard";

export default function AdminDashboard({ admin, logout }) {
  const [tab, setTab] = useState("overview");
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [gatewayBalance, setGatewayBalance] = useState(null);
  const [unallocatedBalance, setUnallocatedBalance] = useState(null);
  const [balanceLive, setBalanceLive] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const fetchBalances = async () => {
    if (!admin?.id) return;
    setIsSyncing(true);
    try {
      const data = await api("/api/admin/gateway-balance");
      if (data.success) {
        setGatewayBalance(data.gateway_balance);
        setUnallocatedBalance(data.unallocated_balance);
        setBalanceLive(data.live === true);
      }
    } catch (err) {
      console.error("Could not load balances:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await api("/api/admin/requests");
      if (data.success) setRequests(data.data || []);
    } catch (err) {
      console.error("Could not load credit requests:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api("/api/admin/users");
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error("Could not load users:", err);
    }
  };

  useEffect(() => { 
    if (admin?.id) {
      loadRequests(); 
      loadUsers();
      fetchBalances();
    }
  }, [admin]);

  const handleSystemTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || parseInt(topUpAmount) <= 0) return;
    
    setIsSubmittingTopUp(true);
    setMsg("Adding credits...");
    
    try {
      const data = await api("/api/admin/add-credit", {
        method: "POST",
        body: { credits: parseInt(topUpAmount) },
      });
      setMsg(data.message);
      if(data.success) {
        setTopUpAmount("");
        fetchBalances(); 
      }
    } catch (err) {
      setMsg("Could not update. Please try again.");
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const approveRequest = async (id) => {
    setMsg("Approving...");
    try {
      const data = await api("/api/admin/approve-request", {
        method: "POST",
        body: { request_id: id },
      });
      setMsg(data.message);
      
      loadRequests();
      fetchBalances();
    } catch (err) {
      setMsg("Approval failed. Please try again.");
    }
  };

  const getStatusChipStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse";
      default:
        return "bg-rose-50 text-rose-700 border border-rose-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-all duration-300">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 text-gray-800 transition-all duration-300">
        
        <header className="bg-gray-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg z-10">
          <div>
            <h1 className="text-lg font-black tracking-wider text-blue-400 font-mono uppercase">KreeSMS Admin</h1>
            <p className="text-[11px] tracking-wide text-gray-400 mt-0.5">Signed in as {admin?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={toggleTheme}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-black tracking-wide py-2.5 px-4 rounded-xl transition-all shadow-md self-stretch sm:self-auto"
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button 
              onClick={logout} 
              type="button"
              className="bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-xs font-black tracking-wide py-2.5 px-4 rounded-xl transition-all shadow-md shadow-red-500/10 self-stretch sm:self-auto text-center"
            >
              🚪 Log out
            </button>
          </div>
        </header>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`text-xs font-black tracking-wide py-2.5 px-5 rounded-xl transition-all ${tab === "overview" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
          >
            📊 Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("api")}
            className={`text-xs font-black tracking-wide py-2.5 px-5 rounded-xl transition-all ${tab === "api" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
          >
            🔌 API Gateway
          </button>
        </div>

        {tab === "api" ? (
          <ApiDashboard />
        ) : (
        <>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 font-mono">System pool</span>
                <button 
                  onClick={fetchBalances}
                  disabled={isSyncing}
                  type="button"
                  className={`text-xs p-1 rounded-md hover:bg-gray-100 ${isSyncing ? "animate-spin text-blue-500" : "text-gray-400"}`}
                >
                  🔄
                </button>
              </div>
              <h4 className="text-sm font-extrabold text-gray-700 mt-2">Unallocated credits</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Topped up below; reduced when granted to users.</p>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600">
                {unallocatedBalance !== null ? unallocatedBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[11px] font-bold text-gray-400 ml-1.5 uppercase tracking-wide">credits available</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-mono">Aakash gateway</span>
              <h4 className="text-sm font-extrabold text-gray-700 mt-2">Gateway balance</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Live balance from Aakash, refreshed on every view.</p>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                {gatewayBalance !== null ? gatewayBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[11px] font-bold text-gray-400 ml-1.5 uppercase tracking-wide">credits</span>
              {balanceLive !== null && (
                <span className={`ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${balanceLive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                  {balanceLive ? "● Live from Aakash" : "● Cached"}
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-mono">Top up</span>
            <h4 className="text-sm font-extrabold text-gray-800 mt-2">Add credits to the pool</h4>
            
            <form onSubmit={handleSystemTopUp} className="mt-3 flex items-center gap-2">
              <input 
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Add e.g. 5000"
                disabled={isSubmittingTopUp}
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-violet-500 bg-white text-gray-900"
                required
              />
              <button
                type="submit"
                disabled={isSubmittingTopUp}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                ➕ Add
              </button>
            </form>
          </div>

        </div>

        {msg && (
          <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span>⚙️</span>
              <span>{msg}</span>
            </div>
            <button type="button" onClick={() => setMsg("")} className="text-amber-500 font-bold ml-2">✕</button>
          </div>
        )}

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
          <div className="mb-5">
            <h3 className="text-base font-extrabold text-gray-800 tracking-tight flex items-center space-x-2">
              <span>👥</span>
              <span>Users</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Everyone with an account.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Balance</th>
                  <th className="p-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans italic">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900">{u.name}</td>
                      <td className="p-3.5 font-mono text-violet-600 font-semibold">{u.email}</td>
                      <td className="p-3.5">
                        <span className={`inline-block text-[10px] px-2.5 py-0.5 font-black rounded-md uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-black font-mono text-emerald-600">{u.role === "admin" ? <span className="text-gray-300">—</span> : u.sms_balance}</td>
                      <td className="p-3.5 text-gray-500">{new Date(u.created_at).toLocaleString()}</td>
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
              <span>💳</span>
              <span>Credit requests</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Review and approve user top-up requests.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Credits</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans">
                      No credit requests.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{r.name}</div>
                        <div className="text-[10px] text-gray-400 font-medium tracking-tight mt-0.5">{r.email}</div>
                      </td>
                      <td className="p-3.5 font-black text-violet-600 font-mono tracking-wide text-sm">{r.requested_credits} <span className="text-[10px] text-gray-400 font-bold font-sans">credits</span></td>
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
                            ✓ Approve
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-gray-400 pr-2 italic">Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        </>
        )}

      </div>
    </div>
  );
}