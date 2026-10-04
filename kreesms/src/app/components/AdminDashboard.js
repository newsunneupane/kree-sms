"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/client-api";
import ApiDashboard from "./admin/ApiDashboard";
import { StatCard, StatusChip, DataTable, EmptyState, Notice, inputCls } from "./ui/ui";
import { IconLogout, IconRefresh, IconKey, IconChat, IconCard } from "./ui/Icons";

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
      if (data.success) {
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

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        <header className="bg-slate-900 text-white px-6 py-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-bold shadow-lg shadow-violet-600/30">
              कृ
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-widest font-mono">KREESMS ADMIN</h1>
              <p className="text-xs text-slate-400 mt-0.5">Signed in as {admin?.name}</p>
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

        <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: "overview", label: "Overview", Icon: IconChat },
            { id: "api", label: "API Gateway", Icon: IconKey },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 text-xs font-semibold py-2.5 px-5 rounded-lg transition-all ${
                tab === t.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "api" ? (
          <ApiDashboard onPoolChange={fetchBalances} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                eyebrow="System pool · Unallocated"
                value={unallocatedBalance !== null ? unallocatedBalance.toLocaleString() : "···"}
                valueClass="text-blue-700"
                hint="Topped up below; reduced when granted to users."
              />
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Aakash gateway · Live</p>
                  <button
                    onClick={fetchBalances}
                    disabled={isSyncing}
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                    aria-label="Refresh balances"
                  >
                    <IconRefresh spin={isSyncing} className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[28px] leading-8 font-bold font-mono tracking-tight mt-2 text-emerald-700">
                  {gatewayBalance !== null ? gatewayBalance.toLocaleString() : "···"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  credits{" "}
                  {balanceLive !== null && (
                    <span className={`ml-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${balanceLive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {balanceLive ? "Live" : "Cached"}
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Top up pool</p>
                <p className="text-[13px] font-bold text-slate-800 mt-2">Add credits to the system pool</p>
                <form onSubmit={handleSystemTopUp} className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    disabled={isSubmittingTopUp}
                    className={`${inputCls} !py-2.5 font-mono`}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingTopUp}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {msg && (
              <Notice tone="info" onDismiss={() => setMsg("")}>{msg}</Notice>
            )}

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-5">
                <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                  <IconChat className="w-4 h-4 text-slate-400" />
                  Users
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Everyone with an account.</p>
              </div>
              <DataTable headers={[{ label: "Name" }, { label: "Email" }, { label: "Role" }, { label: "Balance" }, { label: "Joined" }]}>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-0">
                      <EmptyState title="No users yet" subtitle="Approved registrations will appear here." />
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-violet-700">{u.email}</td>
                      <td className="px-4 py-3"><StatusChip value={u.role} tone={u.role === "admin" ? "brand" : undefined} /></td>
                      <td className="px-4 py-3 font-bold font-mono text-sm text-emerald-700">{u.role === "admin" ? <span className="text-slate-300">—</span> : u.sms_balance}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </DataTable>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-5">
                <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                  <IconCard className="w-4 h-4 text-slate-400" />
                  Credit requests
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Review and approve user top-up requests.</p>
              </div>
              <DataTable headers={[{ label: "User" }, { label: "Credits" }, { label: "Reference" }, { label: "Status" }, { label: "Action", align: "right" }]}>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-0">
                      <EmptyState title="No credit requests" subtitle="New top-up requests will appear here." />
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.name}</div>
                        <div className="text-[11px] text-slate-400">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-violet-700 font-mono whitespace-nowrap">{r.requested_credits} <span className="text-[10px] text-slate-400 font-sans font-semibold">credits</span></td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-xs text-slate-500" title={r.payment_reference}>{r.payment_reference}</td>
                      <td className="px-4 py-3"><StatusChip value={r.status || "pending"} /></td>
                      <td className="px-4 py-3 text-right">
                        {r.status?.toLowerCase() === "pending" ? (
                          <button
                            onClick={() => approveRequest(r.id)}
                            type="button"
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 px-3.5 rounded-lg transition-all whitespace-nowrap"
                          >
                            <span aria-hidden>✓</span> Approve
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </DataTable>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
