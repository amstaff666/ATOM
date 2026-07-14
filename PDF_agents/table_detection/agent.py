"""
TableDetectionAgent v2
======================
Tabelite tuvastamine PDF-lehtedelt.

Strateegiad:
  1. Teksti-põhine: otsib "|" eraldajaid ja tab-struktureeritud ridu.
  2. Pildi-põhine: horisontaalsed/vertikaalsed jooned (Hough transform).
  3. Tagastab tabelite arvu, rea/veeru arvu ja andmed.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TableCell:
    row: int
    col: int
    text: str
    bbox: dict[str, float] = field(default_factory=dict)


@dataclass
class DetectedTable:
    id: int
    rows: int
    cols: int
    cells: list[TableCell]
    confidence: float
    bbox: dict[str, float] = field(default_factory=dict)
    source: str = "text"  # "text" | "image"


class TableDetectionAgent:
    """
    Tabelite tuvastamine.
    Eelistab teksti-põhist meetodit (kiirem), langeb pildi-põhisele.
    """

    MIN_TABLE_ROWS = 2
    MIN_TABLE_COLS = 2

    def process(self, pdf_page: Any, extracted_text: str = "") -> dict[str, Any]:
        """Tuvasta tabelid leheküljel."""
        tables: list[DetectedTable] = []
        errors: list[str] = []

        # 1) Teksti-põhine tuvastus
        if extracted_text:
            try:
                text_tables = self._detect_from_text(extracted_text)
                tables.extend(text_tables)
            except Exception as e:
                errors.append(f"Tekstituvastus: {e}")

        # 2) Pildi-põhine tuvastus (täiendab, ei asenda)
        if pdf_page is not None:
            try:
                img_tables = self._detect_from_image(pdf_page, start_id=len(tables))
                # Lisame ainult need, mis ei kattu juba leitud tabelitega
                tables.extend(img_tables)
            except Exception as e:
                errors.append(f"Pildipõhine tuvastus: {e}")

        return {
            "tables_found": [self._table_to_dict(t) for t in tables],
            "table_count": len(tables),
            "has_tables": len(tables) > 0,
            "table_regions": [{"id": t.id, "bbox": t.bbox} for t in tables],
            "errors": errors,
        }

    # ── teksti-põhine ────────────────────────────────────────────────────────

    def _detect_from_text(self, text: str) -> list[DetectedTable]:
        tables: list[DetectedTable] = []
        current_rows: list[list[str]] = []
        table_id = 0

        for line in text.split("\n"):
            stripped = line.strip()
            if not stripped:
                if current_rows and len(current_rows) >= self.MIN_TABLE_ROWS:
                    tables.append(self._rows_to_table(table_id, current_rows, "text"))
                    table_id += 1
                current_rows = []
                continue

            cells = self._split_row(stripped)
            if len(cells) >= self.MIN_TABLE_COLS:
                current_rows.append(cells)
            else:
                if current_rows and len(current_rows) >= self.MIN_TABLE_ROWS:
                    tables.append(self._rows_to_table(table_id, current_rows, "text"))
                    table_id += 1
                current_rows = []

        if current_rows and len(current_rows) >= self.MIN_TABLE_ROWS:
            tables.append(self._rows_to_table(table_id, current_rows, "text"))

        return tables

    def _split_row(self, line: str) -> list[str]:
        """Jaga rida lahtriteks | või tab põhjal."""
        if "|" in line:
            parts = [c.strip() for c in line.split("|") if c.strip()]
            return parts if len(parts) >= self.MIN_TABLE_COLS else []
        if "\t" in line:
            parts = [c.strip() for c in line.split("\t") if c.strip()]
            return parts if len(parts) >= self.MIN_TABLE_COLS else []
        # Proovi mitu tühikut (> 2 järjestikust)
        parts = re.split(r"\s{2,}", line.strip())
        return [p.strip() for p in parts if p.strip()] if len(parts) >= self.MIN_TABLE_COLS else []

    def _rows_to_table(self, tid: int, rows: list[list[str]], source: str) -> DetectedTable:
        max_cols = max(len(r) for r in rows)
        cells = [
            TableCell(row=ri, col=ci, text=cell)
            for ri, row in enumerate(rows)
            for ci, cell in enumerate(row)
        ]
        return DetectedTable(id=tid, rows=len(rows), cols=max_cols,
                              cells=cells, confidence=0.85, source=source)

    # ── pildi-põhine ─────────────────────────────────────────────────────────

    def _detect_from_image(self, image: Any, start_id: int = 0) -> list[DetectedTable]:
        """Tuvasta tabelid joonte abil (OpenCV / numpy)."""
        try:
            import numpy as np
            from PIL import Image, ImageOps

            if isinstance(image, str):
                img = Image.open(image).convert("RGB")
            else:
                img = image.convert("RGB") if hasattr(image, "convert") else image

            gray = np.array(ImageOps.grayscale(img))
            # Binariseerimine
            binary = (gray < 128).astype(np.uint8)

            h_lines = self._find_lines(binary, axis=1, min_len=img.width * 0.3)
            v_lines = self._find_lines(binary, axis=0, min_len=img.height * 0.1)

            if len(h_lines) >= 2 and len(v_lines) >= 2:
                rows = len(h_lines) - 1
                cols = len(v_lines) - 1
                bbox = {"x": int(v_lines[0]), "y": int(h_lines[0]),
                        "w": int(v_lines[-1] - v_lines[0]),
                        "h": int(h_lines[-1] - h_lines[0])}
                return [DetectedTable(id=start_id, rows=rows, cols=cols,
                                       cells=[], confidence=0.75,
                                       bbox=bbox, source="image")]
        except Exception as e:
            logger.debug("Pildi-põhine tabel: %s", e)
        return []

    def _find_lines(self, binary: Any, axis: int, min_len: float) -> list[float]:
        """Leia horisontaalsed/vertikaalsed jooned."""
        try:
            import numpy as np
            projection = binary.sum(axis=axis)
            threshold = min_len * 0.5
            line_positions = []
            in_line = False
            for i, val in enumerate(projection):
                if val >= threshold and not in_line:
                    in_line = True
                    line_start = i
                elif val < threshold and in_line:
                    line_positions.append((line_start + i) / 2)
                    in_line = False
            return line_positions
        except Exception:
            return []

    # ── helpers ──────────────────────────────────────────────────────────────

    def _table_to_dict(self, t: DetectedTable) -> dict[str, Any]:
        return {
            "id": t.id, "rows": t.rows, "cols": t.cols,
            "confidence": t.confidence, "source": t.source,
            "bbox": t.bbox,
            "data": [[c.text for c in t.cells if c.row == ri]
                     for ri in range(t.rows)],
        }
