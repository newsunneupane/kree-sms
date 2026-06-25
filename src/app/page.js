"use client";
import { useState, useEffect } from "react";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  
  // 🚀 REGISTRATION ONBOARDING STATE MIGRATION VECTORS
  const [regStep, setRegStep] = useState(1); // 1 = Detail Input, 2 = Pin Input, 3 = Hold Status Screen
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState({ text: "", type: "" }); 
  const [checkingSession, setCheckingSession] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const savedUser = localStorage.getItem("sms_session");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingSession(false);
  }, []);

  // --- STEP 1: HANDLE STANDARD LOGIN LOGIC PACKETS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);
    
    try {
      const res = await fetch("${baseUrl}/sms-backend/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: form.email, password: form.password }),
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem("sms_session", JSON.stringify(data.user));
        setUser(data.user);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Connection to local login server failed.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 2: HANDLE INITIAL STAGING DISPATCH PACKETS ---
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);

    try {
      const res = await fetch("${baseUrl}/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_registration", ...form }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMsg({ text: data.message, type: "success" });
        setRegStep(2); // Progress to the secure OTP checking form layout
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Staging server link dropped.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 3: HANDLE SECURITY CODE VALIDATION PACKETS ---
  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setIsLoading(true);

    try {
      const res = await fetch("${baseUrl}/sms-backend/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email: form.email, otp: otpCode }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMsg({ text: "", type: "" });
        setRegStep(3); // Shift view to admin verification hold grid lock screen
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Authentication token handshake failed.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sms_session");
    setUser(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">Initializing secure session...</p>
      </div>
    );
  }

  if (user && user.role === "user") return <UserDashboard user={user} logout={handleLogout} />;
  if (user && user.role === "admin") return <AdminDashboard admin={user} logout={handleLogout} />;

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden civilian-theme">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 hover:border-slate-700/80">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20 mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {!isRegister ? "Welcome Back" : regStep === 1 ? "Create Account" : regStep === 2 ? "Verify Email" : "Staged Pending"}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {!isRegister ? "Access your secure workspace" : regStep === 1 ? "Join the SaaS SMS Portal Gateway" : regStep === 2 ? "Security token validation check" : "Awaiting administrator approval"}
          </p>
        </header>

        {msg.text && (
          <div className={`mb-6 p-3.5 rounded-xl text-sm border text-center font-medium ${
            msg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}>
            {msg.text}
          </div>
        )}
        
        {/* VIEW MODE 1: LOGIN PORTAL FORM INTERFACE */}
        {!isRegister && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <input
                type="email" placeholder="you@example.com" required
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-600 text-xs"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <input
                type="password" placeholder="••••••••" required
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-600 text-xs"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wide transition-all disabled:opacity-40">
              {isLoading ? "Validating Session..." : "Secure Log In"}
            </button>
          </form>
        )}

        {/* VIEW MODE 2: REGISTRATION METADATA FLOWS */}
        {isRegister && (
          <>
            {/* SUB-STEP 1: METADATA DETAILS FORMS */}
            {regStep === 1 && (
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text" placeholder="John Doe" required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900 text-xs"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email" placeholder="you@example.com" required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900 text-xs"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                  <input
                    type="password" placeholder="••••••••" required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900 text-xs"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wide transition-all disabled:opacity-40">
                  {isLoading ? "Processing Data..." : "Request Email Verification OTP"}
                </button>
              </form>
            )}

            {/* SUB-STEP 2: SIX-DIGIT SECURITY PIN CHECK BOX INTERFACE */}
            {regStep === 2 && (
              <form onSubmit={handleOtpVerifySubmit} className="space-y-4 animate-fade-in">
                <div className="text-center p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-400">A security access verification PIN was dispatched to <span className="text-violet-400 font-mono font-bold">{form.email}</span></p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-center font-mono tracking-widest">Enter Verification Code</label>
                  <input
                    type="text" maxLength={6} placeholder="123456" required
                    value={otpCode}
                    className="w-full p-3 text-center text-lg bg-slate-950/50 border border-slate-800 text-violet-400 font-bold font-mono tracking-[0.4em] rounded-xl focus:outline-none focus:border-violet-500 bg-slate-900"
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all disabled:opacity-40">
                  {isLoading ? "Validating code registry..." : "Verify OTP Code Token"}
                </button>
                <button type="button" onClick={() => setRegStep(1)} className="w-full text-center text-slate-600 hover:text-slate-500 text-[11px] font-bold">
                  ← Fix input email errors
                </button>
              </form>
            )}

            {/* SUB-STEP 3: REGISTRATION HOLDING GRID INTERFACE */}
            {regStep === 3 && (
              <div className="text-center space-y-4 py-4 animate-fade-in">
                <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-lg flex items-center justify-center rounded-full mx-auto animate-pulse">
                  ⏳
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">Verification Request Staged</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Your verification parameters succeeded! Your application is waiting inside the admin whitelisting queue. Once authorized, your login window access clears.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setRegStep(1);
                    setMsg({ text: "", type: "" });
                  }}
                  className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-[11px] font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Return to standard login panel
                </button>
              </div>
            )}
          </>
        )}

        {/* BOTTOM MATRIX ACCESS ROUTER INTERACTORS */}
        {(!isRegister || regStep !== 3) && (
          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
            <p 
              className="text-sm text-slate-400 cursor-pointer hover:text-violet-400 transition-colors inline-block" 
              onClick={() => {
                setIsRegister(!isRegister);
                setRegStep(1);
                setMsg({ text: "", type: "" });
              }}
            >
              {isRegister ? "Already registered? Login here" : "Need a platform account? Register here"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
