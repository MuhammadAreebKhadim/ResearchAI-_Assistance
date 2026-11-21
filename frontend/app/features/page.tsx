import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)" }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div
          style={{
            backgroundColor: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            border: "1px solid #c7d0f8",
          }}
          className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 tracking-wide uppercase"
        >
          Features
        </div>

        <h1
          style={{ color: "var(--color-text-primary)" }}
          className="text-4xl font-semibold mb-4 tracking-tight"
        >
          Three tools, one workflow.
        </h1>
        <p
          style={{ color: "var(--color-text-secondary)" }}
          className="text-base mb-14 max-w-xl"
        >
          Everything you need to go from a research idea to a full understanding
          and a collaboration plan — in one place.
        </p>

        <div className="space-y-10">
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
              className="rounded-2xl p-8 flex gap-8"
            >
              <div
                style={{
                  backgroundColor: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  flexShrink: 0,
                }}
                className="w-14 h-14 rounded-xl flex items-center justify-center self-start"
              >
                {f.icon}
              </div>
              <div className="flex-1">
                <h2
                  style={{ color: "var(--color-text-primary)" }}
                  className="text-lg font-semibold mb-2"
                >
                  {f.title}
                </h2>
                <p
                  style={{ color: "var(--color-text-secondary)" }}
                  className="text-sm leading-relaxed mb-4"
                >
                  {f.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {f.bullets.map((b, j) => (
                    <span
                      key={j}
                      style={{
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-border)",
                      }}
                      className="text-xs px-2.5 py-1 rounded-full"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <Link
                  href={f.href}
                  style={{ color: "var(--color-accent)" }}
                  className="text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Open this feature
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    href: "/research",
    title: "Research Discovery",
    description:
      "Have a conversation about what you are researching. The assistant asks one focused follow-up question at a time to understand your domain, interests, and scope — then searches across academic databases and returns a curated list of relevant papers.",
    bullets: ["Semantic Scholar", "ArXiv", "OpenAlex", "Filter by year", "Refine with follow-ups"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M12 22a10 10 0 100-20 10 10 0 000 20zm0 0l7 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/paper",
    title: "Paper Explainer",
    description:
      "Upload any PDF research paper and choose how you want it explained. Get a quick overview, a plain-language version for non-experts, a detailed section-by-section breakdown, or ask specific questions about the paper in a focused Q&A mode.",
    bullets: ["Quick Summary", "Plain-language simplification", "Section-by-section deep dive", "Q&A mode", "Up to 50MB PDF"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M5 3h11l5 5v15H5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 3v5h5M9 13h8M9 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/collaborate",
    title: "Collaboration Finder",
    description:
      "Provide a professor's name, university, and optionally upload one of their papers. The assistant fetches their publication profile, explains their research focus in plain language, and then compares it with your own research background to produce a detailed alignment report — including shared themes, collaboration opportunities, and a draft outreach email.",
    bullets: ["Name + university search", "PDF upload", "OpenAlex + Semantic Scholar profile", "Alignment score", "Cold email template"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="19" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 22c0-4 2.7-6 6-6M19 16c3.3 0 6 2 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 16v4m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];
