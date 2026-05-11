"use client";

interface TutorMessageProps {
  content: string;
}

type Section = { heading: string; body: string[] };

const SECTION_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  "simple explanation": { bg: "bg-white", border: "border-l-4 border-brand-400", text: "text-surface-700", icon: "📖" },
  "key concepts": { bg: "bg-white", border: "border-l-4 border-blue-400", text: "text-surface-700", icon: "🔑" },
  "clinical relevance": { bg: "bg-white", border: "border-l-4 border-accent-400", text: "text-surface-700", icon: "🏥" },
  "high-yield facts": { bg: "bg-amber-50", border: "border-l-4 border-amber-400", text: "text-amber-900", icon: "⭐" },
  "memory aid": { bg: "bg-purple-50", border: "border-l-4 border-purple-400", text: "text-purple-900", icon: "🧠" },
  "quick check": { bg: "bg-brand-50", border: "border-l-4 border-brand-500", text: "text-brand-900", icon: "❓" },
  "common mistake": { bg: "bg-red-50", border: "border-l-4 border-red-400", text: "text-red-900", icon: "⚠️" },
  "exam pearl": { bg: "bg-amber-50", border: "border-l-4 border-amber-400", text: "text-amber-900", icon: "💎" },
  "clinical pearl": { bg: "bg-accent-50", border: "border-l-4 border-accent-400", text: "text-accent-900", icon: "💡" },
};

function parseSections(text: string): { preamble: string | null; sections: Section[] } {
  const sections: Section[] = [];

  // Normalize: insert newlines before ## that appear mid-line
  let normalized = text.replace(/([^\n])##\s/g, "$1\n\n## ");

  // Split on ## headings
  const blocks = normalized.split(/\n(?=##\s)/);
  let preamble: string | null = null;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^##\s+(.+)/m);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      const body = trimmed.slice(headingMatch[0].length).trim();
      const bodyLines = body.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (bodyLines.length > 0) {
        sections.push({ heading, body: bodyLines });
      }
    } else {
      // This is preamble text before the first heading
      if (!preamble) {
        preamble = trimmed;
      }
    }
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: "", body: text.split("\n").filter((l) => l.trim()) });
  }

  return { preamble, sections };
}

function processLine(line: string): string {
  // Bold: **text** -> <strong>text</strong>
  let html = line.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-surface-900'>$1</strong>");
  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Bullet points
  if (html.startsWith("- ") || html.startsWith("• ")) {
    html = `<span class="text-surface-400 mr-2">•</span>${html.slice(2)}`;
  }
  // Numbered items
  html = html.replace(/^(\d+)\.\s/, "<span class='text-surface-400 mr-1 font-mono text-xs'>$1.</span>");
  return html;
}

function getSectionStyle(heading: string) {
  const lower = heading.toLowerCase();
  // Try exact match first
  if (SECTION_COLORS[lower]) return SECTION_COLORS[lower];
  // Try partial match
  for (const [key, style] of Object.entries(SECTION_COLORS)) {
    if (lower.includes(key)) return style;
  }
  // Default
  return { bg: "bg-white", border: "border-l-4 border-surface-200", text: "text-surface-700", icon: "" };
}

export default function TutorMessage({ content }: TutorMessageProps) {
  if (!content) return null;

  const { preamble, sections } = parseSections(content);

  // If only one section with no heading, render as simple text
  if (!preamble && sections.length === 1 && !sections[0].heading) {
    return (
      <div className="prose prose-sm max-w-none text-surface-700 leading-relaxed">
        {sections[0].body.map((line, i) => (
          <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: processLine(line) }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {preamble && (
        <p className="text-sm text-surface-600 leading-relaxed italic border-l-2 border-brand-300 pl-3">
          {preamble}
        </p>
      )}
      {sections.map((section, i) => {
        const style = getSectionStyle(section.heading);
        return (
          <div key={i} className={`rounded-xl ${style.bg} ${style.border} p-4 shadow-sm`}>
            {section.heading && (
              <h4 className="mb-2 text-sm font-semibold tracking-wide uppercase text-surface-500">
                {style.icon && <span className="mr-2 inline-block">{style.icon}</span>}
                {section.heading}
              </h4>
            )}
            <div className={`text-sm leading-relaxed ${style.text} space-y-1`}>
              {section.body.map((line, j) => {
                if (!line.trim()) return <div key={j} className="h-2" />;
                return (
                  <div
                    key={j}
                    className={line.startsWith("- ") || line.startsWith("• ") ? "flex items-start gap-1 ml-1" : ""}
                    dangerouslySetInnerHTML={{ __html: processLine(line) }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
