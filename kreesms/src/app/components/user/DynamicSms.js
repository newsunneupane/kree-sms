"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { api } from "../../../lib/client-api";
import { smsCreditCost } from "../../../lib/sms-segments";
import { CardHeader, Field, CostBadge, PrimaryButton, inputCls, selectCls } from "../ui/ui";
import { SourceToggle, Dropzone } from "./BulkSms";
import { IconChevronDown, IconClock, IconSend } from "../ui/Icons";

export default function DynamicSms({ userId, setStatus, syncBalance, downloadSample }) {
  const [sourceType, setSourceType] = useState("file");
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [dynamicTemplate, setDynamicTemplate] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const charCount = dynamicTemplate.length;
  const baseCreditCost = smsCreditCost(dynamicTemplate);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await api("/api/phonebook/get-phonebook?limit=100");
        if (data.success) setGroups(data.groups);
      } catch (err) {
        console.error("Could not load groups:", err);
      }
    };
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Preparing your campaign...");

    try {
      let compiledCsvText = "";

      if (sourceType === "file") {
        if (!uploadedFile) {
          setStatus("Please choose a file first.");
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
          setStatus("Please choose a group and write a template.");
          setLoading(false);
          return;
        }
        compiledCsvText = `SYSTEM_DYNAMIC_GROUP:${selectedGroupId}||TEMPLATE:${dynamicTemplate}`;
      }

      const backendData = await api("/api/user/send-sms", {
        method: "POST",
        body: {
          sms_type: "dynamic",
          csv_raw_text: compiledCsvText,
          scheduled_at: scheduledAt || undefined,
        },
      });
      setStatus(backendData.message);
      if (backendData.success) {
        setDynamicTemplate("");
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
      <CardHeader title="Dynamic SMS" subtitle="Send a personalized message to each recipient." />
      <div className="mb-6">
        <SourceToggle value={sourceType} onChange={setSourceType} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {sourceType === "file" ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600">
                Your file needs columns <code className="bg-white border border-slate-200 font-mono px-1.5 py-0.5 rounded text-violet-700 font-bold">mobile</code>
                {" "}and <code className="bg-white border border-slate-200 font-mono px-1.5 py-0.5 rounded text-violet-700 font-bold">message</code>
              </p>
              <button
                type="button"
                onClick={() => downloadSample("dynamic")}
                className="text-violet-700 hover:text-violet-800 font-bold text-xs whitespace-nowrap"
              >
                Download sample
              </button>
            </div>
            <Field label="Recipient file">
              <Dropzone file={uploadedFile} onPick={setUploadedFile} onRemove={handleRemoveFile} acceptId="dynamicFileInput" />
            </Field>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
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

            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Message template</span>
                <CostBadge chars={charCount} cost={baseCreditCost} perRecipient />
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3.5 rounded-xl mb-3 leading-relaxed">
                Use <code className="bg-blue-100 font-mono px-1.5 py-0.5 rounded font-bold text-blue-700">{"{name}"}</code> to insert each recipient&apos;s name. Longer names can push a message into the next segment and cost an extra credit.
              </div>
              <textarea
                placeholder="Hello {name}, your account update is live!"
                required
                rows="3"
                value={dynamicTemplate}
                className={`${inputCls} leading-relaxed resize-none`}
                onChange={(e) => setDynamicTemplate(e.target.value)}
              />
            </div>
          </div>
        )}

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
