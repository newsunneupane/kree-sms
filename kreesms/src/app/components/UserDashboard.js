"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

// Import individual modular section pages
import SingleSms from "./user/SingleSms";
import BulkSms from "./user/BulkSms";
import DynamicSms from "./user/DynamicSms";
import CreditTransfer from "./user/CreditTransfer";
import SmsHistory from "./user/SmsHistory";
import ScheduleSms from "./user/ScheduleSms";
import Phonebook from "./user/Phonebook";

export default function UserDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("single"); 
  const [balance, setBalance] = useState(user.sms_balance);
  const [status, setStatus] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

  const syncBalance = async () => {
    try {
      const res = await fetch(`${baseUrl}/sms-backend/user.php?action=get_profile&user_id=${user.id}`);
      const data = await res.json();
      if (data.success) setBalance(data.data.sms_balance);
    } catch (err) {
      console.error("Failed to sync balance:", err);
    }
  };

  useEffect(() => {
    syncBalance();
  }, []);

  const downloadSample = (type) => {
    let data = [];
    let filename = "";

    if (type === "bulk") {
      data = [
        { firstname: "Saurav", lastname: "Kunwar", mobile: "9843642827" },
        { firstname: "Vikash", lastname: "Lamichanne", mobile: "9841722659" }
      ];
      filename = "sample21.xlsx";
    } else {
      data = [
        { mobile: "9840000000", message: "Your custom message here." },
        { mobile: "9818000000", message: "Another unique message copy here." }
      ];
      filename = "dynamic1.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filename);
    setStatus(`Downloaded template folder array artifact: ${filename}`);
  };

  const navItems = [
    { id: "single", label: "Single SMS ", icon: "💬" },
    { id: "bulk", label: "Bulk SMS", icon: "📁" },
    { id: "dynamic", label: "Dynamic SMS", icon: "⚡" },
    { id: "schedule", label: "Scheduled SMS", icon: "⏰" },
    { id: "phonebook", label: "Phonebook and Groups", icon: "👥" }, 
    { id: "credit", label: "Request Balance Load", icon: "💳" },
    { id: "history", label: "Reports", icon: "📊" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-slate-950">
      <div>
        <div className="p-6 border-b border-slate-900 flex flex-col gap-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
              कृ
            </div>
            <h2 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 font-mono">
              KREESMS
            </h2>
          </div>
          <span className="text-[10px] tracking-widest text-slate-500 font-bold uppercase mt-1">
            SMS Gateway Portal
          </span>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { 
                  setActiveTab(item.id); 
                  setStatus(""); 
                  setMobileMenuOpen(false); 
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/15" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <span className="text-base filter drop-shadow">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-900 bg-slate-950/60">
        <button 
          onClick={logout} 
          type="button" 
          className="w-full flex items-center justify-center space-x-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-150 border border-rose-500/10 hover:border-transparent text-sm active:scale-[0.98]"
        >
          <span>🚪</span>
          <span>Exit Workspace</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />

      {/* 1. DESKTOP STABLE SIDEBAR VIEW LAYER */}
      <aside className="hidden lg:flex w-64 bg-slate-950 text-slate-100 flex-col flex-shrink-0 h-full border-r border-slate-900/60 z-20">
        <SidebarContent />
      </aside>

      {/* 2. RESPONSIVE MOBILE ACCESSIBILITY OVERLAY SIDE-DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-full max-w-xs bg-slate-950 text-slate-100 h-full shadow-2xl z-10 border-r border-slate-900">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 3. WORKING VIEW CANVAS GRID WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
        
        {/* TOP SYSTEM NAV HEADER PROFILE MONITOR */}
        <header className="bg-slate-950/40 backdrop-blur-md border-b border-slate-900/80 h-16 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10">
          <div className="flex items-center space-x-3">
            <button 
              type="button" 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-900 focus:outline-none transition-colors border border-slate-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Authorized Identity</h1>
              <p className="text-sm font-bold text-slate-200 uppercase">{user.name}</p>
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-xl flex items-center space-x-2 shadow-sm shadow-emerald-950/20">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-semibold tracking-wide">
              Balance: <span className="text-sm font-black text-emerald-300">{balance}</span> Credits
            </span>
          </div>
        </header>

        {/* WORKSPACE APP MOUNT POINT GRID CANVAS */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {status && (
            <div className="p-4 mb-6 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg shadow-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <span className="text-base">✨</span>
                <span>{status}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setStatus("")} 
                className="text-slate-500 hover:text-slate-300 font-bold ml-2 transition-colors p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* PAGE MOUNT LAYOUT ROUTER CONTROLLER */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
            {activeTab === "single" && <SingleSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} />}
            {activeTab === "bulk" && <BulkSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} downloadSample={downloadSample} />}
            {activeTab === "dynamic" && <DynamicSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} downloadSample={downloadSample} />}
            {activeTab === "schedule" && <ScheduleSms userId={user.id} setStatus={setStatus} />}
            {activeTab === "phonebook" && <Phonebook userId={user.id} setStatus={setStatus} />}
            {activeTab === "credit" && <CreditTransfer userId={user.id} setStatus={setStatus} />}
            {activeTab === "history" && <SmsHistory userId={user.id} />}
          </div>
        </main>
      </div>
    </div>
  );
}