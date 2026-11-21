"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "summary" | "simplify" | "deep" | "qa";
type InputTab = "upload" | "paste";

interface PaperInfo {
  paper_id: string;
  filename: string;
  word_count: number;
  sections_found: string[];
}

export default function PaperPage() {
  const [inputTab, setInputTab] = useState<InputTab>("upload");
  const [paperInfo, setPaperInfo] = useState<PaperInfo | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode>("summary");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Paste text state
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are supported.");
      return;
    }
    setErrorMessage("");
    setStatusMessage(`Uploading and extracting text from: ${file.name}...`);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/paper/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed with status ${res.status}`);
      }
      const data: PaperInfo = await res.json();
      setPaperInfo(data);
      setStatusMessage("");
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Could not upload PDF. Ensure backend is running or paste text instead."
      );
      setStatusMessage("");
    }
  };

  const handlePasteSubmit = async () => {
    if (pasteText.trim().length < 50) {
      setErrorMessage("Please paste at least 50 characters of paper text or abstract.");
      return;
    }
    setErrorMessage("");
    setStatusMessage("Processing pasted text...");

    try {
      const res = await fetch(`${API_BASE}/api/paper/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pasteTitle.trim() || "Pasted Research Paper",
          text: pasteText.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to process text.");
      }
      const data: PaperInfo = await res.json();
      setPaperInfo(data);
      setStatusMessage("");
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Error processing pasted text."
      );
      setStatusMessage("");
    }
  };

  const handleAnalyze = async () => {
    if (!paperInfo) return;
    if (selectedMode === "qa" && !question.trim()) {
      setErrorMessage("Please type a question to ask about this paper.");
      return;
    }
    setErrorMessage("");
    setResult("");
    setIsStreaming(true);

    const form = new FormData();
    form.append("paper_id", paperInfo.paper_id);
    form.append("mode", selectedMode);
    if (selectedMode === "qa") form.append("question", question);

    try {
      const res = await fetch(`${API_BASE}/api/paper/explain/stream`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Explanation stream failed.");
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
          } catch {}
        }
      }
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to analyze paper."
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClear = () => {
    setPaperInfo(null);
    setResult("");
    setQuestion("");
    setPasteText("");
    setPasteTitle("");
    setErrorMessage("");
    setStatusMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)" }} className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1
          style={{ color: "var(--color-text-primary)" }}
          className="text-2xl font-semibold mb-1 tracking-tight"
        >
          Paper Explainer
        </h1>
        <p
          style={{ color: "var(--color-text-secondary)" }}
          className="text-sm mb-6"
        >
          Upload any research paper PDF or paste text directly to choose how you want it explained.
        </p>

        {/* Tab Switcher: Upload PDF vs Paste Text */}
        {!paperInfo && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInputTab("upload")}
              style={{
                backgroundColor:
                  inputTab === "upload"
                    ? "var(--color-accent-soft)"
                    : "var(--color-surface)",
                color:
                  inputTab === "upload"
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                borderColor:
                  inputTab === "upload"
                    ? "var(--color-accent)"
                    : "var(--color-border)",
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            >
              Upload PDF File
            </button>
            <button
              onClick={() => setInputTab("paste")}
              style={{
                backgroundColor:
                  inputTab === "paste"
                    ? "var(--color-accent-soft)"
                    : "var(--color-surface)",
                color:
                  inputTab === "paste"
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                borderColor:
                  inputTab === "paste"
                    ? "var(--color-accent)"
                    : "var(--color-border)",
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            >
              Paste Paper Text
            </button>
          </div>
        )}

        {/* Mode A: Real PDF Upload Dropzone */}
        {!paperInfo && inputTab === "upload" && (
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
              if (file) handleFileUpload(file);
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
            className="rounded-2xl p-10 text-center cursor-pointer transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <div
              style={{
                backgroundColor: "var(--color-accent-soft)",
                color: "var(--color-accent)",
              }}
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0l-4 4m4-4l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 20h16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p
              style={{ color: "var(--color-text-primary)" }}
              className="font-medium text-sm"
            >
              Drop your PDF here, or click to browse
            </p>
            <p
              style={{ color: "var(--color-text-muted)" }}
              className="text-xs mt-1"
            >
              Supports all academic PDF documents up to 50 MB
            </p>
          </div>
        )}

        {/* Mode B: Paste Paper Text */}
        {!paperInfo && inputTab === "paste" && (
          <div className="space-y-3">
            <input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Paper Title (optional)"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder="Paste the paper abstract, introduction, or full paper text here..."
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              className="w-full border rounded-xl p-4 text-sm leading-relaxed outline-none resize-vertical focus:border-[var(--color-accent)]"
            />
            <button
              onClick={handlePasteSubmit}
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all"
            >
              Load Paper Text
            </button>
          </div>
        )}

        {/* Status & Error feedback */}
        {statusMessage && (
          <p
            style={{ color: "var(--color-accent)" }}
            className="text-xs mt-3 animate-fade-in"
          >
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p className="text-xs text-red-500 mt-3 animate-fade-in">
            {errorMessage}
          </p>
        )}

        {/* Once Loaded: Paper Details & Explanation Modes */}
        {paperInfo && (
          <div className="space-y-6 mt-6">
            <div
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
              className="rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
                    <path
                      d="M3 2h8l4 4v9H3V2z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <div
                    style={{ color: "var(--color-text-primary)" }}
                    className="font-medium text-sm truncate max-w-md"
                  >
                    {paperInfo.filename}
                  </div>
                  <div
                    style={{ color: "var(--color-text-muted)" }}
                    className="text-xs"
                  >
                    {paperInfo.word_count.toLocaleString()} words extracted ·{" "}
                    {paperInfo.sections_found.length} sections found
                  </div>
                </div>
              </div>
              <button
                onClick={handleClear}
                style={{ color: "var(--color-text-muted)" }}
                className="text-xs hover:text-[var(--color-accent)] underline transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Mode selection buttons */}
            <div>
              <p
                style={{ color: "var(--color-text-primary)" }}
                className="text-xs font-semibold mb-3 tracking-wide uppercase"
              >
                Choose Explanation Mode:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "summary" as Mode,
                    title: "Quick Summary",
                    desc: "Core problem, approach & key findings.",
                  },
                  {
                    id: "simplify" as Mode,
                    title: "Simplified Explanation",
                    desc: "Plain language intuition without jargon (ELI15).",
                  },
                  {
                    id: "deep" as Mode,
                    title: "Deep Breakdown",
                    desc: "Detailed section-by-section technical analysis.",
                  },
                  {
                    id: "qa" as Mode,
                    title: "Ask a Specific Question",
                    desc: "Query any formula, claim, or methodology.",
                  },
                ].map((m) => {
                  const isSelected = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMode(m.id)}
                      style={{
                        backgroundColor: isSelected
                          ? "var(--color-accent-soft)"
                          : "var(--color-surface)",
                        borderColor: isSelected
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                      }}
                      className="text-left p-3.5 rounded-xl border transition-all"
                    >
                      <div
                        style={{
                          color: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-text-primary)",
                        }}
                        className="font-semibold text-xs mb-1"
                      >
                        {m.title}
                      </div>
                      <div
                        style={{ color: "var(--color-text-secondary)" }}
                        className="text-xs"
                      >
                        {m.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom QA input */}
            {selectedMode === "qa" && (
              <div>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What specific question do you want answered about this paper?..."
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isStreaming}
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
              }}
              className="w-full py-3 rounded-xl text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-50"
            >
              {isStreaming ? "Analyzing Paper..." : "Analyze Paper"}
            </button>
          </div>
        )}

        {/* Real Analysis Output */}
        {result && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <span
                style={{
                  backgroundColor: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                }}
                className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
              >
                {selectedMode === "summary"
                  ? "Executive Summary"
                  : selectedMode === "simplify"
                  ? "Simplified Explanation"
                  : selectedMode === "deep"
                  ? "Deep Breakdown"
                  : "Q&A Analysis"}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  alert("Analysis copied to clipboard!");
                }}
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
                className="border text-xs px-2.5 py-1 rounded-lg hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
              >
                Copy Text
              </button>
            </div>

            <div
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              className="border rounded-2xl p-6 text-sm leading-relaxed prose prose-sm max-w-none"
            >
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
