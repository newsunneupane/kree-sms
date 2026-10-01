import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "KreeSMS — SMS Gateway Portal",
  description: "Single/ bulk/ dynamic SMS, phonebook, scheduling and credit management on the Aakash SMS gateway.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('kreesms-theme');
                  var d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (d) {
                    var r = document.documentElement;
                    r.style.setProperty('--color-gray-50', '#020617');
                    r.style.setProperty('--color-gray-100', '#0f172a');
                    r.style.setProperty('--color-gray-200', '#1e293b');
                    r.style.setProperty('--color-gray-300', '#334155');
                    r.style.setProperty('--color-gray-400', '#475569');
                    r.style.setProperty('--color-gray-500', '#64748b');
                    r.style.setProperty('--color-gray-600', '#94a3b8');
                    r.style.setProperty('--color-gray-700', '#cbd5e1');
                    r.style.setProperty('--color-gray-800', '#e2e8f0');
                    r.style.setProperty('--color-gray-900', '#f1f5f9');
                    r.style.setProperty('--color-white', '#0f172a');
                    r.style.setProperty('--background', '#0f172a');
                    r.style.setProperty('--foreground', '#f1f5f9');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}