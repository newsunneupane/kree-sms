"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import SingleSms from "./user/SingleSms";
import BulkSms from "./user/BulkSms";
import DynamicSms from "./user/DynamicSms";
import CreditTransfer from "./user/CreditTransfer";
import SmsHistory from "./user/SmsHistory";
import ScheduleSms from "./user/ScheduleSms";
import Phonebook from "./user/Phonebook";
import { Notice, detectNoticeTone } from "./ui/ui";
import {
  IconChat, IconBulk, IconZap, IconClock, IconBook, IconCard, IconHistory, IconLogout, IconMenu, IconX,
} from "./ui/Icons";
import { api } from "../../lib/client-api";

export default function UserDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("single");
  const [balance, setBalance] = useState(user.sms_balance);
  const [status, setStatus] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const syncBalance = async () => {
    try {
      const data = await api("/api/user/profile");
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
    setStatus(`Sample template downloaded: ${filename}`);
  };

  const navItems = [
    { id: "single", label: "Single SMS", Icon: IconChat },
    { id: "bulk", label: "Bulk SMS", Icon: IconBulk },
    { id: "dynamic", label: "Dynamic SMS", Icon: IconZap },
    { id: "schedule", label: "Scheduled", Icon: IconClock },
    { id: "phonebook", label: "Phonebook", Icon: IconBook },
    { id: "credit", label: "Buy Credits", Icon: IconCard },
    { id: "history", label: "History", Icon: IconHistory },
  ];

  const activeLabel = navItems.find((n) => n.id === activeTab)?.label || "";

  const renderSidebar = (onNavigate) => (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-violet-600/30">
            कृ
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-widest text-white font-mono leading-none">KREESMS</p>
            <p className="text-[10px] tracking-[0.18em] text-slate-400 font-semibold uppercase mt-1">SMS Gateway</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto nice-scroll p-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Messaging</p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setStatus("");
                onNavigate?.();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-semibold rounded-xl transition-all ${
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ItemIcon className={isActive ? "text-white" : "text-slate-500"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Signed in as</p>
          <p className="text-[13px] font-bold text-white truncate mt-0.5">{user.name}</p>
        </div>
        <button
          onClick={logout}
          type="button"
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-rose-600 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl transition-all border border-white/10 hover:border-transparent text-[13px]"
        >
          <IconLogout />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden">
      <aside className="hidden lg:flex w-[264px] bg-slate-900 flex-col shrink-0 h-full">
        {renderSidebar()}
      </aside>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-full max-w-xs bg-slate-900 h-full shadow-2xl animate-fade-in">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <IconX />
            </button>
            {renderSidebar(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-7 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Workspace</p>
              <h1 className="text-[15px] font-bold text-slate-900 truncate">{activeLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-700 font-semibold">
                <span className="font-mono font-bold text-[14px]">{balance}</span> credits
              </span>
            </div>
            <div className="sm:hidden px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-700">
              {balance}
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
              {(user.name || "?").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto nice-scroll p-4 sm:p-7">
          <div className="max-w-5xl mx-auto">
            {status && (
              <div className="mb-5">
                <Notice tone={detectNoticeTone(status)} onDismiss={() => setStatus("")}>{status}</Notice>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
              {activeTab === "single" && <SingleSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} />}
              {activeTab === "bulk" && <BulkSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} downloadSample={downloadSample} />}
              {activeTab === "dynamic" && <DynamicSms userId={user.id} setStatus={setStatus} syncBalance={syncBalance} downloadSample={downloadSample} />}
              {activeTab === "schedule" && <ScheduleSms userId={user.id} setStatus={setStatus} />}
              {activeTab === "phonebook" && <Phonebook userId={user.id} setStatus={setStatus} />}
              {activeTab === "credit" && <CreditTransfer userId={user.id} setStatus={setStatus} />}
              {activeTab === "history" && <SmsHistory userId={user.id} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
