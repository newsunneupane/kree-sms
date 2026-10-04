"use client";
import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { api } from "../../../lib/client-api";
import { smsCreditCost } from "../../../lib/sms-segments";
import { CardHeader, Field, CostBadge, PrimaryButton, inputCls, selectCls } from "../ui/ui";
import { IconUpload, IconChevronDown, IconClock, IconSend, IconDoc } from "../ui/Icons";

function SourceToggle({ value, onChange }) {
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
      {[
        { id: "file", label: "Upload file" },
        { id: "group", label: "Phonebook group" },
      ].map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 sm:flex-initial px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
            value === o.id ? "bg-white text-violet-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dropzone({ file, onPick, onRemove, acceptId }) {
  const inputRef = useRef(null);
  const clear = () => {
    onRemove();
    if (inputRef.current) inputRef.current.value = "";
  };
  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 w-full bg-white border border-slate-200 p-3 rounded-xl animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
            <IconDoc />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 truncate">{file.name}</p>
            <p className="text-[11px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Remove
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className="w-full border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-xl p-6 bg-slate-50/60 transition-colors flex flex-col items-center justify-center min-h-[120px] gap-1.5 cursor-pointer"
    >
      <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center">
        <IconUpload />
      </span>
      <span className="text-[13px] text-slate-600 font-semibold">Click to choose, or drag & drop your recipient list</span>
      <span className="text-[11px] text-slate-400">Supports .csv, .xls, .xlsx</span>
      <input
        ref={inputRef}
        id={acceptId}
        type="file"
        accept=".csv, .xls, .xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
    </button>
  );
}

export { SourceToggle, Dropzone };

export default function BulkSms({ userId, setStatus, syncBalance, downloadSample }) {
  const [bulkMessage, setBulkMessage] = useState("");
  const [sourceType, setSourceType] = useState("file");
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const charCount = bulkMessage.length;
  const creditCostPerRecipient = smsCreditCost(bulkMessage);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await api("/api/phonebook/get-phonebook?limit=100");
        if (data.success) setGroups(data.groups);
      } catch (err) {
        console.error("Could not load groups:", err);
      }
    };
    if (userId) fetchGroups();
  }, [userId]);

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Preparing your campaign...");

    try {
      let compiledCsvText = "mobile\n";

      if (sourceType === "file") {
        if (!uploadedFile) {
          setStatus("Please upload a file first.");
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
          setStatus("Please choose a group.");
          setLoading(false);
          return;
        }
        compiledCsvText = `SYSTEM_GROUP_ID:${selectedGroupId}`;
      }

      const backendData = await api("/api/user/send-sms", {
        method: "POST",
        body: {
          sms_type: "bulk",
          csv_raw_text: compiledCsvText,
          global_message: bulkMessage,
          scheduled_at: scheduledAt || undefined,
        },
      });
      setStatus(backendData.message);
      if (backendData.success) {
        setBulkMessage("");
        setScheduledAt("");
        handleRemoveFile();
      }
    } catch (err) {
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-3xl">
      <CardHeader title="Bulk SMS" subtitle="Send or schedule one message to many recipients." />
      <div className="mb-6">
        <SourceToggle value={sourceType} onChange={setSourceType} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {sourceType === "file" ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600">
                Your file needs a column named <code className="bg-white border border-slate-200 font-mono px-1.5 py-0.5 rounded text-violet-700 font-bold">mobile</code>
              </p>
              <button
                type="button"
                onClick={() => downloadSample("bulk")}
                className="text-violet-700 hover:text-violet-800 font-bold text-xs whitespace-nowrap"
              >
                Download sample
              </button>
            </div>
            <Field label="Recipient file">
              <Dropzone file={uploadedFile} onPick={setUploadedFile} onRemove={handleRemoveFile} acceptId="campaignFileInput" />
            </Field>
          </div>
        ) : (
          <div className="animate-fade-in">
            <Field label="Phonebook group">
              <div className="relative">
                <select
                  value={selectedGroupId}
                  required
                  className={selectCls}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Choose a group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.group_name}{g.description ? ` — ${g.description}` : ""}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <IconChevronDown className="w-4 h-4" />
                </div>
              </div>
            </Field>
          </div>
        )}

        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Message</span>
            <CostBadge chars={charCount} cost={creditCostPerRecipient} perRecipient />
          </div>
          <textarea
            placeholder="Type your message..."
            required
            rows="4"
            value={bulkMessage}
            className={`${inputCls} leading-relaxed resize-none`}
            onChange={(e) => setBulkMessage(e.target.value)}
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <IconClock className="w-4 h-4 text-slate-400" />
            Schedule for later
          </p>
          <p className="text-[12px] text-slate-500 mt-1 mb-3">Leave empty to send immediately.</p>
          <input
            type="datetime-local"
            value={scheduledAt}
            className={`${inputCls} sm:max-w-xs cursor-pointer`}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <PrimaryButton loading={loading}>
          {scheduledAt ? <IconClock className="w-4 h-4" /> : <IconSend className="w-4 h-4" />}
          {loading ? "Sending..." : scheduledAt ? "Schedule campaign" : "Send now"}
        </PrimaryButton>
      </form>
    </div>
  );
}
