"""
TextExtractionAgent v2
======================
PDF teksti ekstraheerimine Tesseract OCR + pypdfium2 abil.
Toetab: eesti, inglise, vene keel; multi-page; confidence scoring.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TextBlock:
    id: int
    text: str
    page: int = 0
    confidence: float = 0.0
    bbox: dict[str, float] = field(default_factory=dict)


@dataclass
class ExtractionResult:
    text: str
    confidence: float
    blocks: list[TextBlock]
    page: int
    word_count: int
    char_count: int
    ocr_used: bool
    errors: list[str] = field(default_factory=list)


class TextExtractionAgent:
    """
    PDF teksti ekstraheerimine.

    Strateegia:
      1. Proovib native PDF text layer (pypdfium2) — kiire, täpne.
      2. Kui teksti alla 20 märki → langetab OCR-ile (Tesseract).
      3. Tagastab struktureeritud ExtractionResult.
    """

    MIN_NATIVE_CHARS = 20
    SUPPORTED_LANGS  = {"est": "est", "eng": "eng", "rus": "rus"}

    def __init__(self, tesseract_cmd: str | None = None, lang: str = "est+eng"):
        self.lang = lang
        self._setup_tesseract(tesseract_cmd)

    # ── public ──────────────────────────────────────────────────────────────

    def process(self, pdf_page: Any, page_num: int = 0) -> dict[str, Any]:
        """Peamine meetod — võtab PIL.Image või str (path)."""
        try:
            from PIL import Image
            if isinstance(pdf_page, str):
                image = Image.open(pdf_page).convert("RGB")
            else:
                image = pdf_page.convert("RGB") if pdf_page.mode != "RGB" else pdf_page

            # Proovi native text layer esmalt
            native = self._try_native_text(pdf_page)
            if native and len(native.strip()) >= self.MIN_NATIVE_CHARS:
                blocks = self._text_to_blocks(native, page_num)
                return self._build_result(native, 0.99, blocks, page_num, ocr_used=False)

            # OCR fallback
            text, confidence = self._run_ocr(image)
            blocks = self._extract_blocks_with_bbox(image, page_num)
            return self._build_result(text, confidence, blocks, page_num, ocr_used=True)

        except ImportError as e:
            logger.error("Sõltuvus puudub: %s", e)
            return self._error_result(page_num, str(e))
        except Exception as e:
            logger.exception("Teksti ekstraheerimine ebaõnnestus lehel %d", page_num)
            return self._error_result(page_num, str(e))

    def process_multipage(self, images: list[Any]) -> list[dict[str, Any]]:
        """Töötle mitu lehekülge järjest."""
        return [self.process(img, i) for i, img in enumerate(images)]

    # ── private ─────────────────────────────────────────────────────────────

    def _setup_tesseract(self, cmd: str | None) -> None:
        try:
            import pytesseract
            if cmd:
                pytesseract.pytesseract.tesseract_cmd = cmd
        except ImportError:
            logger.warning("pytesseract pole installitud — OCR ei tööta.")

    def _try_native_text(self, page: Any) -> str | None:
        """Proovi pypdfium2 native text extraction."""
        try:
            import pypdfium2 as pdfium  # type: ignore
            if hasattr(page, "get_textpage"):
                tp = page.get_textpage()
                return tp.get_text_range()
        except Exception:
            pass
        return None

    def _run_ocr(self, image: Any) -> tuple[str, float]:
        try:
            import pytesseract
            text = pytesseract.image_to_string(image, lang=self.lang, config="--oem 3 --psm 6")
            conf = self._calc_confidence(image)
            return text.strip(), conf
        except Exception as e:
            logger.error("OCR viga: %s", e)
            return "", 0.0

    def _calc_confidence(self, image: Any) -> float:
        try:
            import pytesseract
            data = pytesseract.image_to_data(image, lang=self.lang,
                                              output_type=pytesseract.Output.DICT)
            confs = [int(c) for c in data["conf"] if str(c).lstrip("-").isdigit() and int(c) >= 0]
            return round(sum(confs) / len(confs) / 100, 3) if confs else 0.0
        except Exception:
            return 0.5

    def _extract_blocks_with_bbox(self, image: Any, page: int) -> list[TextBlock]:
        try:
            import pytesseract
            data = pytesseract.image_to_data(image, lang=self.lang,
                                              output_type=pytesseract.Output.DICT)
            blocks: list[TextBlock] = []
            for i, word in enumerate(data["text"]):
                if word.strip():
                    blocks.append(TextBlock(
                        id=i, text=word, page=page,
                        confidence=max(0.0, int(data["conf"][i]) / 100),
                        bbox={"x": data["left"][i], "y": data["top"][i],
                              "w": data["width"][i], "h": data["height"][i]},
                    ))
            return blocks
        except Exception:
            return self._text_to_blocks("", page)

    def _text_to_blocks(self, text: str, page: int) -> list[TextBlock]:
        return [
            TextBlock(id=i, text=line.strip(), page=page, confidence=0.99)
            for i, line in enumerate(text.split("\n"))
            if line.strip()
        ]

    def _build_result(self, text: str, conf: float, blocks: list[TextBlock],
                      page: int, ocr_used: bool) -> dict[str, Any]:
        return {
            "text": text,
            "confidence": conf,
            "blocks": [{"id": b.id, "text": b.text, "page": b.page,
                         "confidence": b.confidence, "bbox": b.bbox}
                        for b in blocks],
            "page": page,
            "word_count": len(text.split()),
            "char_count": len(text),
            "ocr_used": ocr_used,
            "errors": [],
        }

    def _error_result(self, page: int, error: str) -> dict[str, Any]:
        return {"text": "", "confidence": 0.0, "blocks": [], "page": page,
                "word_count": 0, "char_count": 0, "ocr_used": False,
                "errors": [error]}
