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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Controls mobile drawer state

  const syncBalance = async () => {
    try {
      const res = await fetch(`http://localhost/sms-backend/user.php?action=get_profile&user_id=${user.id}`);
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
    { id: "single", label: "Single SMS Engine", icon: "💬" },
    { id: "bulk", label: "Bulk Mass Blast", icon: "📁" },
    { id: "dynamic", label: "Dynamic Campaign", icon: "⚡" },
    { id: "schedule", label: "Schedule Outbound Queue", icon: "⏰" },
    { id: "phonebook", label: "Phonebook Segments", icon: "👥" }, 
    { id: "credit", label: "Request Balance Load", icon: "💳" },
    { id: "history", label: "Outbound Reports Logs", icon: "📊" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="p-6 border-b border-slate-800 flex flex-col">
          <h2 className="text-xl font-black tracking-wider text-blue-400 font-mono">KREESMS</h2>
          <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase mt-0.5">SaaS Workspace</span>
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
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ease-in-out ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <button 
          onClick={logout} 
          type="button" 
          className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-200 border border-red-500/20 hover:border-transparent text-sm"
        >
          <span>🚪</span>
          <span>Exit Account Workspace</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      
      {/* 1. DESKTOP STABLE SIDEBAR VIEW LAYER */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-100 flex-col flex-shrink-0 h-full shadow-2xl border-r border-slate-800 z-20">
        <SidebarContent />
      </aside>

      {/* 2. RESPONSIVE MOBILE ACCESSIBILITY OVERLAY SIDE-DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop screen filter */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu core body layout drawer */}
          <aside className="relative flex flex-col w-full max-w-xs bg-slate-900 text-slate-100 h-full shadow-2xl z-10 animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 3. WORKING VIEW CANVAS GRID WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* TOP SYSTEM NAV HEADER PROFILE MONITOR */}
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Drawer Menu Toggle Switch */}
            <button 
              type="button" 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
            >
              ☰
            </button>
            <div className="hidden sm:block">
              <h1 className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Authorized Profiler Identity</h1>
              <p className="text-sm font-black text-gray-800">{user.name}</p>
            </div>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-2xl flex items-center space-x-2 shadow-sm shadow-emerald-100/40">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-emerald-700 font-bold">Balance: <span className="text-sm font-black text-emerald-900">{balance}</span> Credits</span>
          </div>
        </header>

        {/* WORKSPACE APP MOUNT POINT GRID CANVAS */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {status && (
            <div className="p-4 mb-6 bg-blue-50/80 text-blue-800 border border-blue-100 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <span>ℹ️</span>
                <span>{status}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setStatus("")} 
                className="text-blue-400 hover:text-blue-600 font-bold ml-2 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* PAGE MOUNT LAYOUT ROUTER CONTROLLER */}
          <div className="animate-fade-in">
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