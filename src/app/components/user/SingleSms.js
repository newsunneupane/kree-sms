"use client";
import { useState } from "react";

export default function SingleSms({ userId, setStatus, syncBalance }) {
  const [singleData, setSingleData] = useState({ to: "", message: "" });
  const [loading, setLoading] = useState(false);

  // Strict 1 Credit = 160 Characters multiplication metric formula calculation
  const charCount = singleData.message.length;
  const creditCost = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Routing Packet streams...");

    try {
      const res = await fetch("http://127.0.0.1/sms-backend/user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_sms",
          sms_type: "single",
          user_id: userId,
          to: singleData.to,
          message: singleData.message
        }),
      });
      
      const rawText = await res.text();
      
      if (!rawText || rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
        setStatus("Server error: Received a non-JSON webpage response. Check your db.php API endpoints.");
        setLoading(false);
        return;
      }

      const data = JSON.parse(rawText);
      setStatus(data.message);
      
      if (data.success) {
        setSingleData({ to: "", message: "" });
        e.target.reset();
      }
    } catch (err) {
      setStatus("An error occurred during communication with the server.");
      console.error("Communication failure details:", err);
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-2xl bg-slate-900/10 border border-slate-900 rounded-2xl p-2 sm:p-4 transition-all duration-300 mx-auto lg:mx-0">
      
      {/* SECTION HEADER */}
      <div className="mb-6 pl-1">
        <h3 className="text-lg font-bold text-slate-200 tracking-tight flex items-center space-x-2.5">
          <span className="filter drop-shadow">💬</span>
          <span>Single SMS </span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Fire a standalone transmission payload instantly to any active mobile phone node network.</p>
      </div>
      
      {/* SUBMISSION DISPATCH FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Destination Phone Number</label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-500 text-xs font-bold tracking-wider font-mono">+977</span>
            </div>
            <input
              type="text" 
              placeholder="98XXXXXXXX" 
              required
              value={singleData.to}
              className="w-full pl-16 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl text-xs font-medium font-mono focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-600"
              onChange={(e) => setSingleData({ ...singleData, to: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 ml-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">SMS Message Core Text</label>
            
            {/* Metrics chip tracking panel highlighting live credit consumption bounds */}
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
              creditCost > 1 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-950/20' 
                : 'bg-slate-950/40 text-slate-400 border-slate-800'
            }`}>
              <span className="font-medium">{charCount} Chars</span>
              <span className="text-slate-700 mx-1.5">•</span>
              <span>Cost: <strong className="font-extrabold font-mono text-xs">{creditCost}</strong> {creditCost === 1 ? 'Credit' : 'Credits'}</span>
            </span>
          </div>
          
          <textarea
            placeholder="Type message text parameters here..." 
            required 
            rows="5"
            value={singleData.message}
            className="w-full p-4 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-xs leading-relaxed transition-all placeholder:text-slate-600 resize-none"
            onChange={(e) => setSingleData({ ...singleData, message: e.target.value })}
          />
        </div>

        {/* ORDER INITIATOR SUBMIT CONTROLLER */}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3.5 px-4 rounded-xl font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center space-x-2"
        >
          <span className="text-sm">{loading ? "⚡" : "🚀"}</span>
          <span>{loading ? "Routing Packet Streams..." : `Dispatch Text Payload (${creditCost} Cr.)`}</span>
        </button>
      </form>
    </div>
  );
}