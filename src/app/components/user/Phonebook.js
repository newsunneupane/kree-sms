"use client";
import { useState, useEffect } from "react";

export default function Phonebook({ userId, setStatus }) {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newGroup, setNewGroup] = useState({ group_name: "", description: "" });
  const [newContact, setNewContact] = useState({ firstname: "", lastname: "", mobile: "", group_id: "" });

  const fetchDirectory = async () => {
    try {
      const res = await fetch(`http://localhost/sms-backend/phonebook.php?action=get_phonebook&user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
        setContacts(data.contacts || []);
      }
    } catch (err) { 
      console.error("Directory synchronizer error context:", err); 
    }
  };

  useEffect(() => { 
    if (userId) fetchDirectory(); 
  }, [userId]);

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost/sms-backend/phonebook.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_group", user_id: userId, ...newGroup })
      });
      const data = await res.json();
      setStatus(data.message);
      if (data.success) { 
        setNewGroup({ group_name: "", description: "" }); 
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Error compiling group record."); 
    }
  };

  const handleAddContact = async (e) => {
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
        setNewContact({ firstname: "", lastname: "", mobile: "", group_id: "" }); 
        fetchDirectory(); 
      }
    } catch (err) { 
      setStatus("Error compiling contact tracking ledger row."); 
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto transition-all duration-300">
      
      {/* MANAGEMENT SUBFORM MATRICES */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* SEGMENTATION: BUILD TARGET GROUP */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>⚡</span>
              <span>Create Segment Group</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Partition your audiences into clean structural tracking pools.</p>
          </div>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <input 
              type="text" 
              placeholder="Group Name (e.g. Premium VIP Clients)" 
              required 
              value={newGroup.group_name}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400" 
              onChange={e => setNewGroup({...newGroup, group_name: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Short Description Remarks" 
              value={newGroup.description}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400" 
              onChange={e => setNewGroup({...newGroup, description: e.target.value})} 
            />
            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-black active:scale-[0.99] text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-slate-900/10"
            >
              Build Target Group Segment
            </button>
          </form>
        </div>

        {/* PHONEBOOK: ADD SINGLE DIRECTORY CONTACT */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <span>👤</span>
              <span>Add Directory Contact Node</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Save single recipient mapping identities straight into database tables.</p>
          </div>
          <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <input 
              type="text" 
              placeholder="First Name" 
              value={newContact.firstname} 
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400" 
              onChange={e => setNewContact({...newContact, firstname: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Last Name" 
              value={newContact.lastname} 
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400" 
              onChange={e => setNewContact({...newContact, lastname: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Mobile Number (e.g. 98XXXXXXXX)" 
              required 
              value={newContact.mobile} 
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-gray-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-inner transition-all placeholder-gray-400 sm:col-span-2" 
              onChange={e => setNewContact({...newContact, mobile: e.target.value})} 
            />
            <div className="relative sm:col-span-2">
              <select 
                value={newContact.group_id} 
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all appearance-none cursor-pointer" 
                onChange={e => setNewContact({...newContact, group_id: e.target.value})}
              >
                <option value="">Standalone Contact Card (No Group Allocation)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>👥 {g.group_name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-2 pointer-events-none text-gray-400 text-xs">▼</div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-blue-600/10 sm:col-span-2"
            >
              Commit Contact To Memory
            </button>
          </form>
        </div>
      </div>

      {/* DIRECTORY INDEX LEDGER MATRIX PANEL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="mb-4">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Saved Directory System Array</h3>
          <p className="text-xs text-gray-400 mt-0.5">Live records repository of mapped recipients across custom system tracks.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200/60 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Identity Name</th>
                <th className="p-3.5">Mobile Destination</th>
                <th className="p-3.5">Assigned Segment Partition</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100 text-gray-700">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-gray-400 font-medium font-sans">
                    No active contact cards initialized inside your repository.
                  </td>
                </tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900">{c.firstname} {c.lastname}</td>
                    <td className="p-3.5 font-mono text-gray-500 font-medium tracking-wide">{c.mobile}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center space-x-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        c.group_name 
                          ? "bg-purple-50 text-purple-700 border border-purple-100/60" 
                          : "bg-gray-50 text-gray-400 border border-gray-200/40"
                      }`}>
                        <span>{c.group_name ? "👥" : "👤"}</span>
                        <span>{c.group_name || "Unassigned Module"}</span>
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