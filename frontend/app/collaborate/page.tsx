"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export default function CollaboratePage() {
  const [professorName, setProfessorName] = useState("");
  const [university, setUniversity] = useState("");
  const [profPaperText, setProfPaperText] = useState("");
  const [userResearch, setUserResearch] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  // Interactive Follow-up Chat State
  const [collabChatQuery, setCollabChatQuery] = useState("");
  const [collabChatHistory, setCollabChatHistory] = useState<ChatTurn[]>([]);
  const [isCollabChatting, setIsCollabChatting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    (professorName.trim() || profPaperText.trim() || pdfFile) &&
    userResearch.trim() &&
    !isStreaming;

  const handleAnalyze = async () => {
    if (!canSubmit) return;
    setError("");
    setResult("");
    setIsStreaming(true);
    setIsDone(false);
    setCollabChatHistory([]);

    const form = new FormData();
    if (professorName.trim()) form.append("professor_name", professorName.trim());
    if (university.trim()) form.append("professor_university", university.trim());
    if (profPaperText.trim()) form.append("professor_paper_text", profPaperText.trim());
    form.append("user_research_summary", userResearch.trim());
    if (pdfFile) form.append("professor_pdf", pdfFile);

    try {
      const res = await fetch(`${API_BASE}/api/professor/analyze/stream`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Analysis failed with status ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") setResult((p) => p + ev.content);
            if (ev.type === "done") setIsDone(true);
          } catch {}
        }
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Analysis failed. Please verify your backend server or input details."
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCollabFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = collabChatQuery.trim();
    if (!query || isCollabChatting) return;

    setCollabChatQuery("");
    const updatedHistory: ChatTurn[] = [
      ...collabChatHistory,
      { role: "user", content: query },
      { role: "assistant", content: "" },
    ];
    setCollabChatHistory(updatedHistory);
    setIsCollabChatting(true);

    const profInfo = `
Professor: ${professorName || "Target Scholar"}
Institution: ${university || "N/A"}
${profPaperText ? `Paper Text Excerpt: ${profPaperText.slice(0, 1500)}` : ""}
${pdfFile ? `PDF Uploaded: ${pdfFile.name}` : ""}
Alignment Analysis:
${result.slice(0, 3000)}
    `.trim();

    const form = new FormData();
    form.append("professor_info", profInfo);
    form.append("user_info", userResearch);
    form.append("question", query);
    form.append(
      "history",
      JSON.stringify(collabChatHistory.map((h) => ({ role: h.role, content: h.content })))
    );

    try {
      const res = await fetch(`${API_BASE}/api/professor/chat/stream`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error("Failed to get advisor response.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") {
              answer += ev.content;
              setCollabChatHistory((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = { role: "assistant", content: answer };
                }
                return next;
              });
            }
          } catch {}
        }
      }
    } catch {
      setCollabChatHistory((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            role: "assistant",
            content: "Sorry, I could not complete the response. Please try again.",
          };
        }
        return next;
      });
    } finally {
      setIsCollabChatting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)" }} className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1
          style={{ color: "var(--color-text-primary)" }}
          className="text-2xl font-semibold mb-1 tracking-tight"
        >
          Collaboration Finder
        </h1>
        <p
          style={{ color: "var(--color-text-secondary)" }}
          className="text-sm mb-8"
        >
          Provide a professor&apos;s details to analyze their research profile and
          discover how well your work aligns for a potential collaboration.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Input Form (ZERO Mock Prefilled Data) */}
          <div className="space-y-4">
            <div>
              <label
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs font-semibold block mb-1.5"
              >
                Professor&apos;s Full Name
              </label>
              <input
                value={professorName}
                onChange={(e) => setProfessorName(e.target.value)}
                placeholder="e.g. Geoffrey Hinton, Fei-Fei Li, Yoshua Bengio..."
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            <div>
              <label
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs font-semibold block mb-1.5"
              >
                University / Institution{" "}
                <span style={{ color: "var(--color-text-muted)" }} className="font-normal">
                  (optional)
                </span>
              </label>
              <input
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Stanford University, MIT, Oxford..."
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: "var(--color-border)" }}
                className="flex-1 h-px"
              />
              <span style={{ color: "var(--color-text-muted)" }} className="text-xs">
                and / or provide their paper
              </span>
              <div
                style={{ backgroundColor: "var(--color-border)" }}
                className="flex-1 h-px"
              />
            </div>

            {/* Functional PDF Drag and Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith(".pdf")) setPdfFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${
                  isDragging ? "var(--color-accent)" : "var(--color-border)"
                }`,
                backgroundColor: isDragging
                  ? "var(--color-accent-soft)"
                  : "var(--color-surface)",
              }}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[var(--color-accent)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPdfFile(f);
                }}
              />
              <p
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs font-medium"
              >
                {pdfFile
                  ? `✓ Selected: ${pdfFile.name}`
                  : "Drop professor's paper PDF here, or click to browse"}
              </p>
              {pdfFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfFile(null);
                  }}
                  style={{ color: "var(--color-accent)" }}
                  className="text-xs underline mt-1"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Paste Paper Text */}
            <div>
              <label
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs font-semibold block mb-1.5"
              >
                Or Paste Professor&apos;s Paper / Abstract Text
              </label>
              <textarea
                value={profPaperText}
                onChange={(e) => setProfPaperText(e.target.value)}
                rows={2}
                placeholder="Paste the abstract or key excerpt from a specific paper of theirs..."
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                className="w-full rounded-xl p-3 text-xs outline-none resize-none focus:border-[var(--color-accent)] transition-colors leading-relaxed"
              />
            </div>

            {/* User Research Summary */}
            <div>
              <label
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs font-semibold block mb-1.5"
              >
                Your Research Background &amp; Current Work{" "}
                <span className="text-amber-500">*</span>
              </label>
              <textarea
                value={userResearch}
                onChange={(e) => setUserResearch(e.target.value)}
                rows={4}
                placeholder="Describe your research background, prior projects, algorithms you know, and topics you want to investigate..."
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                className="w-full rounded-xl p-3.5 text-xs outline-none resize-vertical focus:border-[var(--color-accent)] transition-colors leading-relaxed"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!canSubmit}
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
              className="w-full py-3 rounded-xl text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-50"
            >
              {isStreaming ? "Analyzing Collaboration Alignment..." : "Analyze Collaboration Fit"}
            </button>

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          {/* Right: Dynamic Alignment Report & Advisor Chat */}
          <div className="space-y-4">
            {!result && (
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
                className="rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[380px]"
              >
                <div
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="17" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M3 20c0-3 2-5 6-5M21 20c0-3-2-5-6-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3
                  style={{ color: "var(--color-text-primary)" }}
                  className="font-semibold text-sm mb-1"
                >
                  Alignment report will appear here
                </h3>
                <p
                  style={{ color: "var(--color-text-muted)" }}
                  className="text-xs max-w-xs leading-relaxed"
                >
                  Provide the professor&apos;s details and your research summary, then
                  click Analyze.
                </p>
              </div>
            )}

            {/* Generated Report Card */}
            {result && (
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
                className="rounded-2xl p-6 overflow-y-auto max-h-[460px] text-xs leading-relaxed prose prose-sm max-w-none"
              >
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            )}

            {/* Interactive Collaboration Advisor Chat */}
            {result && (
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
                className="rounded-2xl p-4 space-y-3"
              >
                <div>
                  <h4
                    style={{ color: "var(--color-text-primary)" }}
                    className="text-xs font-semibold"
                  >
                    Ask Collaboration Advisor:
                  </h4>
                  <p
                    style={{ color: "var(--color-text-muted)" }}
                    className="text-[11px]"
                  >
                    Ask how to bridge technical gaps, what papers to read, or how to pitch.
                  </p>
                </div>

                {collabChatHistory.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border-soft)",
                    }}
                    className="rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 text-xs"
                  >
                    {collabChatHistory.map((turn, idx) => (
                      <div key={idx}>
                        <span
                          style={{
                            color:
                              turn.role === "user"
                                ? "var(--color-text-primary)"
                                : "var(--color-accent)",
                          }}
                          className="font-semibold"
                        >
                          {turn.role === "user" ? "You: " : "Advisor: "}
                        </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {turn.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleCollabFollowup} className="flex gap-2">
                  <input
                    value={collabChatQuery}
                    onChange={(e) => setCollabChatQuery(e.target.value)}
                    placeholder="e.g. 'How can I specifically align my work with this professor?'"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                    className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="submit"
                    disabled={!collabChatQuery.trim() || isCollabChatting}
                    style={{
                      backgroundColor: "var(--color-accent)",
                      color: "white",
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-50"
                  >
                    Ask
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
