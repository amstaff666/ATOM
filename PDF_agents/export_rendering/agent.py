"""
ExportRenderingAgent v2
=======================
Töödeldud PDF-i eksportimine ja renderdamine.

Formaadid:
  - PDF (pypdfium2 / reportlab)
  - JSON (struktureeritud andmed)
  - TXT (puhas tekst)
  - CSV (tabelid)
  - Manifest (töötlemise kokkuvõte)
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ExportManifest:
    source_file: str
    export_time: str
    page_count: int
    agents_used: list[str]
    formats_exported: list[str]
    processing_stats: dict[str, Any]
    output_files: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class ExportRenderingAgent:
    """
    Töödeldud andmete eksportimine mitmesse formaati.

    Kasutamine:
        agent = ExportRenderingAgent(output_dir="./output")
        result = agent.process(original_pdf_path, processed_data, formats=["pdf","json","csv"])
    """

    SUPPORTED_FORMATS = {"pdf", "json", "txt", "csv", "manifest"}

    def __init__(self, output_dir: str = "./output", dpi: int = 300):
        self.output_dir = Path(output_dir)
        self.dpi = dpi
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def process(self, original_pdf: Any, processed_data: dict[str, Any],
                output_path: str | None = None,
                formats: list[str] | None = None) -> dict[str, Any]:
        """Ekspordi töödeldud andmed."""
        formats = formats or ["json", "txt", "manifest"]
        output_files: list[str] = []
        errors: list[str] = []

        base_name = self._get_base_name(original_pdf, output_path)

        for fmt in formats:
            if fmt not in self.SUPPORTED_FORMATS:
                errors.append(f"Tundmatu formaat: {fmt}")
                continue
            try:
                path = getattr(self, f"_export_{fmt}")(
                    base_name, processed_data, original_pdf
                )
                if path:
                    output_files.append(str(path))
            except Exception as e:
                logger.exception("Eksport %s ebaõnnestus", fmt)
                errors.append(f"{fmt}: {e}")

        manifest = ExportManifest(
            source_file=str(original_pdf) if original_pdf else "unknown",
            export_time=datetime.now().isoformat(),
            page_count=processed_data.get("page_count", 1),
            agents_used=processed_data.get("agents_used", []),
            formats_exported=formats,
            processing_stats=processed_data.get("stats", {}),
            output_files=output_files,
            errors=errors,
        )

        return {
            "exported": len(output_files) > 0,
            "output_files": output_files,
            "output_dir": str(self.output_dir),
            "formats": formats,
            "pages_processed": processed_data.get("page_count", 1),
            "manifest": self._manifest_to_dict(manifest),
            "errors": errors,
        }

    def render_page(self, image: Any, target_dpi: int | None = None) -> Any:
        """Renderlda leht sihtresolutsioonil."""
        dpi = target_dpi or self.dpi
        try:
            from PIL import Image
            if not hasattr(image, "size"):
                return image
            orig_w, orig_h = image.size
            # Eeldame, et algselt 72 DPI
            scale = dpi / 72
            new_w = int(orig_w * scale)
            new_h = int(orig_h * scale)
            return image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        except Exception as e:
            logger.warning("Renderdamine ebaõnnestus: %s", e)
            return image

    # ── formaadid ────────────────────────────────────────────────────────────

    def _export_json(self, base: str, data: dict, _original: Any) -> Path:
        path = self.output_dir / f"{base}.json"
        safe_data = self._make_serializable(data)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(safe_data, f, ensure_ascii=False, indent=2)
        logger.info("JSON eksporditud: %s", path)
        return path

    def _export_txt(self, base: str, data: dict, _original: Any) -> Path:
        path = self.output_dir / f"{base}.txt"
        pages = data.get("pages", [])
        with open(path, "w", encoding="utf-8") as f:
            if pages:
                for page in pages:
                    text = page.get("text", "")
                    if text:
                        f.write(f"--- Lehekülg {page.get('page', 0) + 1} ---\n")
                        f.write(text.strip() + "\n\n")
            else:
                text = data.get("text", "")
                f.write(text)
        logger.info("TXT eksporditud: %s", path)
        return path

    def _export_csv(self, base: str, data: dict, _original: Any) -> Path | None:
        tables = data.get("tables", [])
        if not tables:
            return None
        path = self.output_dir / f"{base}_tables.csv"
        with open(path, "w", encoding="utf-8-sig") as f:
            for i, table in enumerate(tables):
                f.write(f"# Tabel {i + 1}\n")
                rows = table.get("data", [])
                for row in rows:
                    line = ";".join(str(c).replace(";", ",") for c in row)
                    f.write(line + "\n")
                f.write("\n")
        logger.info("CSV eksporditud: %s", path)
        return path

    def _export_manifest(self, base: str, data: dict, original: Any) -> Path:
        path = self.output_dir / f"{base}_manifest.json"
        manifest = {
            "source": str(original) if original else "unknown",
            "exported_at": datetime.now().isoformat(),
            "page_count": data.get("page_count", 1),
            "agents_used": data.get("agents_used", []),
            "summary": {
                "tables": len(data.get("tables", [])),
                "words": data.get("word_count", 0),
                "languages": data.get("languages", []),
                "confidence": data.get("confidence", 0),
            },
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        return path

    def _export_pdf(self, base: str, data: dict, original: Any) -> Path | None:
        """PDF eksport — nõuab reportlab-i."""
        try:
            from reportlab.lib.pagesizes import A4  # type: ignore
            from reportlab.pdfgen import canvas as rl_canvas

            path = self.output_dir / f"{base}_processed.pdf"
            c = rl_canvas.Canvas(str(path), pagesize=A4)
            w, h = A4

            pages = data.get("pages", [{"text": data.get("text", "")}])
            for page in pages:
                text = page.get("text", "")
                if not text:
                    continue
                c.setFont("Helvetica", 9)
                y = h - 50
                for line in text.split("\n"):
                    if y < 50:
                        c.showPage()
                        c.setFont("Helvetica", 9)
                        y = h - 50
                    c.drawString(50, y, line[:120])
                    y -= 12
                c.showPage()
            c.save()
            logger.info("PDF eksporditud: %s", path)
            return path
        except ImportError:
            logger.warning("reportlab pole installitud — PDF eksport pole võimalik")
            return None

    # ── helpers ──────────────────────────────────────────────────────────────

    def _get_base_name(self, original: Any, output_path: str | None) -> str:
        if output_path:
            return Path(output_path).stem
        if original and isinstance(original, (str, Path)):
            return Path(str(original)).stem
        return f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _make_serializable(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._make_serializable(i) for i in obj]
        if hasattr(obj, "__dict__"):
            return self._make_serializable(obj.__dict__)
        try:
            json.dumps(obj)
            return obj
        except (TypeError, ValueError):
            return str(obj)

    def _manifest_to_dict(self, m: ExportManifest) -> dict:
        return {
            "source_file": m.source_file,
            "export_time": m.export_time,
            "page_count": m.page_count,
            "agents_used": m.agents_used,
            "formats_exported": m.formats_exported,
            "processing_stats": m.processing_stats,
            "output_files": m.output_files,
            "errors": m.errors,
        }
