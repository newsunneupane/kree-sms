"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";

export default function Phonebook({ userId, setStatus }) {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  const [newGroup, setNewGroup] = useState({ group_name: "", description: "" });
  const [newContact, setNewContact] = useState({ firstname: "", lastname: "", mobile: "" });

  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [showBulkPortal, setShowBulkPortal] = useState(false);

  const fetchDirectory = async () => {
    try {
      const data = await api(
        `/api/phonebook/get-phonebook?page=${currentPage}&limit=${itemsPerPage}`
      );
      if (data.success) {
        setGroups(data.groups || []);
        setContacts(data.contacts || []);
        setTotalContacts(data.total_contacts || data.contacts?.length || 0);
      }
    } catch (err) { 
      console.error("Could not load contacts:", err); 
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
      setStatus("No valid rows found.");
      return;
    }

    try {
      const data = await api("/api/phonebook/add-bulk-contacts", {
        method: "POST",
        body: { contacts: bulkPreview },
      });
      setStatus(data.message);
      if (data.success) {
        setBulkCsvText("");
        setBulkPreview([]);
        setShowBulkPortal(false);
        setCurrentPage(1);
        fetchDirectory();
      }
    } catch (err) {
      setStatus("Import failed. Please try again.");
    }
  };

  const handleToggleSelectContact = (id) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(item => item !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

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

  const handleAddGroupWithContacts = async (e) => {
    e.preventDefault();
    if (selectedContactIds.length === 0) {
      setStatus("Select at least one contact first.");
      return;
    }

    try {
      const data = await api("/api/phonebook/add-group-with-relations", {
        method: "POST",
        body: {
          contact_ids: selectedContactIds,
          ...newGroup,
        },
      });
      setStatus(data.message);
      if (data.success) { 
        setNewGroup({ group_name: "", description: "" }); 
        setSelectedContactIds([]); 
        setIsGroupMode(false);
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Could not create the group. Please try again."); 
    }
  };

  const handleAddSingleContact = async (e) => {
    e.preventDefault();
    try {
      const data = await api("/api/phonebook/add-contact", {
        method: "POST",
        body: { ...newContact },
      });
      setStatus(data.message);
      if (data.success) { 
        setNewContact({ firstname: "", lastname: "", mobile: "" }); 
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Could not add the contact. Please try again."); 
    }
  };

  const totalPages = Math.ceil(totalContacts / itemsPerPage) || 1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto transition-all duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div>
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Contacts</h2>
          <p className="text-[11px] text-gray-400"><span className="font-mono font-bold text-violet-600">{totalContacts}</span> contacts saved</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            📥 Sample CSV
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsGroupMode(!isGroupMode);
              setSelectedContactIds([]);
            }}
            className={`text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md ${
              isGroupMode 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "bg-gray-900 hover:bg-black text-white"
            }`}
          >
            {isGroupMode ? "✕ Close group builder" : "👥 New group"}
          </button>

          <button
            type="button"
            onClick={() => setShowBulkPortal(!showBulkPortal)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-violet-600/10"
          >
            {showBulkPortal ? "✕ Hide import" : "📋 Bulk import"}
          </button>
        </div>
      </div>

      {showBulkPortal && (
        <div className="bg-gray-900 text-white p-5 sm:p-6 rounded-2xl border border-gray-800 shadow-xl transition-all animate-fade-in grid md:grid-cols-2 gap-6">
          <form onSubmit={handleBulkSubmit} className="space-y-3.5">
            <div>
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest font-mono">Bulk import</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Paste rows below, starting with a header line like firstname,lastname,mobile.</p>
            </div>
            <textarea
              rows={6}
              value={bulkCsvText}
              placeholder="firstname,lastname,mobile&#10;Ram,Bahadur,9841000000&#10;Sita,Kumari,9851000001"
              onChange={(e) => handleBulkTextChange(e.target.value)}
              className="w-full p-3 font-mono text-xs text-gray-200 bg-gray-950 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
            >
              🚀 Import {bulkPreview.length} contacts
            </button>
          </form>

          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-mono">Preview</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Check the parsed rows before importing.</p>
            </div>
            <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl p-3 h-40 overflow-y-auto font-mono text-[11px] text-gray-400 divide-y divide-gray-900">
              {bulkPreview.length === 0 ? (
                <div className="text-center text-gray-600 py-12 italic">Paste data on the left to preview rows here...</div>
              ) : (
                bulkPreview.map((item, index) => (
                  <div key={index} className="py-1.5 flex justify-between items-center">
                    <span className="text-gray-200 font-bold max-w-[180px] truncate">{index + 1}. {item.firstname} {item.lastname}</span>
                    <span className="text-emerald-500 font-semibold">{item.mobile}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        
        {isGroupMode && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-md animate-fade-in">
            <div className="mb-4">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center space-x-2">
                <span>⚡</span>
                <span>New group</span>
              </h3>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Tick contacts in the table below, name the group, then create it.
              </p>
            </div>
            <form onSubmit={handleAddGroupWithContacts} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Group name</label>
                <input 
                  type="text" 
                  placeholder="e.g. VIP customers" 
                  required 
                  value={newGroup.group_name}
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-violet-500 focus:outline-none transition-all shadow-sm" 
                  onChange={e => setNewGroup({...newGroup, group_name: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Description (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Marketing list" 
                  value={newGroup.description}
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-violet-500 focus:outline-none transition-all shadow-sm" 
                  onChange={e => setNewGroup({...newGroup, description: e.target.value})} 
                />
              </div>
              <button 
                type="submit" 
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md h-[46px]"
              >
                Create group ({selectedContactIds.length} selected)
              </button>
            </form>
          </div>
        )}

        {!isGroupMode && (
          <div className="bg-gray-100 p-5 sm:p-6 rounded-2xl border border-gray-200">
            <div className="mb-4">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center space-x-2">
                <span>👤</span>
                <span>Add contact</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Add one contact to your phonebook.</p>
            </div>
            <form onSubmit={handleAddSingleContact} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
              <input 
                type="text" 
                placeholder="First name" 
                required
                value={newContact.firstname} 
                className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-violet-500 focus:outline-none transition-all" 
                onChange={e => setNewContact({...newContact, firstname: e.target.value})} 
              />
              <input 
                type="text" 
                placeholder="Last name" 
                value={newContact.lastname} 
                className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-violet-500 focus:outline-none transition-all" 
                onChange={e => setNewContact({...newContact, lastname: e.target.value})} 
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Mobile number (e.g. 98XXXXXXXX)" 
                  required 
                  value={newContact.mobile} 
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-violet-500 focus:outline-none transition-all" 
                  onChange={e => setNewContact({...newContact, mobile: e.target.value})} 
                />
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md whitespace-nowrap h-[44px]"
                >
                  ➕ Add
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-5 sm:p-6 rounded-2xl border border-gray-200">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Contacts</h3>
            <p className="text-xs text-gray-500 mt-0.5">Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalContacts)} of {totalContacts}</p>
          </div>
          {isGroupMode && (
            <div className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 animate-pulse">
              ⚙️ Tick contacts to add them to the new group
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                {isGroupMode && (
                  <th className="p-3.5 w-12 text-center bg-amber-50/40 border-r border-gray-200 animate-fade-in">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      checked={contacts.length > 0 && contacts.map(c => c.id).every(id => selectedContactIds.includes(id))}
                      onChange={handleSelectAllCurrentPage}
                    />
                  </th>
                )}
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Mobile</th>
                <th className="p-3.5">Group</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-200 text-gray-700">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={isGroupMode ? 4 : 3} className="p-8 text-center text-gray-400 font-medium font-sans">
                    No contacts yet. Add one above to get started.
                  </td>
                </tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${isGroupMode && selectedContactIds.includes(c.id) ? "bg-blue-50" : ""}`}>
                    
                    {isGroupMode && (
                      <td className="p-3.5 text-center bg-amber-50/10 border-r border-gray-200 animate-fade-in w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
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
                          ? "bg-purple-50 text-purple-700 border border-purple-200" 
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        <span>{c.group_name ? "👥" : "👤"}</span>
                        <span>{c.group_name || "No group"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-1.5 pt-4 border-t border-gray-200">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                      ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
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
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

    </div>
  );
}