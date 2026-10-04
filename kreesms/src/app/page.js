"use client";
import { useState, useEffect } from "react";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ApiClientDashboard from "./components/api-client/ApiClientDashboard";
import { api, getStoredSession, setStoredSession, clearStoredSession } from "../lib/client-api";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);

  // Registration steps: 1 = details, 2 = OTP code, 3 = pending screen
  const [regStep, setRegStep] = useState(1); // 1 = Detail Input, 2 = Pin Input, 3 = Hold Status Screen
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Restore session: local profile is only a hint — the httpOnly cookie is re-validated server-side.
    const saved = getStoredSession();
    if (!saved) {
      setCheckingSession(false);
      return;
    }
    api("/api/auth/me")
      .then((data) => {
        if (data.success) {
          setStoredSession(data.user);
          setUser(data.user);
        } else {
          clearStoredSession();
        }
      })
      .catch(() => clearStoredSession())
      .finally(() => setCheckingSession(false));
  }, []);

  // --- Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email: form.email, password: form.password },
      });

      if (data.success) {
        setStoredSession(data.user);
        setUser(data.user);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Could not reach the server. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Registration: submit details, receive OTP ---
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);

    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: { ...form },
      });

      if (data.success) {
        setMsg({ text: data.message, type: "success" });
        setRegStep(2); // Progress to the secure OTP checking form layout
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Registration: verify OTP ---
  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);

    try {
      const data = await api("/api/auth/verify-otp", {
        method: "POST",
        body: { email: form.email, otp: otpCode },
      });

      if (data.success) {
        setMsg({ text: "Account created. Please sign in.", type: "success" });
        setIsRegister(false);
        setRegStep(1);
        setOtpCode("");
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Verification failed. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie may already be expired — still clear local state below.
    }
    clearStoredSession();
    setUser(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-500 gap-4">
        <div className="w-10 h-10 border-[3px] border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading your session...</p>
      </div>
    );
  }

  if (user && user.role === "user") return <UserDashboard user={user} logout={handleLogout} />;
  if (user && user.role === "admin") return <AdminDashboard admin={user} logout={handleLogout} />;
  if (user && user.role === "api_client") return <ApiClientDashboard user={user} logout={handleLogout} />;

  const title = !isRegister ? "Welcome back" : regStep === 1 ? "Create account" : regStep === 2 ? "Verify email" : "Request received";
  const subtitle = !isRegister
    ? "Sign in to your SMS workspace"
    : regStep === 1
      ? "Register for the SMS portal — approval follows verification"
      : regStep === 2
        ? "Enter the 6-digit code we emailed you"
        : "Waiting for administrator approval";

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1fr_1.1fr] bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-10 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-600/30">
                कृ
              </div>
              <div>
                <p className="text-lg font-bold tracking-wide font-mono">KREESMS</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">SMS Gateway</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mt-10 leading-tight">
              Reliable bulk SMS for teams and products.
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Single, bulk and dynamic messaging, phonebook groups, scheduling and credit control — on the Aakash gateway.
            </p>
          </div>
          <ul className="relative space-y-3 text-[13px] text-slate-300">
            {["Live credit & segment costing", "Phonebook groups + Excel import", "Scheduled campaigns + history"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center text-[11px] font-bold">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="p-7 sm:p-10">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold shadow-md">कृ</div>
            <span className="font-mono font-bold tracking-wider text-slate-900">KREESMS</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-[13px] text-slate-500 mt-1.5">{subtitle}</p>

          {msg.text && (
            <div
              role={msg.type === "success" ? "status" : "alert"}
              className={`mt-5 flex items-start gap-3 p-4 border border-l-4 rounded-xl shadow-md animate-fade-in ${
                msg.type === "success"
                  ? "bg-emerald-50 border-emerald-300 border-l-emerald-500 text-emerald-900"
                  : "bg-rose-50 border-rose-300 border-l-rose-600 text-rose-900"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.type === "success" ? "bg-emerald-500" : "bg-rose-600"
                }`}
              >
                {msg.type === "success" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold tracking-wide">{msg.type === "success" ? "Success" : "Error"}</p>
                <p className="text-[13px] font-medium leading-relaxed mt-0.5 opacity-90">{msg.text}</p>
              </div>
            </div>
          )}

          {/* Login form */}
          {!isRegister && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email address</label>
                <input
                  type="email" placeholder="you@example.com" required
                  value={form.email}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400 text-sm"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <input
                  type="password" placeholder="Enter your password" required
                  value={form.password}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400 text-sm"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <button type="submit" disabled={isLoading} className="w-full mt-1 bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {isLoading ? "Signing in..." : "Log in"}
              </button>
            </form>
          )}

          {/* Registration flow */}
          {isRegister && (
            <div className="mt-6">
              {regStep === 1 && (
                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full name</label>
                    <input
                      type="text" placeholder="Your full name" required
                      value={form.name}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400 text-sm"
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email address</label>
                    <input
                      type="email" placeholder="you@example.com" required
                      value={form.email}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400 text-sm"
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                    <input
                      type="password" placeholder="Choose a strong password" required
                      value={form.password}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-400 text-sm"
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full mt-1 bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                    {isLoading ? "Sending code..." : "Send verification code"}
                  </button>
                </form>
              )}

              {regStep === 2 && (
                <form onSubmit={handleOtpVerifySubmit} className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-[13px] text-slate-600 leading-relaxed">
                    We sent a 6-digit verification code to <span className="text-violet-700 font-mono font-bold">{form.email}</span>.
                    <span className="block text-[12px] text-slate-500 mt-1">Tip: check your spam folder.</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Verification code</label>
                    <input
                      type="text" maxLength={6} placeholder="123456" required
                      value={otpCode}
                      className="w-full p-3.5 text-center text-xl bg-white border border-slate-300 text-violet-700 font-bold font-mono tracking-[0.4em] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                    {isLoading ? "Verifying..." : "Verify code"}
                  </button>
                  <button type="button" onClick={() => setRegStep(1)} className="w-full text-center text-slate-500 hover:text-slate-700 text-xs font-semibold">
                    ← Use a different email
                  </button>
                </form>
              )}

              {regStep === 3 && (
                <div className="text-center space-y-4 py-6 animate-fade-in">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 text-xl flex items-center justify-center rounded-full mx-auto">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold uppercase text-slate-900 tracking-wider">Registration received</h4>
                    <p className="text-[13px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                      Your email is verified. Your account is waiting for administrator approval — you can sign in once it is approved.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setRegStep(1);
                      setMsg({ text: "", type: "" });
                    }}
                    className="bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 text-xs font-semibold py-2.5 px-5 rounded-xl transition-all"
                  >
                    Back to login
                  </button>
                </div>
              )}
            </div>
          )}

          {(!isRegister || regStep !== 3) && (
            <div className="mt-7 pt-5 border-t border-slate-200 text-center">
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-violet-600 transition-colors font-medium"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setRegStep(1);
                  setMsg({ text: "", type: "" });
                }}
              >
                {isRegister ? "Already registered? Log in" : "Need an account? Register"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
