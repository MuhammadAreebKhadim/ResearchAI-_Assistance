"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
      }}
      className="mt-auto transition-colors"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8">
          
          {/* Brand & Description */}
          <div className="max-w-md space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="34" height="34" rx="9" fill="#5b73e8"/>
                  <path d="M7.5 23.8C10.8 22.3 14.5 22.8 17.5 24.8V13.8C14.5 11.8 10.8 11.3 7.5 12.8V23.8Z" fill="#ffffff" fillOpacity="0.95"/>
                  <path d="M28.5 23.8C25.2 22.3 21.5 22.8 18.5 24.8V13.8C21.5 11.8 25.2 11.3 28.5 12.8V23.8Z" fill="#ffffff" fillOpacity="0.95"/>
                  <path d="M18 13.8V25" stroke="#5b73e8" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M18 4.2L19.3 8.3L23.4 9.6L19.3 10.9L18 15L16.7 10.9L12.6 9.6L16.7 8.3L18 4.2Z" fill="#ffffff"/>
                </svg>
              </div>
              <span
                style={{ color: "var(--color-text-primary)" }}
                className="font-bold text-sm tracking-tight"
              >
                Research<span style={{ color: "var(--color-accent)" }}>AI</span>
              </span>
            </Link>
            <p
              style={{ color: "var(--color-text-secondary)" }}
              className="text-xs leading-relaxed"
            >
              An intelligent academic workspace designed to help researchers, graduate students, and scholars explore literature, comprehend complex papers, and find aligned research mentors.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-500 pt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All research services operational</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4
              style={{ color: "var(--color-text-primary)" }}
              className="text-xs font-semibold uppercase tracking-wider mb-3"
            >
              Navigation
            </h4>
            <ul className="flex flex-wrap md:flex-col gap-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <li>
                <Link href="/" className="hover:text-[var(--color-accent)] hover:translate-x-1 inline-flex items-center transition-all duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/research" className="hover:text-[var(--color-accent)] hover:translate-x-1 inline-flex items-center transition-all duration-200">
                  Start Research
                </Link>
              </li>
              <li>
                <Link href="/paper" className="hover:text-[var(--color-accent)] hover:translate-x-1 inline-flex items-center transition-all duration-200">
                  Paper Explainer
                </Link>
              </li>
              <li>
                <Link href="/collaborate" className="hover:text-[var(--color-accent)] hover:translate-x-1 inline-flex items-center transition-all duration-200">
                  Collaboration Finder
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom divider & copyright */}
        <div
          style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
          className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-3"
        >
          <p>&copy; 2026 ResearchAI Assistant. Built with OpenAI & Academic APIs.</p>
          <div className="flex items-center gap-3">
            <span>Semantic Discovery</span>
            <span>&bull;</span>
            <span>Paper Simplifier</span>
            <span>&bull;</span>
            <span>Advisor Matcher</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
