"use client";
import { useState, useEffect } from "react";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // 1. Check for an existing session in localStorage when the page first loads
  useEffect(() => {
    const savedUser = localStorage.getItem("sms_session");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingSession(false);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMsg("");
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
          // 2. Save the user session data securely inside the browser cache on successful login
          localStorage.setItem("sms_session", JSON.stringify(data.user));
          setUser(data.user);
        } else {
          setMsg(data.message);
          setIsRegister(false);
        }
      } else {
        setMsg(data.message);
      }
    } catch (err) {
      setMsg("Connection to local backend server failed.");
    }
  };

  const handleLogout = () => {
    // 3. Clear the cache completely when the user purposefully logs out
    localStorage.removeItem("sms_session");
    setUser(null);
  };

  // Prevent flash layout transitions while initializing storage values
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
        Loading Session Context...
      </div>
    );
  }

  if (user && user.role === "user") return <UserDashboard user={user} logout={handleLogout} />;
  if (user && user.role === "admin") return <AdminDashboard admin={user} logout={handleLogout} />;

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isRegister ? "Create Platform Account" : "SaaS SMS Portal Gateway"}
        </h2>
        {msg && <p className="mb-4 text-sm text-center font-semibold text-blue-600">{msg}</p>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <input
              type="text" placeholder="Full Name" required
              className="w-full p-2 border border-gray-300 text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            type="email" placeholder="Email Address" required
            className="w-full p-2 border border-gray-300 text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Account Password" required
            className="w-full p-2 border border-gray-300 text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-semibold transition-colors">
            {isRegister ? "Sign Up" : "Secure Log In"}
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-gray-500 cursor-pointer hover:underline" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already registered? Login here" : "Need a platform account? Register here"}
        </p>
      </div>
    </main>
  );
}