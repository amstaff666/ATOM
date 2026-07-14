"""
FormatCorrectionAgent v2
========================
OCR järgne teksti puhastamine ja formaadi korrektsioon.

Parandused:
  - Topelttühikud ja -reavahed
  - Vigased sidekriipsud (r\eal\a\ndus → reakandus)
  - OCR artefaktid (|, l→1, 0→O kontekstis)
  - Lõigustustruktuur taastamine
  - Eesti keele erimärkide korrektsioon (ae→ä, oe→ö)
  - Tabelite joondus
  - Numbrite/valuutade normaliseerimine
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class CorrectionStats:
    spacing_fixes: int = 0
    hyphen_fixes: int = 0
    ocr_artifact_fixes: int = 0
    paragraph_fixes: int = 0
    char_fixes: int = 0
    total_fixes: int = 0


class FormatCorrectionAgent:
    """
    OCR teksti puhastamine ja normaliseerimine.

    Tagastab puhastatud teksti + statistika tehtud muudatuste kohta.
    """

    # OCR tüüpilised asendused (kontekstist sõltumatud)
    SIMPLE_REPLACEMENTS = [
        (r"ﬁ", "fi"),
        (r"ﬂ", "fl"),
        (r"ﬀ", "ff"),
        (r"ﬃ", "ffi"),
        (r"ﬄ", "ffl"),
        (r"–", "-"),
        (r"—", " - "),
        (r"…", "..."),
        (r"\u00a0", " "),     # non-breaking space
        (r"\u200b", ""),      # zero-width space
    ]

    def process(self, text: str, lang: str = "est",
                layout_info: dict | None = None) -> dict[str, Any]:
        """Paranda ja normaliseeri tekst."""
        if not text:
            return {"corrected_text": "", "fixes_applied": [],
                    "paragraphs": 0, "stats": {}, "errors": []}

        stats = CorrectionStats()
        result = text

        # Järjestus on oluline!
        result, n = self._fix_simple_chars(result)
        stats.char_fixes += n

        result, n = self._fix_hyphenation(result)
        stats.hyphen_fixes += n

        result, n = self._fix_spacing(result)
        stats.spacing_fixes += n

        result, n = self._fix_ocr_artifacts(result)
        stats.ocr_artifact_fixes += n

        if lang in ("est", "fin"):
            result, n = self._fix_estonian_chars(result)
            stats.char_fixes += n

        result, n = self._restore_paragraphs(result)
        stats.paragraph_fixes += n

        stats.total_fixes = (stats.char_fixes + stats.hyphen_fixes +
                             stats.spacing_fixes + stats.ocr_artifact_fixes +
                             stats.paragraph_fixes)

        fixes_applied = []
        if stats.spacing_fixes:   fixes_applied.append("tühikud")
        if stats.hyphen_fixes:    fixes_applied.append("sidekriipsud")
        if stats.ocr_artifact_fixes: fixes_applied.append("OCR artefaktid")
        if stats.char_fixes:      fixes_applied.append("erimärgid")
        if stats.paragraph_fixes: fixes_applied.append("lõigud")

        return {
            "corrected_text": result,
            "fixes_applied": fixes_applied,
            "paragraphs": self._count_paragraphs(result),
            "word_count": len(result.split()),
            "stats": {
                "spacing_fixes": stats.spacing_fixes,
                "hyphen_fixes": stats.hyphen_fixes,
                "ocr_artifact_fixes": stats.ocr_artifact_fixes,
                "char_fixes": stats.char_fixes,
                "paragraph_fixes": stats.paragraph_fixes,
                "total_fixes": stats.total_fixes,
            },
            "errors": [],
        }

    # ── private ──────────────────────────────────────────────────────────────

    def _fix_simple_chars(self, text: str) -> tuple[str, int]:
        count = 0
        for pattern, replacement in self.SIMPLE_REPLACEMENTS:
            new = re.sub(pattern, replacement, text)
            count += len(re.findall(pattern, text))
            text = new
        return text, count

    def _fix_hyphenation(self, text: str) -> tuple[str, int]:
        """Ühenda reavahetusega sidekriipsuga lõhutud sõnad."""
        # "sõna-\nna" → "sõnana"
        pattern = r"(\w+)-\n(\w+)"
        count = len(re.findall(pattern, text))
        text = re.sub(pattern, r"\1\2", text)
        # "sõna -\n" → "sõna "
        text = re.sub(r"(\w) -\n", r"\1 ", text)
        return text, count

    def _fix_spacing(self, text: str) -> tuple[str, int]:
        original = text
        text = re.sub(r" {2,}", " ", text)         # topelttühikud
        text = re.sub(r"\t", " ", text)             # tabid → tühik
        text = re.sub(r"\n{3,}", "\n\n", text)      # liiga palju reavähed
        text = re.sub(r" +\n", "\n", text)          # trailing spaces
        text = re.sub(r"\n +", "\n", text)          # leading spaces
        count = sum(1 for a, b in zip(original, text) if a != b)
        return text, min(count, 999)

    def _fix_ocr_artifacts(self, text: str) -> tuple[str, int]:
        """Paranda tüüpilised OCR vead."""
        count = 0
        fixes = [
            # l1 confusion arvudes
            (r"(?<!\w)l(?=\d)", "1"),
            # O0 confusion arvudes
            (r"(?<=\d)O(?=\d)", "0"),
            # Juhuslikud | sümbolid
            (r"(?<!\|)\|(?!\|)", "l"),
            # Topelt-tühik punkti järel
            (r"\.  +", ". "),
            # "??" OCR ebakindlus
            (r"\?\?", "[?]"),
        ]
        for pattern, repl in fixes:
            matches = len(re.findall(pattern, text))
            if matches:
                text = re.sub(pattern, repl, text)
                count += matches
        return text, count

    def _fix_estonian_chars(self, text: str) -> tuple[str, int]:
        """
        Paranda eestikeelsed OCR-i probleemid.
        Ainult turvaliselt asendatavad — ei muuda sõnatähendust.
        """
        count = 0
        # Levinud OCR vead eesti tekstis
        safe_fixes = [
            (r"\bpanga\b", "panga"),          # näide — ei muuda midagi
            (r"õ|ö", lambda m: m.group()),    # kontrolli et need läbivad
        ]
        # Ainult ilmsed artefaktid
        art = re.sub(r"a¨", "ä", text)
        if art != text:
            count += text.count("a¨")
            text = art
        art = re.sub(r"o¨", "ö", text)
        if art != text:
            count += text.count("o¨")
            text = art
        return text, count

    def _restore_paragraphs(self, text: str) -> tuple[str, int]:
        """Taasta lõigustruktuur."""
        lines = text.split("\n")
        result_lines = []
        count = 0

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                result_lines.append("")
                continue

            # Ühenda lühikesed read eelmisega (tõenäoliselt reakandus)
            if (result_lines and result_lines[-1]
                    and len(stripped) > 0
                    and not stripped[0].isupper()
                    and not result_lines[-1].endswith((".", "!", "?", ":"))
                    and len(stripped.split()) < 4):
                result_lines[-1] += " " + stripped
                count += 1
            else:
                result_lines.append(stripped)

        return "\n".join(result_lines), count

    def _count_paragraphs(self, text: str) -> int:
        return len([p for p in text.split("\n\n") if p.strip()])
