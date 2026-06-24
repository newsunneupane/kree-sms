"use client";
import { useState } from "react";

export default function SingleSms({ userId, setStatus, syncBalance }) {
  const [singleData, setSingleData] = useState({ to: "", message: "" });
  const [loading, setLoading] = useState(false);

  // FIXED: Implementation of the strict 1 Credit = 160 Characters multiplication metric formula
  const charCount = singleData.message.length;
  const creditCost = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Routing Packet streams...");

    try {
      const res = await fetch("http://localhost/sms-backend/user.php", {
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
      const data = await res.json();
      setStatus(data.message);
      if (data.success) {
        setSingleData({ to: "", message: "" });
        e.target.reset();
      }
    } catch (err) {
      setStatus("An error occurred during communication.");
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-2xl bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 mx-auto lg:mx-0">
      
      {/* SECTION HEADER */}
      <div className="mb-6">
        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
          <span>💬</span>
          <span>Single SMS Dispatch</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">Fire a standalone transmission payload instantly to any active mobile phone node network.</p>
      </div>
      
      {/* SUBMISSION DISPATCH FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Destination Phone Number</label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xs font-bold tracking-wider font-mono">+977</span>
            </div>
            <input
              type="text" 
              placeholder="98XXXXXXXX" 
              required
              value={singleData.to}
              className="w-full pl-14 pr-3 py-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400 font-mono"
              onChange={(e) => setSingleData({ ...singleData, to: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">SMS Message Core Text</label>
            
            {/* FIXED: Re-engineered metrics chip tracking panel highlighting live credit consumption bounds */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              creditCost > 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-100 text-gray-500'
            }`}>
              <span>{charCount} Chars</span>
              <span className="text-gray-300">•</span>
              <span>Cost: <strong className="font-black text-xs">{creditCost}</strong> {creditCost === 1 ? 'Credit' : 'Credits'}</span>
            </span>
          </div>
          
          <textarea
            placeholder="Type message text parameters here..." 
            required 
            rows="4"
            value={singleData.message}
            className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-xs leading-relaxed text-gray-700 transition-all placeholder-gray-400 shadow-inner bg-gray-50/30"
            onChange={(e) => setSingleData({ ...singleData, message: e.target.value })}
          />
        </div>

        {/* ORDER INITIATOR SUBMIT CONTROLLER */}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
        >
          <span>{loading ? "⚡" : "🚀"}</span>
          <span>{loading ? "Routing Packet Streams..." : `Dispatch Text Payload (${creditCost} Cr.)`}</span>
        </button>
      </form>
    </div>
  );
}