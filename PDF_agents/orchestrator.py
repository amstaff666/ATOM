"""
PDFOrchestrator v2
==================
Koordineerib kõiki 8 PDF agenti üheks pipeline'iks.

Kasutamine:
    from PDF_agents.orchestrator import PDFOrchestrator

    orch = PDFOrchestrator(output_dir="./output")
    result = orch.run("pangaväljavõte.pdf")
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

from .text_extraction.agent    import TextExtractionAgent
from .layout_analysis.agent    import LayoutAnalysisAgent
from .table_detection.agent    import TableDetectionAgent
from .image_processing.agent   import ImageProcessingAgent
from .format_correction.agent  import FormatCorrectionAgent
from .language_detection.agent import LanguageDetectionAgent
from .content_validation.agent import ContentValidationAgent
from .export_rendering.agent   import ExportRenderingAgent

logger = logging.getLogger(__name__)


class PDFOrchestrator:
    """
    PDF AI Pipeline — 8 agenti, 1 käsk.

    Pipeline sammud:
      1. ImageProcessing    — pildikvaliteedi parandamine
      2. LanguageDetection  — Tesseract keele autovakal
      3. TextExtraction     — OCR / native text
      4. LayoutAnalysis     — veerud, piirkonnad
      5. TableDetection     — tabelid
      6. FormatCorrection   — teksti puhastamine
      7. ContentValidation  — finantskontroll
      8. ExportRendering    — JSON, TXT, CSV, manifest
    """

    def __init__(
        self,
        output_dir: str = "./output",
        dpi: int = 300,
        lang: str = "est+eng",
        formats: list[str] | None = None,
        auto_enhance: bool = True,
        tesseract_cmd: str | None = None,
    ):
        self.output_dir   = output_dir
        self.dpi          = dpi
        self.lang         = lang
        self.formats      = formats or ["json", "txt", "csv", "manifest"]
        self.auto_enhance = auto_enhance

        self._img_agent  = ImageProcessingAgent(target_dpi=dpi, auto_enhance=auto_enhance)
        self._lang_agent = LanguageDetectionAgent()
        self._text_agent = TextExtractionAgent(tesseract_cmd=tesseract_cmd, lang=lang)
        self._layout_agent = LayoutAnalysisAgent()
        self._table_agent  = TableDetectionAgent()
        self._format_agent = FormatCorrectionAgent()
        self._val_agent    = ContentValidationAgent()
        self._export_agent = ExportRenderingAgent(output_dir=output_dir, dpi=dpi)

    # ── public ──────────────────────────────────────────────────────────────

    def run(self, pdf_path: str, page_num: int = 0) -> dict[str, Any]:
        """
        Töötle üks PDF fail täielikult läbi kõigi agentide.
        Tagastab konsolideeritud tulemuse.
        """
        start = time.time()
        path = Path(pdf_path)
        results: dict[str, Any] = {
            "source": str(path),
            "agents_used": [],
            "errors": [],
        }

        try:
            image = self._load_image(path)
        except Exception as e:
            return {**results, "errors": [f"Faili laadimine ebaõnnestus: {e}"],
                    "success": False}

        # ── 1. Pilditöötlus ──────────────────────────────────────────────
        img_result = self._run_agent("image_processing", self._img_agent.process, image)
        results["image_quality"] = img_result.get("quality", {})
        results["agents_used"].append("ImageProcessingAgent")
        enhanced = img_result.get("enhanced_image", image)

        # ── 2. Keele tuvastus (eelvaade tekstist) ────────────────────────
        # Kiire eelekstraheerimine keele jaoks
        preview = self._run_agent("text_preview", self._text_agent.process, enhanced, 0)
        preview_text = preview.get("text", "")[:500]

        lang_result = self._run_agent("language_detection",
                                       self._lang_agent.process, preview_text)
        results["language"] = lang_result
        results["agents_used"].append("LanguageDetectionAgent")

        # Uuenda teksti agenti keelega
        detected_lang = lang_result.get("tesseract_lang", self.lang)
        self._text_agent.lang = detected_lang

        # ── 3. Teksti ekstraheerimine ────────────────────────────────────
        text_result = self._run_agent("text_extraction",
                                       self._text_agent.process, enhanced, page_num)
        results["text"]        = text_result.get("text", "")
        results["confidence"]  = text_result.get("confidence", 0.0)
        results["ocr_used"]    = text_result.get("ocr_used", False)
        results["agents_used"].append("TextExtractionAgent")

        # ── 4. Paigutuse analüüs ─────────────────────────────────────────
        layout_result = self._run_agent("layout_analysis",
                                         self._layout_agent.process, enhanced)
        results["layout"] = layout_result
        results["agents_used"].append("LayoutAnalysisAgent")

        # ── 5. Tabelite tuvastus ─────────────────────────────────────────
        table_result = self._run_agent("table_detection",
                                        self._table_agent.process,
                                        enhanced, results["text"])
        results["tables"]      = table_result.get("tables_found", [])
        results["table_count"] = table_result.get("table_count", 0)
        results["agents_used"].append("TableDetectionAgent")

        # ── 6. Formaadi korrektsioon ─────────────────────────────────────
        detected_base = detected_lang.split("+")[0]
        format_result = self._run_agent("format_correction",
                                         self._format_agent.process,
                                         results["text"], detected_base)
        results["corrected_text"] = format_result.get("corrected_text", results["text"])
        results["format_stats"]   = format_result.get("stats", {})
        results["agents_used"].append("FormatCorrectionAgent")

        # ── 7. Sisu valideerimine ────────────────────────────────────────
        val_result = self._run_agent("content_validation",
                                      self._val_agent.process, {
                                          "text":       results["corrected_text"],
                                          "confidence": results["confidence"],
                                          "source":     path.name,
                                          "page":       page_num,
                                      })
        results["validation"]    = val_result
        results["financial"]     = val_result.get("financial_data", {})
        results["agents_used"].append("ContentValidationAgent")

        # ── 8. Eksport ───────────────────────────────────────────────────
        export_data = {
            "text":        results["corrected_text"],
            "page_count":  1,
            "tables":      results["tables"],
            "word_count":  val_result.get("word_count", 0),
            "languages":   [detected_lang],
            "confidence":  results["confidence"],
            "agents_used": results["agents_used"],
            "stats":       results.get("format_stats", {}),
        }
        export_result = self._run_agent("export_rendering",
                                         self._export_agent.process,
                                         str(path), export_data, None, self.formats)
        results["output_files"] = export_result.get("output_files", [])
        results["agents_used"].append("ExportRenderingAgent")

        # ── Kokkuvõte ────────────────────────────────────────────────────
        elapsed = round(time.time() - start, 2)
        results["success"]          = val_result.get("is_valid", True)
        results["processing_time_s"] = elapsed
        results["errors"].extend(export_result.get("errors", []))

        logger.info("Pipeline valmis: %s (%.1fs, %d agent, %d tehingut)",
                    path.name, elapsed, len(results["agents_used"]),
                    results["financial"].get("transaction_count", 0))

        return results

    def run_batch(self, pdf_paths: list[str]) -> list[dict[str, Any]]:
        """Töötle mitu PDF-i järjest."""
        return [self.run(p) for p in pdf_paths]

    # ── private ──────────────────────────────────────────────────────────────

    def _run_agent(self, name: str, fn, *args, **kwargs) -> dict[str, Any]:
        """Käivita agent koos veahaldusega."""
        try:
            result = fn(*args, **kwargs)
            return result if isinstance(result, dict) else {}
        except Exception as e:
            logger.error("Agent '%s' viga: %s", name, e)
            return {"errors": [str(e)]}

    def _load_image(self, path: Path):
        """Laadi PDF esimene lehekülg PIL Image'iks."""
        from PIL import Image

        suffix = path.suffix.lower()
        if suffix in (".jpg", ".jpeg", ".png", ".tiff", ".bmp"):
            return Image.open(path).convert("RGB")

        # PDF → pilt
        try:
            import pypdfium2 as pdfium  # type: ignore
            doc = pdfium.PdfDocument(str(path))
            page = doc[0]
            bitmap = page.render(scale=self.dpi / 72)
            return bitmap.to_pil()
        except ImportError:
            logger.warning("pypdfium2 pole — proovin Pillow-ga otse")
            return Image.open(path).convert("RGB")
