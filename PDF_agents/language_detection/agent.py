"""
LanguageDetectionAgent v2
==========================
Keele tuvastamine OCR konfiguratsiooniks.

Toetab: eesti (est), inglise (eng), vene (rus), soome (fin),
        läti (lav), leedu (lit), saksa (deu), prantsuse (fra).

Meetodid:
  1. Märksõna-põhine scoring (kiire, ilma sõltuvusteta)
  2. langdetect fallback (kui installitud)
  3. Tähtede sageduse analüüs (erimärgid: ä, ö, ü, õ jne)
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class LangResult:
    language: str
    confidence: float
    tesseract_lang: str
    alternatives: list[tuple[str, float]]


# ── keele andmebaas ──────────────────────────────────────────────────────────

LANG_DATA: dict[str, dict] = {
    "est": {
        "keywords": ["on", "ja", "et", "ei", "oli", "mis", "see", "üks",
                     "ning", "aga", "kui", "ka", "nii", "oma", "veel"],
        "chars": "äöüõ",
        "tesseract": "est",
        "name": "Eesti",
    },
    "eng": {
        "keywords": ["the", "is", "and", "of", "to", "a", "in", "that",
                     "it", "was", "for", "on", "are", "with", "his"],
        "chars": "",
        "tesseract": "eng",
        "name": "English",
    },
    "rus": {
        "keywords": ["в", "и", "не", "на", "я", "что", "тот", "быть",
                     "с", "он", "как", "это", "по", "но", "они"],
        "chars": "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
        "tesseract": "rus",
        "name": "Русский",
    },
    "fin": {
        "keywords": ["ja", "on", "ei", "se", "että", "kun", "hän",
                     "mutta", "niin", "olla", "joka", "myös"],
        "chars": "äö",
        "tesseract": "fin",
        "name": "Suomi",
    },
    "deu": {
        "keywords": ["der", "die", "das", "und", "in", "ist", "von",
                     "mit", "für", "den", "nicht", "sich"],
        "chars": "äöüß",
        "tesseract": "deu",
        "name": "Deutsch",
    },
    "lav": {
        "keywords": ["un", "ir", "ka", "par", "ar", "tā", "bet",
                     "vai", "arī", "viņš", "tas"],
        "chars": "āēīūļķģšžč",
        "tesseract": "lav",
        "name": "Latviešu",
    },
}

TESSERACT_MULTI = {
    frozenset(["est", "eng"]): "est+eng",
    frozenset(["est", "rus"]): "est+rus",
    frozenset(["eng", "rus"]): "eng+rus",
    frozenset(["est", "eng", "rus"]): "est+eng+rus",
}


class LanguageDetectionAgent:
    """
    Keele tuvastamine OCR konfiguratsiooniks.

    Tagastab Tesseract keele koodi (nt "est+eng") automaatseks
    mitmekeelse OCR seadistamiseks.
    """

    MIN_TEXT_LEN = 20
    CONFIDENCE_THRESHOLD = 0.5

    def process(self, text: str) -> dict[str, Any]:
        """Tuvasta keel ja tagasta Tesseract konfig."""
        if not text or len(text.strip()) < self.MIN_TEXT_LEN:
            return self._unknown_result("Tekst liiga lühike")

        result = self._detect(text)

        return {
            "detected_language": result.language,
            "language_name": LANG_DATA.get(result.language, {}).get("name", "Tundmatu"),
            "confidence": result.confidence,
            "tesseract_lang": result.tesseract_lang,
            "alternatives": [{"lang": l, "score": s} for l, s in result.alternatives],
            "supported_languages": list(LANG_DATA.keys()),
            "is_multilingual": "+" in result.tesseract_lang,
            "errors": [],
        }

    # ── private ──────────────────────────────────────────────────────────────

    def _detect(self, text: str) -> LangResult:
        text_lower = text.lower()
        words = re.findall(r"\b\w+\b", text_lower)
        total_words = max(len(words), 1)

        scores: dict[str, float] = {}

        for lang, data in LANG_DATA.items():
            kw_hits = sum(words.count(kw) for kw in data["keywords"])
            kw_score = min(1.0, kw_hits / (total_words * 0.3)) * 0.7

            char_score = 0.0
            if data["chars"]:
                char_hits = sum(text_lower.count(c) for c in data["chars"])
                char_score = min(1.0, char_hits / max(len(text_lower), 1) * 20) * 0.3

            scores[lang] = round(kw_score + char_score, 3)

        # Proovi langdetect täiendavaks kinnituseks
        scores = self._boost_with_langdetect(text, scores)

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best_lang, best_score = sorted_scores[0]
        alternatives = sorted_scores[1:4]

        # Mitmekeelsuse tuvastus
        tess_lang = self._pick_tesseract_lang(sorted_scores)

        return LangResult(
            language=best_lang if best_score >= self.CONFIDENCE_THRESHOLD else "unknown",
            confidence=best_score,
            tesseract_lang=tess_lang,
            alternatives=alternatives,
        )

    def _boost_with_langdetect(self, text: str, scores: dict[str, float]) -> dict[str, float]:
        try:
            from langdetect import detect_langs  # type: ignore
            detections = detect_langs(text)
            for det in detections:
                lang_map = {"et": "est", "en": "eng", "ru": "rus",
                            "fi": "fin", "de": "deu", "lv": "lav"}
                mapped = lang_map.get(det.lang)
                if mapped and mapped in scores:
                    scores[mapped] = min(1.0, scores[mapped] + det.prob * 0.3)
        except Exception:
            pass
        return scores

    def _pick_tesseract_lang(self, sorted_scores: list[tuple[str, float]]) -> str:
        """Vali Tesseract keelekood, sh mitmekeelne kui vaja."""
        top = [(l, s) for l, s in sorted_scores if s >= self.CONFIDENCE_THRESHOLD]
        if not top:
            return "eng"  # fallback
        if len(top) == 1:
            return LANG_DATA[top[0][0]]["tesseract"]

        # Kaks tugevat kandidaati → mitmekeelne
        top2 = frozenset(l for l, _ in top[:2])
        if top2 in TESSERACT_MULTI:
            return TESSERACT_MULTI[top2]

        return LANG_DATA[top[0][0]]["tesseract"]

    def _unknown_result(self, reason: str) -> dict[str, Any]:
        return {
            "detected_language": "unknown",
            "language_name": "Tundmatu",
            "confidence": 0.0,
            "tesseract_lang": "eng",
            "alternatives": [],
            "supported_languages": list(LANG_DATA.keys()),
            "is_multilingual": False,
            "errors": [reason],
        }
