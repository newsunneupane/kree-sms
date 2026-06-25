"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BulkSms({ userId, setStatus, syncBalance, downloadSample }) {
  const [bulkMessage, setBulkMessage] = useState("");
  const [sourceType, setSourceType] = useState("file"); 
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scheduledAt, setScheduledAt] = useState(""); 
  const [loading, setLoading] = useState(false);

  // FIXED: Changed calculation metrics layout to match the strict 1 Credit per 160 Characters multiplication logic rule
  const charCount = bulkMessage.length;
  const creditCostPerRecipient = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${baseUrl}/sms-backend/phonebook.php?action=get_phonebook&user_id=${userId}`);
        const data = await res.json();
        if (data.success) setGroups(data.groups);
      } catch (err) { 
        console.error("Failed fetching contact segments:", err); 
      }
    };
    if (userId) fetchGroups();
  }, [userId]);

  const handleRemoveFile = () => {
    setUploadedFile(null);
    const fileInput = document.getElementById("campaignFileInput");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Compiling broadcast targets matrix payload...");

    try {
      let compiledCsvText = "mobile\n";

      if (sourceType === "file") {
        if (!uploadedFile) {
          setStatus("Please upload a sheet file first.");
          setLoading(false);
          return;
        }
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            jsonData.forEach((row) => {
              const phoneKey = Object.keys(row).find((k) => k.toLowerCase() === "mobile");
              if (phoneKey && row[phoneKey]) compiledCsvText += `${String(row[phoneKey]).trim()}\n`;
            });
            resolve();
          };
          reader.readAsArrayBuffer(uploadedFile);
        });
      } else {
        if (!selectedGroupId) {
          setStatus("Please select a target segment group.");
          setLoading(false);
          return;
        }
        compiledCsvText = `SYSTEM_GROUP_ID:${selectedGroupId}`;
      }

      const res = await fetch(`${baseUrl}/sms-backend/user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_sms",
          sms_type: "bulk",
          user_id: userId,
          csv_raw_text: compiledCsvText,
          global_message: bulkMessage,
          scheduled_at: scheduledAt 
        }),
      });
      const backendData = await res.json();
      setStatus(backendData.message);
      if (backendData.success) {
        setBulkMessage("");
        setScheduledAt("");
        handleRemoveFile();
      }
    } catch (err) {
      setStatus("An execution error crashed the transport line.");
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-3xl bg-red-100 p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300">
      
      {/* SECTION TITLE HEADER */}
      <div className="mb-6">
        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Bulk Mass Messaging</h3>
        <p className="text-xs text-gray-400 mt-1">Broadcast or schedule a single message outward to thousands of recipients seamlessly.</p>
      </div>
      
      {/* SEGMENT TOGGLE NAVIGATION */}
      <div className="flex bg-gray-100/80 p-1 rounded-xl items-center self-start w-full sm:w-fit mb-6 border border-gray-200/20">
        <button 
          type="button" 
          onClick={() => setSourceType("file")} 
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            sourceType === "file" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>📁</span>
          <span>Spreadsheet Upload</span>
        </button>
        <button 
          type="button" 
          onClick={() => setSourceType("group")} 
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            sourceType === "group" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>👥 Saved Phonebook Group</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* VIEW TYPE A: EXCEL SPREADSHEET DISK HANDLING */}
        {sourceType === "file" ? (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 gap-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-600">
                <span className="text-base">📋</span>
                <span>Requires column header name: <code className="bg-gray-200/60 font-mono px-1.5 py-0.5 rounded text-blue-600 font-bold">mobile</code></span>
              </div>
              <button 
                type="button" 
                onClick={() => downloadSample("bulk")} 
                className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center space-x-1 self-start sm:self-auto transition-colors"
              >
                <span>📥 Download Sample Template</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Upload Spreadsheet Data</label>
              <div className="relative group border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-4 bg-gray-50/50 transition-colors flex flex-col items-center justify-center min-h-[110px]">
                {!uploadedFile ? (
                  <>
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📤</span>
                    <span className="text-xs text-gray-500 font-medium">Click to pick your campaign spreadsheet format file</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Supports .csv, .xls, .xlsx</span>
                    <input 
                      id="campaignFileInput" 
                      type="file" 
                      required
                      accept=".csv, .xls, .xlsx" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => setUploadedFile(e.target.files[0])} 
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full bg-white border border-gray-100 p-3 rounded-xl shadow-sm animate-fade-in">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-xl">📊</span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-800 truncate">{uploadedFile.name}</p>
                        <p className="text-[10px] text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveFile} 
                      className="text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors ml-2"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW TYPE B: DATABASE PHONBOOK SELECTOR MAPPING */
          <div className="animate-fade-in">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Target Phonebook Segment</label>
            <div className="relative">
              <select 
                value={selectedGroupId} 
                required 
                className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-xs font-medium transition-all appearance-none cursor-pointer text-gray-700" 
                onChange={e => setSelectedGroupId(e.target.value)}
              >
                <option value="">-- Select Contact Group Segment --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>👥 {g.group_name} {g.description ? `(${g.description})` : ''}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1.5 pointer-events-none text-gray-400">▼</div>
            </div>
          </div>
        )}

        {/* BROADCAST TEXT FIELD CONTENT INPUT */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Message Content Body</label>
            
            {/* FIXED: Modern analytics widget chip tracking live strict character boundaries cost per user mapping */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              creditCostPerRecipient > 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-100 text-gray-500'
            }`}>
              <span>{charCount} Chars</span>
              <span className="text-gray-300">•</span>
              <span>Cost/User: <strong className="font-black text-xs">{creditCostPerRecipient}</strong> {creditCostPerRecipient === 1 ? 'Credit' : 'Credits'}</span>
            </span>
          </div>
          <textarea 
            placeholder="Type your unified blast message template copy right here..." 
            required 
            rows="4" 
            value={bulkMessage} 
            className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-xs leading-relaxed text-gray-700 transition-all placeholder-gray-400 shadow-inner bg-gray-50/30" 
            onChange={(e) => setBulkMessage(e.target.value)} 
          />
        </div>

        {/* TIME DELAY TIMETABLE CONTROLLER */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-dashed border-slate-200 transition-colors hover:bg-slate-50">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <span>⏰</span>
            <span>Schedule for Future Release</span>
          </label>
          <p className="text-[11px] text-gray-400 mb-3">Leave empty to deploy this campaign immediately right now.</p>
          <input 
            type="datetime-local" 
            value={scheduledAt} 
            className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-gray-700 transition-all cursor-pointer" 
            onChange={e => setScheduledAt(e.target.value)} 
          />
        </div>

        {/* SUBMISSION ORDER DISPATCH CONTAINER */}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
        >
          <span>{loading ? "⚡" : scheduledAt ? "⏰" : "🚀"}</span>
          <span>
            {loading ? "Processing Distribution Pipelines..." : scheduledAt ? "Schedule Bulk Campaign Blast" : "Execute Immediate Bulk Blast"}
          </span>
        </button>
      </form>
    </div>
  );
}