"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/client-api";
import { smsSegments } from "../../../lib/sms-segments";
import { CardHeader, Field, CostBadge, PrimaryButton, StatusChip, DataTable, EmptyState, inputCls } from "../ui/ui";
import { IconClock } from "../ui/Icons";

export default function ScheduleSms({ userId, setStatus }) {
  const [scheduleData, setScheduleData] = useState({ recipient: "", message: "", scheduled_at: "" });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const charCount = scheduleData.message.length;
  const seg = smsSegments(scheduleData.message);
  const creditCost = seg.segments;

  const fetchQueue = async () => {
    try {
      const data = await api("/api/schedule/get-scheduled");
      if (data.success) {
        setQueue(data.data || []);
      }
    } catch (err) {
      console.error("Could not load scheduled messages:", err);
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
      const data = await api("/api/schedule/schedule-sms", {
        method: "POST",
        body: { ...scheduleData },
      });
      setStatus(data.message);
      if (data.success) {
        setScheduleData({ recipient: "", message: "", scheduled_at: "" });
        fetchQueue();
      }
    } catch (err) {
      setStatus("Could not schedule the message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (v) => {
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return v;
      return d.toLocaleString();
    } catch {
      return v;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <CardHeader title="Schedule SMS" subtitle="Write a message now, send it later." />
        <form onSubmit={handleSchedule} className="space-y-4">
          <Field label="Phone number">
            <input
              type="text"
              placeholder="98XXXXXXXX"
              required
              value={scheduleData.recipient}
              className={`${inputCls} font-mono`}
              onChange={(e) => setScheduleData({ ...scheduleData, recipient: e.target.value })}
            />
          </Field>

          <Field label="Send at">
            <input
              type="datetime-local"
              required
              value={scheduleData.scheduled_at}
              className={`${inputCls} cursor-pointer`}
              onChange={(e) => setScheduleData({ ...scheduleData, scheduled_at: e.target.value })}
            />
          </Field>

          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Message</span>
              <CostBadge chars={charCount} encoding={seg.encoding} cost={creditCost} />
            </div>
            <textarea
              placeholder="Type your message..."
              required
              rows="4"
              value={scheduleData.message}
              className={`${inputCls} leading-relaxed resize-none`}
              onChange={(e) => setScheduleData({ ...scheduleData, message: e.target.value })}
            />
          </div>

          <PrimaryButton loading={loading}>
            <IconClock className="w-4 h-4" />
            {loading ? "Scheduling..." : `Schedule SMS (${creditCost} credit${creditCost === 1 ? "" : "s"})`}
          </PrimaryButton>
        </form>
      </div>

      <div className="lg:col-span-3 lg:border-l lg:border-slate-200 lg:pl-6">
        <CardHeader title="Scheduled messages" subtitle="Upcoming and past scheduled messages." />
        <DataTable headers={[{ label: "Send at" }, { label: "To" }, { label: "Message" }, { label: "Status" }]}>
          {queue.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-0">
                <EmptyState title="No scheduled messages yet" subtitle="Schedule your first message from the form." />
              </td>
            </tr>
          ) : (
            queue.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-violet-700 whitespace-nowrap">{formatDate(item.scheduled_at)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{item.recipient}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-500" title={item.message}>{item.message}</td>
                <td className="px-4 py-3">
                  <StatusChip value={item.status || "Pending"} />
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </div>
    </div>
  );
}
