"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "../../../lib/client-api";
import { CardHeader, Field, PrimaryButton, DataTable, EmptyState, Notice, inputCls } from "../ui/ui";
import { IconBook, IconPlus } from "../ui/Icons";

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
    link.setAttribute("download", "contacts-template.csv");
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
      setSelectedContactIds(selectedContactIds.filter((item) => item !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const handleSelectAllCurrentPage = () => {
    const currentPageIds = contacts.map((c) => c.id);
    const allSelected = currentPageIds.every((id) => selectedContactIds.includes(id));

    if (allSelected) {
      setSelectedContactIds(selectedContactIds.filter((id) => !currentPageIds.includes(id)));
    } else {
      const newSelections = [...selectedContactIds];
      currentPageIds.forEach((id) => {
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

  // Ellipsis pagination — visual only, same setCurrentPage logic.
  const pageList = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, 2, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages]);
    const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push("…");
      out.push(p);
      prev = p;
    }
    return out;
  }, [totalPages, currentPage]);

  const from = totalContacts === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalContacts);

  return (
    <div className="space-y-6">
      <CardHeader
        title="Phonebook"
        subtitle={`${totalContacts.toLocaleString()} contacts saved · ${groups.length} groups`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
            >
              Sample CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setIsGroupMode(!isGroupMode);
                setSelectedContactIds([]);
              }}
              className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all ${
                isGroupMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isGroupMode ? "Close group builder" : "New group"}
            </button>
            <button
              type="button"
              onClick={() => setShowBulkPortal(!showBulkPortal)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
            >
              {showBulkPortal ? "Hide import" : "Bulk import"}
            </button>
          </div>
        }
      />

      {showBulkPortal && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl grid md:grid-cols-2 gap-5 animate-fade-in">
          <form onSubmit={handleBulkSubmit} className="space-y-3">
            <div>
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Bulk import</h4>
              <p className="text-xs text-slate-500 mt-1">Paste rows below, starting with a header line: <code className="font-mono bg-white border border-slate-200 px-1 rounded">firstname,lastname,mobile</code></p>
            </div>
            <textarea
              rows={6}
              value={bulkCsvText}
              placeholder={"firstname,lastname,mobile\nRam,Bahadur,9841000000\nSita,Kumari,9851000001"}
              onChange={(e) => handleBulkTextChange(e.target.value)}
              className={`${inputCls} font-mono !text-xs resize-none`}
              required
            />
            <PrimaryButton loading={false}>
              Import {bulkPreview.length} contact{bulkPreview.length === 1 ? "" : "s"}
            </PrimaryButton>
          </form>
          <div>
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Preview</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">Check the parsed rows before importing.</p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 h-[196px] overflow-y-auto nice-scroll font-mono text-[12px] divide-y divide-slate-100">
              {bulkPreview.length === 0 ? (
                <p className="text-center text-slate-400 py-14 italic font-sans text-xs">Paste data on the left to preview rows here...</p>
              ) : (
                bulkPreview.map((item, index) => (
                  <div key={index} className="py-2 flex justify-between items-center gap-2">
                    <span className="text-slate-800 font-semibold truncate">{index + 1}. {item.firstname} {item.lastname}</span>
                    <span className="text-emerald-600 font-semibold whitespace-nowrap">{item.mobile}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isGroupMode ? (
        <div className="bg-violet-50/60 p-5 rounded-2xl border border-violet-200 animate-fade-in">
          <h4 className="text-[13px] font-bold text-slate-800">New group <span className="text-slate-400 font-medium">— tick contacts below, name the group, then create it.</span></h4>
          <form onSubmit={handleAddGroupWithContacts} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Field label="Group name">
              <input
                type="text"
                placeholder="e.g. VIP customers"
                required
                value={newGroup.group_name}
                className={inputCls}
                onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })}
              />
            </Field>
            <Field label="Description (optional)">
              <input
                type="text"
                placeholder="e.g. Marketing list"
                value={newGroup.description}
                className={inputCls}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
            </Field>
            <PrimaryButton loading={false}>
              Create group ({selectedContactIds.length} selected)
            </PrimaryButton>
          </form>
        </div>
      ) : (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
            <IconPlus className="w-4 h-4 text-slate-400" />
            Add contact
          </h4>
          <form onSubmit={handleAddSingleContact} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Field label="First name">
              <input
                type="text"
                placeholder="First name"
                required
                value={newContact.firstname}
                className={inputCls}
                onChange={(e) => setNewContact({ ...newContact, firstname: e.target.value })}
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                placeholder="Last name"
                value={newContact.lastname}
                className={inputCls}
                onChange={(e) => setNewContact({ ...newContact, lastname: e.target.value })}
              />
            </Field>
            <Field label="Mobile">
              <input
                type="text"
                placeholder="98XXXXXXXX"
                required
                value={newContact.mobile}
                className={`${inputCls} font-mono`}
                onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
              />
            </Field>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white px-5 rounded-xl text-[13px] font-semibold transition-all h-[46px]"
            >
              Add contact
            </button>
          </form>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
          <p className="text-xs text-slate-500">Showing {from}–{to} of {totalContacts.toLocaleString()}</p>
          {isGroupMode && (
            <Notice tone="info">
              <span className="text-xs font-semibold">Group builder is on — tick contacts to include them.</span>
            </Notice>
          )}
        </div>

        <DataTable
          headers={[
            ...(isGroupMode ? [{ label: "" }] : []),
            { label: "Name" },
            { label: "Mobile" },
            { label: "Group" },
          ]}
        >
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={isGroupMode ? 4 : 3} className="p-0">
                <EmptyState title="No contacts yet" subtitle="Add one above, or use Bulk import to add many at once." />
              </td>
            </tr>
          ) : (
            contacts.map((c) => (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isGroupMode && selectedContactIds.includes(c.id) ? "bg-violet-50/60" : ""}`}>
                {isGroupMode && (
                  <td className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      checked={selectedContactIds.includes(c.id)}
                      onChange={() => handleToggleSelectContact(c.id)}
                      aria-label={`Select ${c.firstname} ${c.lastname}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-slate-900">{c.firstname} {c.lastname}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.mobile}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-bold border ${
                    c.group_name ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    <IconBook className="w-3 h-3" />
                    {c.group_name || "No group"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </DataTable>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              Prev
            </button>
            {pageList.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="text-slate-400 text-xs px-1">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`min-w-9 h-9 px-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                    currentPage === p ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <span key={g.id} className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl">
              <IconBook className="w-3.5 h-3.5 text-violet-500" />
              {g.group_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
