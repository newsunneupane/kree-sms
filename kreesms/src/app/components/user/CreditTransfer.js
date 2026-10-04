"use client";
import { useState } from "react";
import { api } from "../../../lib/client-api";
import { CardHeader, Field, PrimaryButton, inputCls } from "../ui/ui";
import { IconWallet, IconCard } from "../ui/Icons";

const PRESETS = [100, 500, 1000, 5000];

export default function CreditTransfer({ userId, setStatus }) {
  const [order, setOrder] = useState({ credits: "", reference: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Submitting your request...");
    try {
      const data = await api("/api/user/buy-credits", {
        method: "POST",
        body: { credits: order.credits, reference: order.reference },
      });
      setStatus(data.message);
      if (data.success) {
        setOrder({ credits: "", reference: "" });
      }
    } catch (err) {
      setStatus("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <CardHeader
        title="Buy credits"
        subtitle="Pay through any channel below, then submit the payment reference. An admin will approve it and top up your balance."
      />

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { label: "eSewa / Khalti", sub: "Mobile wallet" },
          { label: "Bank Deposit", sub: "Transfer" },
          { label: "Direct Slip", sub: "Voucher" },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center justify-center px-2 py-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <IconWallet className="w-5 h-5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-700 mt-1.5">{m.label}</span>
            <span className="text-[10px] text-slate-400">{m.sub}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setOrder({ ...order, credits: String(p) })}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono border transition-all ${
              String(p) === String(order.credits)
                ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                : "bg-white border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-700"
            }`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Credits" hint="Minimum 1 credit. Requests are approved by an administrator.">
          <div className="relative">
            <input
              type="number"
              placeholder="e.g. 5000"
              required
              min="1"
              value={order.credits}
              className={`${inputCls} pr-16 font-mono`}
              onChange={(e) => setOrder({ ...order, credits: e.target.value })}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <span className="text-slate-400 text-[11px] font-bold font-mono tracking-widest">SMS</span>
            </div>
          </div>
        </Field>

        <Field label="Payment reference" hint="e.g. your eSewa transaction ID or bank voucher number.">
          <input
            type="text"
            placeholder="e.g. eSewa transaction ID"
            required
            value={order.reference}
            className={inputCls}
            onChange={(e) => setOrder({ ...order, reference: e.target.value })}
          />
        </Field>

        <PrimaryButton loading={loading}>
          <IconCard className="w-4 h-4" />
          {loading ? "Submitting..." : "Submit request"}
        </PrimaryButton>
      </form>
    </div>
  );
}
