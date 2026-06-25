"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

export default function DynamicSms({ userId, setStatus, syncBalance, downloadSample }) {
  const [sourceType, setSourceType] = useState("file"); 
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [dynamicTemplate, setDynamicTemplate] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scheduledAt, setScheduledAt] = useState(""); 
  const [loading, setLoading] = useState(false);

  // FIXED: Strict 1 Credit = 160 Characters calculation rule for the template baseline
  const charCount = dynamicTemplate.length;
  const baseCreditCost = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${baseUrl}/sms-backend/phonebook.php?action=get_phonebook&user_id=${userId}`);
        const data = await res.json();
        if (data.success) setGroups(data.groups);
      } catch (err) { 
        console.error("Failed to fetch segmentation groups:", err); 
      }
    };
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  const handleRemoveFile = () => {
    setUploadedFile(null);
    const fileInput = document.getElementById("dynamicFileInput");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Compiling tailored data matrices tracks...");

    try {
      let compiledCsvText = "";

      if (sourceType === "file") {
        if (!uploadedFile) {
          setStatus("Please select an input sheet file.");
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

            compiledCsvText = "mobile,message\n";
            jsonData.forEach((row) => {
              const phoneKey = Object.keys(row).find((k) => k.toLowerCase() === "mobile");
              const messageKey = Object.keys(row).find((k) => k.toLowerCase() === "message");
              if (phoneKey && row[phoneKey] && messageKey && row[messageKey]) {
                compiledCsvText += `${String(row[phoneKey]).trim()},"${String(row[messageKey]).replace(/"/g, '""')}"\n`;
              }
            });
            resolve();
          };
          reader.readAsArrayBuffer(uploadedFile);
        });
      } else {
        if (!selectedGroupId || !dynamicTemplate) {
          setStatus("Please populate group fields and templates inputs.");
          setLoading(false);
          return;
        }
        compiledCsvText = `SYSTEM_DYNAMIC_GROUP:${selectedGroupId}||TEMPLATE:${dynamicTemplate}`;
      }

      const res = await fetch(`${baseUrl}/sms-backend/user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_sms",
          sms_type: "dynamic",
          user_id: userId,
          csv_raw_text: compiledCsvText,
          scheduled_at: scheduledAt 
        }),
      });
      const backendData = await res.json();
      setStatus(backendData.message);
      if (backendData.success) {
        setDynamicTemplate("");
        setScheduledAt("");
        handleRemoveFile();
      }
    } catch (err) {
      setStatus("An transmission line pipeline error crashed execution.");
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-3xl bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300">
      
      {/* SECTION HEADER */}
      <div className="mb-6">
        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Dynamic Campaign Engine</h3>
        <p className="text-xs text-gray-400 mt-1">Deliver custom, contact-specific message strings using file mapping or saved internal parameters.</p>
      </div>
      
      {/* VIEW FILTER SEGMENT SELECTOR BUTTONS */}
      <div className="flex bg-gray-100/80 p-1 rounded-xl items-center self-start w-full sm:w-fit mb-6 border border-gray-200/20">
        <button 
          type="button" 
          onClick={() => setSourceType("file")} 
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            sourceType === "file" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>📁 File Source Mapping</span>
        </button>
        <button 
          type="button" 
          onClick={() => setSourceType("group")} 
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            sourceType === "group" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>👥 Live Phonebook Group</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CONDITIONAL SUBFORM A: SPREADSHEET HANDLING VIEW */}
        {sourceType === "file" ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-gray-600">
                <span>📋 Headers required:</span>
                <code className="bg-gray-200/60 font-mono px-1.5 py-0.5 rounded text-blue-600 font-bold">mobile</code>
                <span>&amp;</span>
                <code className="bg-gray-200/60 font-mono px-1.5 py-0.5 rounded text-blue-600 font-bold">message</code>
              </div>
              <button 
                type="button" 
                onClick={() => downloadSample("dynamic")} 
                className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center space-x-1 self-start sm:self-auto transition-colors"
              >
                <span>📥 Download Sample Layout</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Select Input Spreadsheets</label>
              <div className="relative group border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-4 bg-gray-50/50 transition-colors flex flex-col items-center justify-center min-h-[110px]">
                {!uploadedFile ? (
                  <>
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📤</span>
                    <span className="text-xs text-gray-500 font-medium">Choose file containing unique number and content maps</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Supports .csv, .xls, .xlsx</span>
                    <input 
                      id="dynamicFileInput"
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
          /* CONDITIONAL SUBFORM B: INTERNAL PHONEBOOK SELECTION SOURCE */
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Target Phonebook Group Segment</label>
              <div className="relative">
                <select 
                  value={selectedGroupId} 
                  required 
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-xs font-medium transition-all appearance-none cursor-pointer text-gray-700" 
                  onChange={e => setSelectedGroupId(e.target.value)}
                >
                  <option value="">-- Choose Segment Group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>👥 {g.group_name} {g.description ? `(${g.description})` : ''}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1.5 pointer-events-none text-gray-400 text-xs">▼</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Dynamic Message Template Layout</label>
                
                {/* FIXED: Added Live Credit Analytics Preview widget block matching the 160 layout rules */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                  baseCreditCost > 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span>{charCount} Chars</span>
                  <span className="text-gray-300">•</span>
                  <span>Base Cost: <strong className="font-black text-xs">{baseCreditCost}</strong> {baseCreditCost === 1 ? 'Credit/User' : 'Credits/User'}</span>
                </span>
              </div>

              <div className="bg-blue-50/80 border border-blue-100 text-blue-800 text-xs p-3 rounded-xl mb-3 flex items-start space-x-2">
                <span className="text-sm mt-0.5">💡</span>
                <p className="leading-relaxed">Use the placeholder tag <code className="bg-blue-100/80 font-mono px-1 py-0.5 rounded font-bold text-blue-700">{"{name}"}</code> to swap in recipient names. Note: Actual credit deductions per user adjust if their full name pushes the message length past a 160-character boundary tier!</p>
              </div>
              
              <textarea 
                placeholder="e.g. Hello {name}, your customized account notification token update is live!" 
                required 
                rows="3" 
                value={dynamicTemplate} 
                className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-xs leading-relaxed text-gray-700 transition-all placeholder-gray-400 shadow-inner bg-gray-50/30" 
                onChange={(e) => setDynamicTemplate(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* TIME CONTROLLER */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-dashed border-slate-200 transition-colors hover:bg-slate-50">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <span>⏰</span>
            <span>Schedule Campaign Trigger</span>
          </label>
          <p className="text-[11px] text-gray-400 mb-3">Leave empty to dispatch these personalized streams immediately.</p>
          <input 
            type="datetime-local" 
            value={scheduledAt} 
            className="p-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-gray-700 transition-all cursor-pointer" 
            onChange={e => setScheduledAt(e.target.value)} 
          />
        </div>

        {/* ORDER DISPATCH ACTIONS */}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
        >
          <span>{loading ? "⚡" : scheduledAt ? "⏰" : "🚀"}</span>
          <span>
            {loading ? "Processing Dynamic Pipelines..." : scheduledAt ? "Schedule Personalized Campaign" : "Execute Parameter Campaign Blast"}
          </span>
        </button>
      </form>
    </div>
  );
}