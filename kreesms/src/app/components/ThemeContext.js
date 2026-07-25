"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

const darkVars = {
  "--color-gray-50": "#020617",
  "--color-gray-100": "#0f172a",
  "--color-gray-200": "#1e293b",
  "--color-gray-300": "#334155",
  "--color-gray-400": "#475569",
  "--color-gray-500": "#64748b",
  "--color-gray-600": "#94a3b8",
  "--color-gray-700": "#cbd5e1",
  "--color-gray-800": "#e2e8f0",
  "--color-gray-900": "#f1f5f9",
  "--color-white": "#0f172a",
  "--background": "#0f172a",
  "--foreground": "#f1f5f9",
};

const lightVars = {
  "--color-gray-50": "#f9fafb",
  "--color-gray-100": "#f3f4f6",
  "--color-gray-200": "#e5e7eb",
  "--color-gray-300": "#d1d5db",
  "--color-gray-400": "#9ca3af",
  "--color-gray-500": "#6b7280",
  "--color-gray-600": "#4b5563",
  "--color-gray-700": "#374151",
  "--color-gray-800": "#1f2937",
  "--color-gray-900": "#111827",
  "--color-white": "#ffffff",
  "--background": "#ffffff",
  "--foreground": "#171717",
};

function applyTheme(root, vars) {
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kreesms-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    setIsDark(dark);
    applyTheme(document.documentElement, dark ? darkVars : lightVars);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("kreesms-theme", next ? "dark" : "light");
      applyTheme(document.documentElement, next ? darkVars : lightVars);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);