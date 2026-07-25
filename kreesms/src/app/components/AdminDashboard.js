"use client";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminDashboard({ admin, logout }) {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [gatewayBalance, setGatewayBalance] = useState(null);
  const [unallocatedBalance, setUnallocatedBalance] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const fetchBalances = async () => {
    if (!admin?.id) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${baseUrl}/sms-backend/admin.php?action=get_gateway_balance&admin_id=${admin.id}`);
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
      const res = await fetch(`${baseUrl}/sms-backend/admin.php?action=get_requests&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } catch (err) {
      console.error("Failed to synchronize administration requests manifest:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${baseUrl}/sms-backend/admin.php?action=get_users&admin_id=${admin.id}`);
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
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
    setMsg("Updating stock inventory ledger...");
    
    try {
      const res = await fetch(`${baseUrl}/sms-backend/admin.php`, {
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
      const res = await fetch(`${baseUrl}/sms-backend/admin.php`, {
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
            <h1 className="text-lg font-black tracking-wider text-blue-400 font-mono uppercase">KREESMS ADMIN</h1>
            <p className="text-[11px] tracking-wide text-gray-400 mt-0.5">Master Gateway Node Operator Workspace ({admin?.name})</p>
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
              🚪 Close System Console
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 font-mono">Available Stock Pool</span>
                <button 
                  onClick={fetchBalances}
                  disabled={isSyncing}
                  type="button"
                  className={`text-xs p-1 rounded-md hover:bg-gray-100 ${isSyncing ? "animate-spin text-blue-500" : "text-gray-400"}`}
                >
                  🔄
                </button>
              </div>
              <h4 className="text-sm font-extrabold text-gray-700 mt-2">Unallocated System Balance</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Increases via form below; decreases when granted to users.</p>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-600">
                {unallocatedBalance !== null ? unallocatedBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[11px] font-bold text-gray-400 ml-1.5 uppercase tracking-wide">Units Free</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-mono">Live External Pool</span>
              <h4 className="text-sm font-extrabold text-gray-700 mt-2">Aakash API Gateway Balance</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Deducts only when live users physically fire out outbound SMS texts.</p>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                {gatewayBalance !== null ? gatewayBalance.toLocaleString() : "•••"}
              </span>
              <span className="text-[11px] font-bold text-gray-400 ml-1.5 uppercase tracking-wide">Units on Server</span>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-mono">Inventory Refill Console</span>
            <h4 className="text-sm font-extrabold text-gray-800 mt-2">Load Free Distribution Stock</h4>
            
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
                ➕ Add Stock
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
              <span>Registered Users</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">All registered accounts on the platform.</p>
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
                      No users registered yet.
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
                      <td className="p-3.5 font-black font-mono text-emerald-600">{u.sms_balance}</td>
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
              <span>Credit Load Allocation Requests</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Approve incoming deposit assertions or audit chronological accounting records.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">User Details</th>
                  <th className="p-3.5">Requested Units</th>
                  <th className="p-3.5">Reference Log</th>
                  <th className="p-3.5">Current Status</th>
                  <th className="p-3.5 text-right">Actions Console</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium font-sans">
                      No credit acquisition manifests currently pending or archived inside system storage.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{r.name}</div>
                        <div className="text-[10px] text-gray-400 font-medium tracking-tight mt-0.5">{r.email}</div>
                      </td>
                      <td className="p-3.5 font-black text-violet-600 font-mono tracking-wide text-sm">{r.requested_credits} <span className="text-[10px] text-gray-400 font-bold font-sans">SMS</span></td>
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
    </div>
  );
}