"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
      className="rounded-2xl flex items-end gap-3 px-4 py-3 shadow-sm focus-within:border-[var(--color-accent)] transition-colors"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder || "Type your message... (Enter to send, Shift+Enter for new line)"}
        rows={1}
        style={{
          color: "var(--color-text-primary)",
          caretColor: "var(--color-accent)",
          resize: "none",
          outline: "none",
          background: "transparent",
        }}
        className="flex-1 text-sm leading-relaxed placeholder-[var(--color-text-muted)] disabled:opacity-50"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            const trimmed = value.trim();
            if (!trimmed || disabled) return;
            onSend(`Give me latest research papers on ${trimmed}`);
            setValue("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";
          }}
          disabled={!value.trim() || disabled}
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-accent)",
          }}
          className="border rounded-xl px-2.5 py-1.5 text-xs flex items-center gap-1 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Fetch verified research papers on this topic"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.75 3a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h6.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-6.5zm0-1.5h6.5A2.25 2.25 0 0 1 13.5 3.75v8.5A2.25 2.25 0 0 1 11.25 14.5h-6.5A2.25 2.25 0 0 1 2.5 12.25v-8.5A2.25 2.25 0 0 1 4.75 1.5z"/>
          </svg>
          <span className="hidden sm:inline font-medium">Fetch Papers</span>
        </button>

        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          style={{
            backgroundColor:
              value.trim() && !disabled
                ? "var(--color-accent)"
                : "var(--color-border)",
            color: value.trim() && !disabled ? "white" : "var(--color-text-muted)",
          }}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed hover:bg-[var(--color-accent-hover)]"
          title="Send message to AI Mentor"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 8H2M8 2l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
