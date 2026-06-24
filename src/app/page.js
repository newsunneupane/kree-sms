"use client";
import { useState, useEffect } from "react";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState({ text: "", type: "" }); // Upgraded for status styling
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("sms_session");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingSession(false);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    const action = isRegister ? "register" : "login";
    
    try {
      const res = await fetch("http://localhost/sms-backend/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...form }),
      });
      const data = await res.json();
      
      if (data.success) {
        if (!isRegister) {
          localStorage.setItem("sms_session", JSON.stringify(data.user));
          setUser(data.user);
        } else {
          setMsg({ text: data.message || "Registration successful! Please login.", type: "success" });
          setIsRegister(false);
        }
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Connection to local backend server failed.", type: "error" });
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
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 hover:border-slate-700/80">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20 mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {isRegister ? "Join the SaaS SMS Portal Gateway" : "Access your secure workspace"}
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
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
              <input
                type="text" placeholder="John Doe" required
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 placeholder:text-slate-600"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
            <input
              type="email" placeholder="you@example.com" required
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 placeholder:text-slate-600"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <input
              type="password" placeholder="••••••••" required
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 placeholder:text-slate-600"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button type="submit" className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.99] transition-all duration-150">
            {isRegister ? "Sign Up" : "Secure Log In"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
          <p 
            className="text-sm text-slate-400 cursor-pointer hover:text-violet-400 transition-colors inline-block" 
            onClick={() => {
              setIsRegister(!isRegister);
              setMsg({ text: "", type: "" });
            }}
          >
            {isRegister ? "Already registered? Login here" : "Need a platform account? Register here"}
          </p>
        </div>
      </div>
    </main>
  );
}