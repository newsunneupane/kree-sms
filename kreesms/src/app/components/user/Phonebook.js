"use client";
import { useState, useEffect } from "react";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

export default function Phonebook({ userId, setStatus }) {
  // Directory & Structural State Vectors
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  
  // Advanced Pagination Controls Vectors
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // 🚀 GROUP MODE CONFIGURATION STATE
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  // Traditional Single-Input Forms State
  const [newGroup, setNewGroup] = useState({ group_name: "", description: "" });
  const [newContact, setNewContact] = useState({ firstname: "", lastname: "", mobile: "" });

  // Mass Bulk Import Working States
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [showBulkPortal, setShowBulkPortal] = useState(false);

  // Synchronize Paginated Data Streams from Backend API Engine
  const fetchDirectory = async () => {
    try {
      const res = await fetch(
        `${baseUrl}/sms-backend/phonebook.php?action=get_phonebook&user_id=${userId}&page=${currentPage}&limit=${itemsPerPage}`
      );
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
        setContacts(data.contacts || []);
        setTotalContacts(data.total_contacts || data.contacts?.length || 0);
      }
    } catch (err) { 
      console.error("Directory synchronizer error context:", err); 
    }
  };

  useEffect(() => { 
    if (userId) fetchDirectory(); 
  }, [userId, currentPage]);

  const downloadSampleTemplate = () => {
    const header = "firstname,lastname,mobile\n";
    const sampleRows = "Ram,Bahadur,9841000000\nSita,Kumari,9851000001\nHari,Shrestha,9803000002";
    const blob = new Blob([header + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample25.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkTextChange = (text) => {
    setBulkCsvText(text);
    if (!text.trim()) {
      setBulkPreview([]);
      return;
    }

    const lines = text.split("\n");
    const compiledPreview = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = lines[i].split(",");
      compiledPreview.push({
        firstname: cells[0]?.trim() || "",
        lastname: cells[1]?.trim() || "",
        mobile: cells[2]?.trim() || ""
      });
    }
    setBulkPreview(compiledPreview);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkPreview.length === 0) {
      setStatus("No valid records found to compile.");
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/sms-backend/phonebook.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_bulk_contacts",
          user_id: userId,
          contacts: bulkPreview
        })
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) {
        setBulkCsvText("");
        setBulkPreview([]);
        setShowBulkPortal(false);
        setCurrentPage(1);
        fetchDirectory();
      }
    } catch (err) {
      setStatus("Error writing bulk entries array.");
    }
  };

  // Toggles single checkbox selections inside the row loop matrix
  const handleToggleSelectContact = (id) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(item => item !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  // Selects or clears all 25 rows currently displayed on screen
  const handleSelectAllCurrentPage = () => {
    const currentPageIds = contacts.map(c => c.id);
    const allSelected = currentPageIds.every(id => selectedContactIds.includes(id));

    if (allSelected) {
      setSelectedContactIds(selectedContactIds.filter(id => !currentPageIds.includes(id)));
    } else {
      const newSelections = [...selectedContactIds];
      currentPageIds.forEach(id => {
        if (!newSelections.includes(id)) newSelections.push(id);
      });
      setSelectedContactIds(newSelections);
    }
  };

  // Creates segments mapped directly to the selected checkboxes
  const handleAddGroupWithContacts = async (e) => {
    e.preventDefault();
    if (selectedContactIds.length === 0) {
      setStatus("Please select at least one contact using the checkboxes to build this segment.");
      return;
    }

    try {
      const res = await fetch("http://localhost/sms-backend/phonebook.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "add_group_with_relations", 
          user_id: userId, 
          contact_ids: selectedContactIds,
          ...newGroup 
        })
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) { 
        setNewGroup({ group_name: "", description: "" }); 
        setSelectedContactIds([]); 
        setIsGroupMode(false); // 🚀 Automatically switch group mode off on successful creation
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Error compiling linked group relations schema."); 
    }
  };

  const handleAddSingleContact = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost/sms-backend/phonebook.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_contact", user_id: userId, ...newContact })
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) { 
        setNewContact({ firstname: "", lastname: "", mobile: "" }); 
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Error writing database contact tracking record."); 
    }
  };

  const totalPages = Math.ceil(totalContacts / itemsPerPage) || 1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto transition-all duration-300">
      
      {/* HEADER UTILITY ACTUATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-200/60">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Dynamic Directory Core</h2>
          <p className="text-[11px] text-gray-400">Total system entries logged: <span className="font-mono font-bold text-blue-600">{totalContacts}</span> records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            📥 Download Template (`sample25.xlsx` Format)
          </button>
          
          {/* 🚀 STEP 1: MAKE GROUP OPTION TOGGLE SWITCH ACTION */}
          <button
            type="button"
            onClick={() => {
              setIsGroupMode(!isGroupMode);
              setSelectedContactIds([]); // Clear memory register maps automatically on mode changes
            }}
            className={`text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md ${
              isGroupMode 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "bg-slate-900 hover:bg-black text-white"
            }`}
          >
            {isGroupMode ? "✕ Exit Group Builder" : "👥 Make a Group"}
          </button>

          <button
            type="button"
            onClick={() => setShowBulkPortal(!showBulkPortal)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10"
          >
            {showBulkPortal ? "✕ Hide Import" : "📋 Mass Bulk Upload"}
          </button>
        </div>
      </div>

      {/* MASS IMPORT PORTAL PANEL */}
      {showBulkPortal && (
        <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl transition-all animate-fade-in grid md:grid-cols-2 gap-6">
          <form onSubmit={handleBulkSubmit} className="space-y-3.5">
            <div>
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest font-mono">Mass Bulk Text Area Pipeline</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Paste raw spreadsheet lines including headers directly down below.</p>
            </div>
            <textarea
              rows={6}
              value={bulkCsvText}
              placeholder="firstname,lastname,mobile&#10;Ram,Bahadur,9841000000&#10;Sita,Kumari,9851000001"
              onChange={(e) => handleBulkTextChange(e.target.value)}
              className="w-full p-3 font-mono text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 placeholder-slate-600 resize-none"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
            >
              🚀 Process and Inject Matrix Stream ({bulkPreview.length} Records Loaded)
            </button>
          </form>

          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-mono">Live Validation Interceptor Preview</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Parsed data properties map values cleanly before committing to disk tables.</p>
            </div>
            <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto font-mono text-[11px] text-slate-400 divide-y divide-slate-900">
              {bulkPreview.length === 0 ? (
                <div className="text-center text-slate-600 py-12 italic">Waiting for text layout matrix payload parsing inputs...</div>
              ) : (
                bulkPreview.map((item, index) => (
                  <div key={index} className="py-1.5 flex justify-between items-center">
                    <span className="text-slate-200 font-bold max-w-[180px] truncate">{index + 1}. {item.firstname} {item.lastname}</span>
                    <span className="text-emerald-500 font-semibold">{item.mobile}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONDITIONAL SUBFORMS WORKSPACE */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* 🚀 STEP 2: GROUP CONSOLE FORM DISPLAYS ONLY WHEN IN GROUP MODE */}
        {isGroupMode && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-md animate-fade-in">
            <div className="mb-4">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center space-x-2">
                <span>⚡</span>
                <span>Segment Assembler Tool</span>
              </h3>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Check boxes next to contacts in the directory index table below, fill out group metadata fields, then confirm creation.
              </p>
            </div>
            <form onSubmit={handleAddGroupWithContacts} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Group Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Premium VIP Clients" 
                  required 
                  value={newGroup.group_name}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:border-blue-500 focus:outline-none transition-all shadow-sm" 
                  onChange={e => setNewGroup({...newGroup, group_name: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Short Remarks Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Whitelisted marketing target list" 
                  value={newGroup.description}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:border-blue-500 focus:outline-none transition-all shadow-sm" 
                  onChange={e => setNewGroup({...newGroup, description: e.target.value})} 
                />
              </div>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md h-[46px]"
              >
                Assemble Group From Checked Contacts ({selectedContactIds.length} Selected)
              </button>
            </form>
          </div>
        )}

        {/* SINGLE ADD DIRECTORY CONTACT FORM (Shows when NOT assembling a group to keep code interface clean) */}
        {!isGroupMode && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="mb-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                <span>👤</span>
                <span>Single Entry Contact Node</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Save single recipient mapping identities straight into database tables.</p>
            </div>
            <form onSubmit={handleAddSingleContact} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
              <input 
                type="text" 
                placeholder="First Name" 
                required
                value={newContact.firstname} 
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:outline-none shadow-inner transition-all" 
                onChange={e => setNewContact({...newContact, firstname: e.target.value})} 
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                value={newContact.lastname} 
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:outline-none shadow-inner transition-all" 
                onChange={e => setNewContact({...newContact, lastname: e.target.value})} 
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Mobile Number (e.g. 98XXXXXXXX)" 
                  required 
                  value={newContact.mobile} 
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:outline-none shadow-inner transition-all" 
                  onChange={e => setNewContact({...newContact, mobile: e.target.value})} 
                />
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md whitespace-nowrap h-[44px]"
                >
                  ➕ Add
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* DIRECTORY INDEX LEDGER MATRIX PANEL WITH PAGINATION CONTROL STREAMS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Saved Directory System Array</h3>
            <p className="text-xs text-gray-400 mt-0.5">Displaying items {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalContacts)} of {totalContacts}</p>
          </div>
          {isGroupMode && (
            <div className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 animate-pulse">
              ⚙️ GROUP MODE ACTIVE: Use checkboxes to select audience paths
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                {/* 🚀 STEP 3: CONDITIONAL TABLE HEAD CHECKBOX CONTAINER */}
                {isGroupMode && (
                  <th className="p-3.5 w-12 text-center bg-amber-50/40 border-r border-gray-200/60 animate-fade-in">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={contacts.length > 0 && contacts.map(c => c.id).every(id => selectedContactIds.includes(id))}
                      onChange={handleSelectAllCurrentPage}
                    />
                  </th>
                )}
                <th className="p-3.5">Identity Name</th>
                <th className="p-3.5">Mobile Destination</th>
                <th className="p-3.5">Assigned Segment Partition</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={isGroupMode ? 4 : 3} className="p-8 text-center text-gray-400 font-medium font-sans">
                    No active contact cards initialized inside your repository.
                  </td>
                </tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${isGroupMode && selectedContactIds.includes(c.id) ? "bg-blue-50/40" : ""}`}>
                    
                    {/* 🚀 STEP 4: CONDITIONAL TABLE DATA CELL INJECTS VALUE ONLY WHEN COMPILING GROUP SELECTION MATRIX */}
                    {isGroupMode && (
                      <td className="p-3.5 text-center bg-amber-50/10 border-r border-gray-100 animate-fade-in w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedContactIds.includes(c.id)}
                          onChange={() => handleToggleSelectContact(c.id)}
                        />
                      </td>
                    )}
                    
                    <td className="p-3.5 font-bold text-gray-900">{c.firstname} {c.lastname}</td>
                    <td className="p-3.5 font-mono text-gray-500 font-medium tracking-wide">{c.mobile}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center space-x-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        c.group_name 
                          ? "bg-purple-50 text-purple-700 border border-purple-100/60" 
                          : "bg-gray-50 text-gray-400 border border-gray-200/40"
                      }`}>
                        <span>{c.group_name ? "👥" : "👤"}</span>
                        <span>{c.group_name || "Unassigned Pool"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* DYNAMIC PAGINATION CONTROLS FOOTER PANEL */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-1.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ◀ Prev
            </button>
            
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-8 h-8 rounded-xl text-xs font-black font-mono transition-all border ${
                    currentPage === pageNumber
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

    </div>
  );
}