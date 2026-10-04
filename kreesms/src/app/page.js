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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 gap-4">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">Loading your session...</p>
      </div>
    );
  }

  if (user && user.role === "user") return <UserDashboard user={user} logout={handleLogout} />;
  if (user && user.role === "admin") return <AdminDashboard admin={user} logout={handleLogout} />;
  if (user && user.role === "api_client") return <ApiClientDashboard user={user} logout={handleLogout} />;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20 mb-4">
            कृ.SMS
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {!isRegister ? "Welcome back" : regStep === 1 ? "Create account" : regStep === 2 ? "Verify email" : "Pending approval"}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {!isRegister ? "Sign in to your SMS workspace" : regStep === 1 ? "Register for the SMS portal" : regStep === 2 ? "Enter the code we emailed you" : "Waiting for administrator approval"}
          </p>
        </header>

        {msg.text && (
          <div className={`mb-6 p-3.5 rounded-xl text-sm border text-center font-medium ${
            msg.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
              : "bg-rose-50 border-rose-200 text-rose-600"
          }`}>
            {msg.text}
          </div>
        )}
        
        {/* Login form */}
        {!isRegister && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email address</label>
              <input
                type="email" placeholder="you@example.com" required
                className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-400 text-xs"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <input
                type="password" placeholder="••••••••" required
                className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-400 text-xs"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wide transition-all disabled:opacity-40">
              {isLoading ? "Signing in..." : "Log in"}
            </button>
          </form>
        )}

        {/* Registration flow */}
        {isRegister && (
          <>
            {/* Step 1: account details */}
            {regStep === 1 && (
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Full name</label>
                  <input
                    type="text" placeholder="John Doe" required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-400 text-xs"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email address</label>
                  <input
                    type="email" placeholder="you@example.com" required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-400 text-xs"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                  <input
                    type="password" placeholder="••••••••" required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-gray-400 text-xs"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wide transition-all disabled:opacity-40">
                  {isLoading ? "Sending code..." : "Send verification code"}
                </button>
              </form>
            )}

            {/* Step 2: OTP code */}
            {regStep === 2 && (
              <form onSubmit={handleOtpVerifySubmit} className="space-y-4 animate-fade-in">
                <div className="text-center p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
                  <p className="text-xs text-gray-600">We sent a 6-digit verification code to <span className="text-violet-600 font-mono font-bold">{form.email}</span></p>
                  <span className="text-violet-600 w-full font-mono font-bold"> Tip: check your spam folder.</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center font-mono tracking-widest">Verification code</label>
                  <input
                    type="text" maxLength={6} placeholder="123456" required
                    value={otpCode}
                    className="w-full p-3 text-center text-lg bg-white border border-gray-300 text-violet-600 font-bold font-mono tracking-[0.4em] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all disabled:opacity-40">
                  {isLoading ? "Verifying..." : "Verify code"}
                </button>
                <button type="button" onClick={() => setRegStep(1)} className="w-full text-center text-gray-500 hover:text-gray-700 text-[11px] font-bold">
                  ← Use a different email
                </button>
              </form>
            )}

            {/* Step 3: pending-approval notice */}
            {regStep === 3 && (
              <div className="text-center space-y-4 py-4 animate-fade-in">
                <div className="w-11 h-11 bg-amber-50 border border-amber-200 text-amber-600 text-lg flex items-center justify-center rounded-full mx-auto animate-pulse">
                  ⏳
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">Registration received</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
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
                  className="bg-white border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 text-[11px] font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Back to login
                </button>
              </div>
            )}
          </>
        )}

        {/* Switch between login and registration */}
        {(!isRegister || regStep !== 3) && (
          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p 
              className="text-sm text-gray-500 cursor-pointer hover:text-violet-600 transition-colors inline-block" 
              onClick={() => {
                setIsRegister(!isRegister);
                setRegStep(1);
                setMsg({ text: "", type: "" });
              }}
            >
              {isRegister ? "Already registered? Log in" : "Need an account? Register"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}