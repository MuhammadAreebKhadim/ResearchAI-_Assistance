"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/lib/useChat";
import { useSessions } from "@/lib/useSessions";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import PaperCard from "@/components/PaperCard";

export default function ResearchPage() {
  const { messages, papers, isLoading, isSearching, sendMessage, reset } = useChat();
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    quotaCount,
    maxSessions,
    quotaFull,
    isQuotaModalOpen,
    setIsQuotaModalOpen,
    createSession,
    deleteSession,
    renameSession,
  } = useSessions();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [centerInput, setCenterInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (hasMessages) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, papers, isSearching, hasMessages]);

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = centerInput.trim();
    if (!query) return;

    if (!currentSessionId) {
      const newId = await createSession(query.slice(0, 35) + (query.length > 35 ? "..." : ""));
      if (!newId) return; // blocked by quota
    }

    setCenterInput("");
    sendMessage(query);
  };

  const handlePromptClick = async (text: string) => {
    if (!currentSessionId) {
      const newId = await createSession(text.slice(0, 35) + (text.length > 35 ? "..." : ""));
      if (!newId) return;
    }
    sendMessage(text);
  };

  const handleNewChat = async () => {
    if (quotaFull) {
      setIsQuotaModalOpen(true);
      return;
    }
    reset();
    setCurrentSessionId(null);
  };

  return (
    <div
      style={{ backgroundColor: "var(--color-bg)" }}
      className="flex h-[calc(100vh-56px)] relative overflow-hidden"
    >
      {/* LEFT SIDEBAR: GEMINI-STYLE SESSIONS & 8-CHAT QUOTA */}
      <aside
        style={{
          width: isSidebarOpen ? "270px" : "0px",
          minWidth: isSidebarOpen ? "270px" : "0px",
          backgroundColor: "var(--color-surface)",
          borderRight: isSidebarOpen ? "1px solid var(--color-border)" : "none",
        }}
        className="flex flex-col shrink-0 transition-all duration-200 overflow-hidden relative z-20"
      >
        {/* Top Actions: + New Chat & Sidebar Close */}
        <div className="p-3.5 pb-2.5 flex items-center gap-2">
          <button
            onClick={handleNewChat}
            style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs hover:bg-[var(--color-accent-hover)] transition-all"
            title="Start new research chat"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/>
            </svg>
            <span>New chat</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{ border: "1px solid var(--color-border)" }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        {/* Real-time Quota Meter (Strict 8-session quota limit) */}
        <div
          style={{
            backgroundColor: "var(--color-nav)",
            border: "1px solid var(--color-border)",
          }}
          className="mx-3.5 mb-3 p-2.5 rounded-lg text-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: "var(--color-text-primary)" }} className="font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
              Storage Quota
            </span>
            <span
              style={{ color: quotaFull ? "#ef4444" : "var(--color-accent)" }}
              className="font-bold text-xs"
            >
              {quotaCount} / {maxSessions}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ backgroundColor: "var(--color-border)" }} className="w-full h-1.5 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, (quotaCount / maxSessions) * 100)}%`,
                backgroundColor: quotaFull ? "#ef4444" : "var(--color-accent)",
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <div style={{ color: "var(--color-text-secondary)" }} className="text-[10px] mt-1.5">
            {quotaFull
              ? "Storage limit reached (8/8). Delete a chat to add new."
              : `Limit: 8 chats stored (${maxSessions - quotaCount} slots available).`}
          </div>
        </div>

        {/* Section Label */}
        <div
          style={{ color: "var(--color-text-secondary)" }}
          className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider flex justify-between items-center"
        >
          <span>Recent Research</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
            SQLite Sync
          </span>
        </div>

        {/* Scrollable Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {!user ? (
            <div className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <h4 style={{ color: "var(--color-text-primary)" }} className="text-xs font-bold mb-1">
                Google Sign-In Required
              </h4>
              <p style={{ color: "var(--color-text-secondary)" }} className="text-[11px] leading-relaxed mb-3">
                Sign in with Google to activate chat storage for up to 8 sessions.
              </p>
              <button
                onClick={() => {
                  import("@/lib/auth").then(({ loginWithGoogleDemo }) => {
                    loginWithGoogleDemo().then((res) => {
                      alert(`Signed in as ${res.user.name}!`);
                      window.location.reload();
                    });
                  });
                }}
                style={{ backgroundColor: "var(--color-accent)", color: "white" }}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all"
              >
                Sign in with Google
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ color: "var(--color-text-secondary)" }} className="p-4 text-center text-xs">
              No research chats stored yet.<br/>Click <strong>New chat</strong> to begin saving.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  style={{
                    backgroundColor: isActive ? "var(--color-accent-soft)" : "transparent",
                    color: isActive ? "var(--color-accent)" : "var(--color-text-primary)",
                    borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                  }}
                  className="group px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 hover:bg-[var(--color-accent-soft)] transition-all"
                >
                  <span className="truncate flex-1 font-medium">{s.title || "Untitled Research"}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const t = prompt("New title:", s.title);
                        if (t) renameSession(s.id, t);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this session & free 1 storage slot?")) deleteSession(s.id);
                      }}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-white"
                      title="Delete & free slot"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Sub-header */}
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
          className="px-4 py-2.5 flex items-center justify-between shrink-0 transition-all"
        >
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{ border: "1px solid var(--color-border)" }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-[var(--color-accent)]"
                title="Open sidebar"
              >
                ☰
              </button>
            )}
            <h1
              style={{ color: "var(--color-text-primary)" }}
              className="font-semibold text-xs sm:text-sm flex items-center gap-2 truncate"
            >
              <span>Research Discovery & Mentor</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: "var(--color-accent-soft)",
                color: "var(--color-accent)",
              }}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
            >
              Chats: {quotaCount} / {maxSessions}
            </span>
            <button
              onClick={handleNewChat}
              style={{
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all font-medium"
            >
              + New
            </button>
          </div>
        </div>

        {/* STATE A: GEMINI-STYLE CENTERED LANDING */}
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto px-6 py-12 text-center w-full transition-all">
            <div
              style={{
                backgroundColor: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                border: "1px solid rgba(91, 115, 232, 0.3)",
              }}
              className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
            >
              Research Assistant AI
            </div>

            <h1
              style={{ color: "var(--color-text-primary)" }}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 uppercase"
            >
              START YOUR RESEARCH WITH ASSIST OF AI
            </h1>

            <p
              style={{ color: "var(--color-text-secondary)" }}
              className="text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed"
            >
              Ask any scientific inquiry, explore open problems, or discover verified research literature.
            </p>

            <form onSubmit={handleCenterSubmit} className="w-full mb-6">
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition-all"
              >
                <input
                  type="text"
                  value={centerInput}
                  onChange={(e) => setCenterInput(e.target.value)}
                  placeholder="What are you researching today? Explore ideas or type 'give me papers on [topic]'..."
                  style={{ color: "var(--color-text-primary)" }}
                  className="flex-1 bg-transparent border-none outline-hidden text-sm placeholder:text-[var(--color-text-secondary)]"
                />
                <button
                  type="submit"
                  disabled={!centerInput.trim()}
                  style={{ backgroundColor: "var(--color-accent)" }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-all hover:bg-[var(--color-accent-hover)]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handlePromptClick("What are the key open research challenges in Vision-Language Models?")}
                style={{
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                }}
                className="text-xs px-3 py-1.5 rounded-full hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
              >
                "Challenges in Vision-Language Models"
              </button>
              <button
                onClick={() => handlePromptClick("Give me latest research papers on reinforcement learning in robotics")}
                style={{
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                }}
                className="text-xs px-3 py-1.5 rounded-full hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
              >
                "Papers on RL in Robotics"
              </button>
              <button
                onClick={() => handlePromptClick("How do state-space models like Mamba compare to Transformers?")}
                style={{
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                }}
                className="text-xs px-3 py-1.5 rounded-full hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
              >
                "Mamba vs. Transformer Architectures"
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: ACTIVE MESSAGES FEED */
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {isSearching && (
              <div
                style={{ color: "var(--color-accent)" }}
                className="flex items-center gap-2 text-xs font-medium py-2"
              >
                <div className="w-3.5 h-3.5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                Searching Semantic Scholar, ArXiv & OpenAlex for verified papers...
              </div>
            )}

            {papers.length > 0 && (
              <div className="space-y-3 pt-2">
                <p style={{ color: "var(--color-text-secondary)" }} className="text-xs font-semibold uppercase tracking-wider">
                  Verified Academic Literature ({papers.length} papers):
                </p>
                <div className="grid gap-3">
                  {papers.map((p, idx) => (
                    <PaperCard key={idx} paper={p} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* BOTTOM INPUT BAR */}
        {hasMessages && (
          <div
            style={{
              backgroundColor: "var(--color-bg)",
              borderTop: "1px solid var(--color-border-soft)",
            }}
            className="p-4 shrink-0"
          >
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </div>
        )}
      </main>

      {/* QUOTA LIMIT MODAL (8/8 CHATS) */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            className="rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              ⚠️
            </div>
            <h3 style={{ color: "var(--color-text-primary)" }} className="text-base font-bold mb-2">
              Storage Limit Reached (8/8 Chats)
            </h3>
            <p style={{ color: "var(--color-text-secondary)" }} className="text-xs leading-relaxed mb-5">
              In accordance with your Gemini-style chat quota, storage is strictly capped at <strong>8 sessions</strong>.
              Please delete an existing chat from your sidebar using the trash button (🗑️) to start a new chat.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                style={{ border: "1px solid var(--color-border)" }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg hover:border-[var(--color-accent)] transition-all"
              >
                Review Chats
              </button>
              <button
                onClick={async () => {
                  if (sessions.length > 0) {
                    await deleteSession(sessions[sessions.length - 1].id);
                  }
                  setIsQuotaModalOpen(false);
                  reset();
                  setCurrentSessionId(null);
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                Delete Oldest & New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
