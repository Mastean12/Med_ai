"""
Centralized Educational Response Formatter.

Converts raw LLM output into professionally structured educational content.
Handles markdown parsing, section detection, and metadata assignment.

Output format: JSON with sections, each containing title, type, content, icon, and styling.
"""

import re
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger("noctual.formatter")


# ================================================================
# SECTION TYPE DEFINITIONS
# ================================================================

SECTION_TYPES = {
    "simple-explanation": {
        "aliases": ["simple explanation", "explanation"],
        "icon": "📖",
        "bg": "bg-white",
        "border": "border-l-[3px] border-brand-500",
        "priority": 1,
    },
    "key-concepts": {
        "aliases": ["key concepts", "concepts", "key points"],
        "icon": "⚡",
        "bg": "bg-white",
        "border": "border-l-[3px] border-blue-500",
        "priority": 2,
    },
    "clinical-relevance": {
        "aliases": ["clinical relevance", "clinical significance", "clinical importance"],
        "icon": "🏥",
        "bg": "bg-white",
        "border": "border-l-[3px] border-accent-500",
        "priority": 3,
    },
    "high-yield-facts": {
        "aliases": ["high-yield facts", "high yield", "exam facts", "high-yield"],
        "icon": "⭐",
        "bg": "bg-amber-50/60",
        "border": "border-l-[3px] border-amber-500",
        "priority": 4,
    },
    "exam-focus": {
        "aliases": ["exam focus", "exam", "test tips"],
        "icon": "⭐",
        "bg": "bg-amber-50/60",
        "border": "border-l-[3px] border-amber-500",
        "priority": 4,
    },
    "memory-aid": {
        "aliases": ["memory aid", "mnemonic", "mnemonics", "memory trick"],
        "icon": "🧠",
        "bg": "bg-purple-50/60",
        "border": "border-l-[3px] border-purple-500",
        "priority": 5,
    },
    "quick-check": {
        "aliases": ["quick check", "recall question", "test yourself"],
        "icon": "❓",
        "bg": "bg-brand-50/60",
        "border": "border-l-[3px] border-brand-500",
        "priority": 6,
    },
    "quick-summary": {
        "aliases": ["quick summary", "summary", "key takeaway"],
        "icon": "✨",
        "bg": "bg-surface-800",
        "border": "border border-surface-700",
        "priority": 7,
    },
    "clinical-pearl": {
        "aliases": ["clinical pearl", "clinical pearls", "pearl"],
        "icon": "💡",
        "bg": "bg-accent-50/60",
        "border": "border-l-[3px] border-accent-500",
        "priority": 5,
    },
    "common-mistakes": {
        "aliases": ["common mistake", "common mistakes", "pitfall", "trap"],
        "icon": "⚠️",
        "bg": "bg-red-50/60",
        "border": "border-l-[3px] border-red-500",
        "priority": 5,
    },
}


@dataclass
class FormattedSection:
    """Structured section of educational content."""
    title: str
    type: str
    content: List[str]  # List of lines
    icon: str
    bg: str
    border: str
    priority: int


@dataclass
class FormattedResponse:
    """Complete formatted response with metadata."""
    preamble: Optional[str]
    sections: List[FormattedSection]
    raw_text: str
    section_count: int


def _detect_section_type(heading: str) -> Optional[tuple[str, Dict[str, Any]]]:
    """
    Detect section type from heading text.
    Returns (section_type_key, metadata_dict) or (None, default_metadata) if no match.
    """
    heading_lower = heading.lower().strip().rstrip("?")

    for section_key, section_meta in SECTION_TYPES.items():
        for alias in section_meta["aliases"]:
            if alias.lower() in heading_lower:
                return section_key, section_meta

    # Default fallback
    return None, {
        "icon": "📝",
        "bg": "bg-white",
        "border": "border-l-[3px] border-surface-200",
        "priority": 10,
    }


def _clean_markdown_line(line: str) -> str:
    """
    Remove markdown formatting but preserve structure.
    Converts **text** to text, *text* to text, but preserves bullets and numbers.
    """
    # Remove bold **text** -> text
    line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
    # Remove italic *text* -> text
    line = re.sub(r"\*(.+?)\*", r"\1", line)
    # Remove inline code `text` -> text (keep backticks for now, let frontend handle)
    # line = re.sub(r"`([^`]+)`", r"\1", line)
    return line.strip()


def _parse_sections(text: str) -> tuple[Optional[str], List[FormattedSection]]:
    """
    Parse markdown text into sections based on ## headings.

    Returns (preamble, sections_list)
    """
    sections: List[FormattedSection] = []

    # Normalize: ensure ## headings are on their own line
    normalized = re.sub(r"([^\n])(#{1,3})\s", r"\1\n\n\2 ", text)

    # Split on ## or ### headings
    blocks = re.split(r"\n(?=#{1,3}\s)", normalized)

    preamble: Optional[str] = None

    for block in blocks:
        trimmed = block.strip()
        if not trimmed:
            continue

        # Try to match heading
        heading_match = re.match(r"^(#{1,3})\s+(.+?)(?:\n|$)", trimmed)

        if heading_match:
            heading_level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()

            # Extract body (everything after the heading line)
            body_start = heading_match.end()
            body_raw = trimmed[body_start:].strip()

            # Split body into lines, filter empty ones
            body_lines = [_clean_markdown_line(l) for l in body_raw.split("\n")]
            body_lines = [l for l in body_lines if l]

            if body_lines or heading_text:  # Allow empty-body sections with headings
                section_type_key, section_meta = _detect_section_type(heading_text)

                section = FormattedSection(
                    title=heading_text,
                    type=section_type_key or "generic",
                    content=body_lines,
                    icon=section_meta.get("icon", "📝"),
                    bg=section_meta.get("bg", "bg-white"),
                    border=section_meta.get("border", "border-l-[3px] border-surface-200"),
                    priority=section_meta.get("priority", 10),
                )
                sections.append(section)
        else:
            # This is preamble text (before first heading)
            if not preamble:
                preamble = _clean_markdown_line(trimmed) if trimmed else None

    # If no sections were found, treat entire text as a single section
    if not sections and text.strip():
        body_lines = [_clean_markdown_line(l) for l in text.split("\n")]
        body_lines = [l for l in body_lines if l]
        if body_lines:
            section = FormattedSection(
                title="",
                type="generic",
                content=body_lines,
                icon="📝",
                bg="bg-white",
                border="border-l-[3px] border-surface-200",
                priority=10,
            )
            sections.append(section)

    return preamble, sections


def format_response(raw_text: str) -> Dict[str, Any]:
    """
    Main entry point: Convert raw LLM response into structured format.

    Args:
        raw_text: Raw markdown text from LLM

    Returns:
        Dict with keys: preamble, sections, raw_text, section_count, formatted_sections
        formatted_sections is a list of dicts (easy JSON serialization)
    """
    try:
        preamble, sections = _parse_sections(raw_text)

        # Sort sections by priority
        sorted_sections = sorted(sections, key=lambda s: s.priority)

        # Convert dataclasses to dicts for JSON serialization
        formatted_sections = [
            {
                "title": s.title,
                "type": s.type,
                "content": s.content,
                "icon": s.icon,
                "bg": s.bg,
                "border": s.border,
                "priority": s.priority,
            }
            for s in sorted_sections
        ]

        result = {
            "preamble": preamble,
            "sections": formatted_sections,
            "raw_text": raw_text,
            "section_count": len(formatted_sections),
            "formatted_sections": formatted_sections,  # Alias for convenience
        }

        logger.info(
            "Response formatted | sections=%d types=%s",
            len(formatted_sections),
            [s["type"] for s in formatted_sections],
        )

        return result

    except Exception as e:
        logger.error("Format error: %s", str(e)[:200])
        # Graceful fallback: return raw text as single section
        return {
            "preamble": None,
            "sections": [
                {
                    "title": "",
                    "type": "generic",
                    "content": [_clean_markdown_line(l) for l in raw_text.split("\n") if l.strip()],
                    "icon": "📝",
                    "bg": "bg-white",
                    "border": "border-l-[3px] border-surface-200",
                    "priority": 10,
                }
            ],
            "raw_text": raw_text,
            "section_count": 1,
            "formatted_sections": [],
        }
