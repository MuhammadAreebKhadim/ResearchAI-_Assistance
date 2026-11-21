"use client";

import { PaperResult } from "@/lib/useChat";

interface Props {
  papers: PaperResult[];
}

export default function PaperCard({ papers }: Props) {
  if (!papers.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <p
        style={{ color: "var(--color-text-secondary)" }}
        className="text-xs font-medium uppercase tracking-wide px-1"
      >
        {papers.length} papers found
      </p>
      {papers.map((paper, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
          className="rounded-xl p-4 hover:shadow-md transition-all hover:border-[var(--color-accent)] animate-fade-up"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent)" }}
                className="font-medium text-sm leading-snug hover:underline line-clamp-2"
              >
                {paper.title}
              </a>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {paper.authors.length > 0 && (
                  <span
                    style={{ color: "var(--color-text-secondary)" }}
                    className="text-xs"
                  >
                    {paper.authors.slice(0, 3).join(", ")}
                    {paper.authors.length > 3 ? " et al." : ""}
                  </span>
                )}
                {paper.year && (
                  <span
                    style={{
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text-muted)",
                      border: "1px solid var(--color-border)",
                    }}
                    className="text-xs px-1.5 py-0.5 rounded"
                  >
                    {paper.year}
                  </span>
                )}
                <span
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                  className="text-xs px-1.5 py-0.5 rounded"
                >
                  {paper.source}
                </span>
                {paper.citation_count !== null && (
                  <span
                    style={{ color: "var(--color-text-muted)" }}
                    className="text-xs"
                  >
                    {paper.citation_count.toLocaleString()} citations
                  </span>
                )}
              </div>
              {paper.abstract && (
                <p
                  style={{ color: "var(--color-text-secondary)" }}
                  className="text-xs mt-2 leading-relaxed line-clamp-3"
                >
                  {paper.abstract}
                </p>
              )}
            </div>
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
              }}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-all"
            >
              Open
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
