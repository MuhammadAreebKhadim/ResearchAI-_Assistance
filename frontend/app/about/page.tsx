import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)" }} className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div
          style={{
            backgroundColor: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            border: "1px solid #c7d0f8",
          }}
          className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 tracking-wide uppercase"
        >
          About
        </div>

        <h1
          style={{ color: "var(--color-text-primary)", lineHeight: "1.25" }}
          className="text-4xl font-semibold mb-6 tracking-tight"
        >
          Built for researchers, <br />
          not just readers.
        </h1>

        <div
          style={{ color: "var(--color-text-secondary)" }}
          className="space-y-5 text-base leading-relaxed"
        >
          <p>
            Research is a process — and the hardest part is often not the
            thinking itself, but the navigation. Finding the right papers among
            millions, understanding dense academic writing, and deciding who to
            collaborate with are real friction points that slow down progress.
          </p>
          <p>
            ResearchAI was built to remove that friction. It is a focused tool
            designed for academic and professional researchers who want to move
            faster without sacrificing depth. It uses a conversational interface
            so you can explore ideas naturally, the way you would with a
            well-read colleague who also happens to have read everything.
          </p>
          <p>
            It searches across Semantic Scholar, ArXiv, and OpenAlex — three of
            the largest open research databases — giving you broad coverage
            across fields like computer science, medicine, physics, economics,
            and more.
          </p>
          <p>
            The professor collaboration feature is particularly useful for PhD
            students and postdocs looking for advisors, or researchers exploring
            new institutional partnerships. Rather than guessing from a
            professor's homepage, ResearchAI gives you a structured alignment
            report based on actual publication data.
          </p>
        </div>

        <div
          style={{ borderTop: "1px solid var(--color-border)" }}
          className="mt-12 pt-10 grid grid-cols-3 gap-8 text-center"
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div
                style={{ color: "var(--color-accent)" }}
                className="text-2xl font-semibold"
              >
                {s.value}
              </div>
              <div
                style={{ color: "var(--color-text-secondary)" }}
                className="text-xs mt-1"
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/research"
            style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            className="px-6 py-3 rounded-lg font-medium text-sm inline-block hover:bg-[var(--color-accent-hover)] transition-all"
          >
            Start a research session
          </Link>
        </div>
      </div>
    </div>
  );
}

const stats = [
  { value: "250M+", label: "Research papers accessible" },
  { value: "3", label: "Academic databases searched" },
  { value: "GPT-6 Luna", label: "AI model powering explanations" },
];
