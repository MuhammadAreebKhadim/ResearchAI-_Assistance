import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)" }} className="min-h-screen">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div
          style={{
            backgroundColor: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            border: "1px solid #c7d0f8",
          }}
          className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 tracking-wide uppercase"
        >
          AI-Powered Research Companion
        </div>

        <h1
          style={{ color: "var(--color-text-primary)", lineHeight: "1.2" }}
          className="text-5xl font-semibold mb-5 tracking-tight"
        >
          Start your research today
          <br />
          <span style={{ color: "var(--color-accent)" }}>
            with the assistance of AI
          </span>
        </h1>

        <p
          style={{ color: "var(--color-text-secondary)" }}
          className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Discover relevant papers, understand complex research, and evaluate
          collaboration opportunities — all through a single, thoughtful
          conversation.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/research"
            style={{ backgroundColor: "var(--color-accent)", color: "white" }}
            className="px-6 py-3 rounded-lg font-medium text-sm transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-md"
          >
            Start a Research Session
          </Link>
          <Link
            href="/features"
            style={{
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
            className="px-6 py-3 rounded-lg font-medium text-sm transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Explore Features
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Link key={i} href={f.href}>
              <div
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
                className="rounded-xl p-6 h-full transition-all duration-200 hover:shadow-md hover:border-[var(--color-accent)] group cursor-pointer"
              >
                <div
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                >
                  {f.icon}
                </div>
                <h3
                  style={{ color: "var(--color-text-primary)" }}
                  className="font-semibold mb-2 text-base"
                >
                  {f.title}
                </h3>
                <p
                  style={{ color: "var(--color-text-secondary)" }}
                  className="text-sm leading-relaxed"
                >
                  {f.description}
                </p>
                <div
                  style={{ color: "var(--color-accent)" }}
                  className="text-sm font-medium mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                >
                  Open
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        style={{ borderTop: "1px solid var(--color-border)" }}
        className="py-20"
      >
        <div className="max-w-4xl mx-auto px-6">
          <h2
            style={{ color: "var(--color-text-primary)" }}
            className="text-2xl font-semibold text-center mb-12 tracking-tight"
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto mb-3"
                >
                  {i + 1}
                </div>
                <h4
                  style={{ color: "var(--color-text-primary)" }}
                  className="font-medium text-sm mb-2"
                >
                  {step.title}
                </h4>
                <p
                  style={{ color: "var(--color-text-secondary)" }}
                  className="text-xs leading-relaxed"
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    href: "/research",
    title: "Research Discovery",
    description:
      "Tell the assistant about your research interests. It will ask a few focused questions, then surface relevant papers from Semantic Scholar, ArXiv, and OpenAlex.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M9 17A8 8 0 109 1a8 8 0 000 16zm0 0l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/paper",
    title: "Paper Explainer",
    description:
      "Upload any research paper PDF. Get a quick summary, a plain-language explanation, a deep section-by-section breakdown, or ask the AI specific questions about it.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 2h8l4 4v12H4V2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 2v4h4M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/collaborate",
    title: "Collaboration Finder",
    description:
      "Provide a professor's name, university, or upload their paper. The AI analyzes their research profile and tells you how well your work aligns for a potential collaboration.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="14" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 17c0-3 2-5 5-5M13 12c3 0 5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 12v3m0 0l-1.5-1.5M10 15l1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const steps = [
  { title: "Start a conversation", desc: "Tell the assistant what you are researching or curious about." },
  { title: "Refine your interest", desc: "The AI asks one focused follow-up at a time to understand your intent." },
  { title: "Receive results", desc: "Get curated paper links, summaries, or a full collaboration report." },
  { title: "Go deeper", desc: "Upload papers, ask follow-up questions, and iterate on your findings." },
];
