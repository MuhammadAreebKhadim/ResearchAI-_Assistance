"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Start Research" },
  { href: "/paper", label: "Paper Explainer" },
  { href: "/collaborate", label: "Collaboration" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <header
      style={{
        backgroundColor: "var(--color-nav)",
        borderBottom: "1px solid var(--color-border)",
      }}
      className="sticky top-0 z-50 backdrop-blur-md transition-colors"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="reactNavLogoBg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4f65f6"/>
                  <stop offset="50%" stopColor="#5b73e8"/>
                  <stop offset="100%" stopColor="#7c8ff8"/>
                </linearGradient>
                <linearGradient id="reactNavPageGlow" x1="7" y1="12" x2="29" y2="25" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#eef2ff"/>
                </linearGradient>
                <linearGradient id="reactNavSparkGrad" x1="13" y1="4" x2="23" y2="16" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="100%" stopColor="#93c5fd"/>
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="34" height="34" rx="9" fill="url(#reactNavLogoBg)"/>
              <rect x="1" y="1" width="34" height="34" rx="9" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
              <path d="M7.5 23.8C10.8 22.3 14.5 22.8 17.5 24.8V13.8C14.5 11.8 10.8 11.3 7.5 12.8V23.8Z" fill="url(#reactNavPageGlow)" fillOpacity="0.96"/>
              <path d="M28.5 23.8C25.2 22.3 21.5 22.8 18.5 24.8V13.8C21.5 11.8 25.2 11.3 28.5 12.8V23.8Z" fill="url(#reactNavPageGlow)" fillOpacity="0.96"/>
              <path d="M18 13.8V25" stroke="#4f65f6" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M10.2 16.2C12.2 15.4 14.6 15.6 16 16.5" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.7"/>
              <path d="M10.2 19.2C12.2 18.4 14.6 18.6 16 19.5" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.7"/>
              <path d="M25.8 16.2C23.8 15.4 21.4 15.6 20 16.5" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.7"/>
              <path d="M25.8 19.2C23.8 18.4 21.4 18.6 20 19.5" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.7"/>
              <path d="M18 4.2L19.3 8.3L23.4 9.6L19.3 10.9L18 15L16.7 10.9L12.6 9.6L16.7 8.3L18 4.2Z" fill="url(#reactNavSparkGrad)"/>
              <circle cx="18" cy="9.6" r="1.1" fill="#ffffff"/>
            </svg>
          </div>
          <div className="flex items-center">
            <span
              style={{ color: "var(--color-text-primary)" }}
              className="font-bold text-base tracking-tight"
            >
              Research<span style={{ color: "var(--color-accent)" }} className="font-extrabold">AI</span>
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: isActive
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                  backgroundColor: isActive
                    ? "var(--color-accent-soft)"
                    : "transparent",
                  fontWeight: isActive ? "600" : "400",
                }}
                className="relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA & Dark Mode Toggle & Google Auth */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            style={{
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-secondary)",
            }}
            className="p-1.5 rounded-lg hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
            title="Toggle Dark/Light Mode"
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Google Sign-in / User Profile */}
          <button
            onClick={() => {
              const savedUser = localStorage.getItem("researchai_auth_user");
              if (savedUser) {
                if (confirm("Sign out of ResearchAI?")) {
                  localStorage.removeItem("researchai_auth_token");
                  localStorage.removeItem("researchai_auth_user");
                  window.location.reload();
                }
              } else {
                import("@/lib/auth").then(({ loginWithGoogleDemo }) => {
                  loginWithGoogleDemo().then((res) => {
                    alert(`Signed in as ${res.user.name}!`);
                    window.location.reload();
                  });
                });
              }
            }}
            style={{
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-[var(--color-accent)] transition-all"
            title="Google Sign-In / Account"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in</span>
          </button>

          <Link
            href="/collaborate"
            style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            className="hidden sm:inline-block px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--color-accent-hover)] shadow-xs"
          >
            Find Advisor
          </Link>
        </div>
      </div>
    </header>
  );
}
