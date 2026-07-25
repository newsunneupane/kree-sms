"use client";
import { useState } from "react";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CreditTransfer({ userId, setStatus }) {
  const [order, setOrder] = useState({ credits: "", reference: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Submitting order tracking details...");
    try {
      const res = await fetch(`${baseUrl}/sms-backend/user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_credits", user_id: userId, ...order }),
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) {
        setOrder({ credits: "", reference: "" }); 
      }
    } catch (err) {
      setStatus("Failed to submit purchase order details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl bg-gray-100 p-5 sm:p-8 rounded-2xl border border-gray-200 transition-all duration-300">
      
      <div className="mb-6">
        <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">Request Credit Top-Up</h3>
        <p className="text-xs text-gray-500 mt-1">Log offline deposit or mobile payment reference IDs here to trigger rapid administrator approval balances audit cycles.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="flex flex-col items-center justify-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
          <span className="text-base sm:text-xl">📱</span>
          <span className="text-[10px] font-bold text-emerald-800 mt-1">eSewa / Khalti</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
          <span className="text-base sm:text-xl">🏦</span>
          <span className="text-[10px] font-bold text-blue-800 mt-1">Bank Deposit</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-center">
          <span className="text-base sm:text-xl">🧾</span>
          <span className="text-[10px] font-bold text-purple-800 mt-1">Direct Slip</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Requested Credit Amount</label>
          <div className="relative rounded-xl shadow-sm">
            <input
              type="number" 
              placeholder="e.g., 5000" 
              required 
              min="1"
              value={order.credits}
              className="w-full p-3 border border-gray-300 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 focus:outline-none text-xs font-medium text-gray-900 transition-all bg-white placeholder-gray-400"
              onChange={(e) => setOrder({ ...order, credits: e.target.value })}
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xs font-bold font-mono">SMS</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Payment Reference Code / Remarks</label>
          <input
            type="text" 
            placeholder="e.g., Transaction ID string or depositor identity description" 
            required 
            value={order.reference}
            className="w-full p-3 border border-gray-300 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 focus:outline-none text-xs font-medium text-gray-900 transition-all bg-white placeholder-gray-400"
            onChange={(e) => setOrder({ ...order, reference: e.target.value })}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
        >
          <span>{loading ? "⚡" : "📩"}</span>
          <span>{loading ? "Submitting Request Packet..." : "Transmit Purchase Request Manifest"}</span>
        </button>
      </form>
    </div>
  );
}