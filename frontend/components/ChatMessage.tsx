"use client";

import { Message } from "@/lib/useChat";

interface Props {
  message: Message;
}

// Very lightweight markdown-to-html (handles bold, headers, lists)
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hlu])(.+)$/gm, (m) => (m.trim() ? m : ""))
    .replace(/\n/g, "<br/>");
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex animate-fade-up ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div
          style={{
            backgroundColor: "var(--color-accent)",
            flexShrink: 0,
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center mr-3 mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1a6 6 0 100 12A6 6 0 007 1zm0 2a1 1 0 110 2 1 1 0 010-2zm0 3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 017 6z"
              fill="white"
            />
          </svg>
        </div>
      )}

      <div
        style={{
          backgroundColor: isUser ? "var(--color-accent)" : "var(--color-surface)",
          color: isUser ? "white" : "var(--color-text-primary)",
          border: isUser ? "none" : "1px solid var(--color-border)",
          maxWidth: "72%",
        }}
        className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
      >
        {message.isStreaming && !message.content ? (
          <TypingIndicator />
        ) : (
          <div
            className="prose-chat"
            dangerouslySetInnerHTML={{
              __html: `<p>${renderMarkdown(message.content)}</p>`,
            }}
          />
        )}
        {message.isStreaming && message.content && (
          <span
            style={{ backgroundColor: "var(--color-accent)" }}
            className="inline-block w-0.5 h-4 ml-0.5 animate-pulse rounded"
          />
        )}
      </div>

      {isUser && (
        <div
          style={{
            backgroundColor: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            flexShrink: 0,
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center ml-3 mt-0.5"
          title="You"
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
          </svg>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span
        className="typing-dot w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: "var(--color-accent)" }}
      />
      <span
        className="typing-dot w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: "var(--color-accent)" }}
      />
      <span
        className="typing-dot w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: "var(--color-accent)" }}
      />
    </div>
  );
}
