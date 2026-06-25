"use client";
import { useState, useEffect } from "react";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

export default function ScheduleSms({ userId, setStatus }) {
  const [scheduleData, setScheduleData] = useState({ recipient: "", message: "", scheduled_at: "" });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  // FIXED: Implementation of the strict 1 Credit = 160 Characters calculation rule
  const charCount = scheduleData.message.length;
  const creditCost = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${baseUrl}/sms-backend/schedule.php?action=get_scheduled&user_id=${userId}`);
      if (!res.ok) {
        console.error("Server responded with a bad status code");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setQueue(data.data || []);
      }
    } catch (err) {
      console.error("Failed to parse calendar queue schedules framework:", err);
    }
  };

  useEffect(() => { 
    if (userId) {
      fetchQueue(); 
    }
  }, [userId]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/sms-backend/schedule.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_sms",
          user_id: userId,
          sms_type: "single",
          ...scheduleData
        })
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) {
        setScheduleData({ recipient: "", message: "", scheduled_at: "" });
        fetchQueue();
      }
    } catch (err) {
      setStatus("Error booking operational pipeline layout.");
    } finally { 
      setLoading(false); 
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "sent":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "failed":
        return "bg-rose-50 text-rose-700 border border-rose-100";
      default:
        return "bg-amber-50 text-amber-700 border border-amber-100/80 animate-pulse";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto transition-all duration-300">
      
      {/* COLUMN A: BOOKING TASK CARD PANEL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-fit">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
            <span>⏰</span>
            <span>Schedule SMS</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Queue individual transmission records for targeted delayed time releases.</p>
        </div>

        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Target Recipient</label>
            <input 
              type="text" 
              placeholder="e.g. 98XXXXXXXX" 
              required 
              value={scheduleData.recipient}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400 font-mono"
              onChange={e => setScheduleData({...scheduleData, recipient: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Execution Release Datetime</label>
            <input 
              type="datetime-local" 
              required 
              value={scheduleData.scheduled_at}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
              onChange={e => setScheduleData({...scheduleData, scheduled_at: e.target.value})} 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">SMS Message Body Text</label>
              
              {/* FIXED: Live Credit Analytics Widget added to match strict character rules */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                creditCost > 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-100 text-gray-500'
              }`}>
                <span>{charCount} Chars</span>
                <span className="text-gray-300">•</span>
                <span>Cost: <strong className="font-black text-xs">{creditCost}</strong> {creditCost === 1 ? 'Credit' : 'Credits'}</span>
              </span>
            </div>
            
            <textarea 
              placeholder="Type your message copy..." 
              required 
              rows="3" 
              value={scheduleData.message}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400 leading-relaxed"
              onChange={e => setScheduleData({...scheduleData, message: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
          >
            <span>{loading ? "⚡" : "📅"}</span>
            <span>{loading ? "Queueing Task..." : `Book Pipeline Task (${creditCost} Cr.)`}</span>
          </button>
        </form>
      </div>

      {/* COLUMN B: LIVE SCHEDULER MONITOR ARRAY PANELS */}
      <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
            <span>📊</span>
            <span>Pending Queues Ledger</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Live index log tracking scheduled future deployment operations.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Trigger Target Time</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Message Copy</th>
                <th className="p-3.5">Pipeline Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 font-medium font-sans">
                    No active timed campaigns registered inside calendar schemas.
                  </td>
                </tr>
              ) : (
                queue.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-mono text-xs font-bold text-indigo-600 tracking-tight">{item.scheduled_at}</td>
                    <td className="p-3.5 font-mono font-medium text-gray-600 tracking-wide">{item.recipient}</td>
                    <td className="p-3.5 truncate max-w-[160px] sm:max-w-xs text-gray-500" title={item.message}>{item.message}</td>
                    <td className="p-3.5">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${getStatusStyle(item.status)}`}>
                        {item.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}