"use client";
import { IconCopy, IconX } from "./Icons";

// Single status taxonomy used across the whole app.
export function StatusChip({ value, tone }) {
  const normalized = String(value || "").toLowerCase();
  let cls = "bg-slate-100 text-slate-600 border-slate-200";
  if (tone) {
    cls =
      tone === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : tone === "danger"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : tone === "brand"
              ? "bg-violet-50 text-violet-700 border-violet-200"
              : tone === "info"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : cls;
  } else if (["success", "sent", "approved", "active", "delivered"].includes(normalized) || normalized === "200") {
    cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (["pending", "scheduled", "queued", "processing"].includes(normalized) || normalized === "429") {
    cls = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["failed", "rejected", "revoked", "error"].includes(normalized) || normalized) {
    // Any other explicit failure-ish value falls to rose; empty handled by caller default.
    if (["failed", "rejected", "revoked", "error", "402", "401", "502"].includes(normalized)) {
      cls = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (["bulk"].includes(normalized)) {
      cls = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (["dynamic"].includes(normalized)) {
      cls = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (["single", "sms"].includes(normalized)) {
      cls = "bg-violet-50 text-violet-700 border-violet-200";
    }
  }
  return (
    <span className={`inline-flex items-center text-[10px] px-2.5 py-1 font-bold rounded-lg uppercase tracking-wider border whitespace-nowrap ${cls}`}>
      {value}
    </span>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        {subtitle ? <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div>
      {label ? (
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      ) : null}
      {children}
      {hint ? <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p> : null}
    </div>
  );
}

export const inputCls =
  "w-full px-3.5 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400";

export const selectCls =
  "w-full px-3.5 py-3 pr-10 border border-slate-300 rounded-xl bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none text-sm font-medium transition-all appearance-none cursor-pointer text-slate-700";

export function PrimaryButton({ loading = false, children, className = "", ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className={`w-full bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-semibold text-[13px] tracking-wide transition-all shadow-sm shadow-violet-600/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export function CostBadge({ chars, encoding, cost, perRecipient = false }) {
  const multi = cost > 1;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap ${
        multi ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      <span>
        {chars} chars{encoding === "Unicode" ? " · Unicode" : ""}
      </span>
      <span className="text-slate-300">|</span>
      <span>
        {perRecipient ? "Base " : "Cost "}
        <strong className="font-bold font-mono">{cost}</strong> {cost === 1 ? "credit" : "credits"}
        {perRecipient ? "/recipient" : ""}
      </span>
    </span>
  );
}

export function Notice({ tone = "info", children, onDismiss }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : tone === "error"
        ? "bg-rose-50 border-rose-200 text-rose-700"
        : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <div className={`p-4 border rounded-xl text-[13px] font-medium flex items-start justify-between gap-3 animate-fade-in ${cls}`}>
      <div className="leading-relaxed">{children}</div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity p-0.5" aria-label="Dismiss">
          <IconX className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="py-10 px-6 text-center">
      <div className="w-11 h-11 mx-auto rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-500 mb-3">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {subtitle ? <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">{subtitle}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto nice-scroll rounded-xl border border-slate-200">
      <table className="w-full text-left border-collapse bg-white">
        <thead className="sticky top-0">
          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-3 whitespace-nowrap ${h.align === "right" ? "text-right" : ""}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[13px] divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
}

export function CopyButton({ text, label = "Copy", dark = false }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
        dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
      }`}
    >
      <IconCopy className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function StatCard({ eyebrow, value, valueClass = "text-slate-900", hint }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">{eyebrow}</p>
      <p className={`text-[28px] leading-8 font-bold font-mono tracking-tight mt-2 ${valueClass}`}>{value}</p>
      {hint ? <p className="text-[11px] text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
