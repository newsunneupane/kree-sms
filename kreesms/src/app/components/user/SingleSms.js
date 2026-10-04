"use client";
import { useState } from "react";
import { api } from "../../../lib/client-api";
import { smsSegments } from "../../../lib/sms-segments";
import { CardHeader, Field, CostBadge, PrimaryButton, inputCls } from "../ui/ui";
import { IconSend } from "../ui/Icons";

export default function SingleSms({ userId, setStatus, syncBalance }) {
  const [singleData, setSingleData] = useState({ to: "", message: "" });
  const [loading, setLoading] = useState(false);

  const charCount = singleData.message.length;
  const seg = smsSegments(singleData.message);
  const creditCost = seg.segments;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Sending...");

    try {
      const data = await api("/api/user/send-sms", {
        method: "POST",
        body: {
          sms_type: "single",
          to: singleData.to,
          message: singleData.message,
        },
      });
      setStatus(data.message);

      if (data.success) {
        setSingleData({ to: "", message: "" });
        e.target.reset();
      }
    } catch (err) {
      setStatus("Could not send the message. Please try again.");
      console.error("Send failed:", err);
    } finally {
      setLoading(false);
      await syncBalance();
    }
  };

  return (
    <div className="max-w-2xl">
      <CardHeader title="Single SMS" subtitle="Send an instant SMS to any mobile number." />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Phone number">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-400 text-xs font-bold tracking-wider font-mono">+977</span>
            </div>
            <input
              type="text"
              placeholder="98XXXXXXXX"
              required
              value={singleData.to}
              className={`${inputCls} pl-16 font-mono`}
              onChange={(e) => setSingleData({ ...singleData, to: e.target.value })}
            />
          </div>
        </Field>

        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Message</span>
            <CostBadge chars={charCount} encoding={seg.encoding} cost={creditCost} />
          </div>
          <textarea
            placeholder="Type your message..."
            required
            rows="5"
            value={singleData.message}
            className={`${inputCls} leading-relaxed resize-none`}
            onChange={(e) => setSingleData({ ...singleData, message: e.target.value })}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            {seg.encoding} encoding · {seg.segments} segment{seg.segments === 1 ? "" : "s"} · {seg.units} units
          </p>
        </div>

        <PrimaryButton loading={loading}>
          <IconSend className="w-4 h-4" />
          {loading ? "Sending..." : `Send SMS (${creditCost} credit${creditCost === 1 ? "" : "s"})`}
        </PrimaryButton>
      </form>
    </div>
  );
}
