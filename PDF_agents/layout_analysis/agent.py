"""
LayoutAnalysisAgent v2
======================
PDF lehe paigutuse analüüs: veerud, päised, jalused, piirkonnad, read.
Kasutab pildi intensiivsusanalüüsi ilma ML-mudelita.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PageRegion:
    name: str
    y_start: float
    y_end: float
    x_start: float = 0.0
    x_end: float = 1.0
    content_type: str = "body"


@dataclass
class Column:
    id: int
    x_start: int
    x_end: int
    width: int
    text_density: float = 0.0


class LayoutAnalysisAgent:
    """
    Lehe paigutuse analüüs.

    Tuvastab:
      - Header / body / footer piirkonnad (10% / 80% / 10% reegel)
      - Veergude arv (1 või 2) — intensiivsuse histogrammi põhjal
      - Veerised (valge ala lehtede ääres)
      - Tekstitihedus regioonide kaupa
    """

    HEADER_RATIO = 0.10
    FOOTER_RATIO = 0.10
    TWO_COL_GAP  = 0.15   # min suhteline tühik kahe veeru vahel

    def process(self, pdf_page: Any) -> dict[str, Any]:
        """Analüüsi lehe paigutus."""
        try:
            from PIL import Image, ImageOps
            if isinstance(pdf_page, str):
                image = Image.open(pdf_page).convert("RGB")
            else:
                image = pdf_page.convert("RGB") if hasattr(pdf_page, "convert") else pdf_page

            width, height = image.size
            gray = ImageOps.grayscale(image)

            regions = self._detect_regions(width, height)
            columns = self._detect_columns(gray, width, height)
            margins = self._analyze_margins(gray, width, height)
            density = self._text_density_map(gray, height)

            return {
                "dimensions": {"width": width, "height": height},
                "regions": {r.name: {"y_start": r.y_start, "y_end": r.y_end,
                                      "content_type": r.content_type}
                            for r in regions},
                "columns": [{"id": c.id, "x_start": c.x_start, "x_end": c.x_end,
                              "width": c.width, "text_density": c.text_density}
                             for c in columns],
                "column_count": len(columns),
                "margins": margins,
                "text_density_map": density,
                "is_two_column": len(columns) == 2,
                "errors": [],
            }

        except Exception as e:
            logger.exception("Paigutuse analüüs ebaõnnestus")
            return {"dimensions": {}, "regions": {}, "columns": [],
                    "column_count": 1, "margins": {}, "text_density_map": [],
                    "is_two_column": False, "errors": [str(e)]}

    # ── private ─────────────────────────────────────────────────────────────

    def _detect_regions(self, w: int, h: int) -> list[PageRegion]:
        return [
            PageRegion("header", 0,                        int(h * self.HEADER_RATIO), content_type="header"),
            PageRegion("body",   int(h * self.HEADER_RATIO), int(h * (1 - self.FOOTER_RATIO)), content_type="body"),
            PageRegion("footer", int(h * (1 - self.FOOTER_RATIO)), h, content_type="footer"),
        ]

    def _detect_columns(self, gray: Any, width: int, height: int) -> list[Column]:
        """Veergude tuvastus — vertikaalne projektsioon."""
        try:
            import numpy as np
            arr = np.array(gray, dtype=np.float32)
            # Vertikaalne summa (tumedad pikslid = tekst)
            col_sum = (255 - arr).sum(axis=0)
            col_norm = col_sum / col_sum.max() if col_sum.max() > 0 else col_sum

            # Leia tühivöö keskel (kahe veeru vaheline vahe)
            mid_start = int(width * 0.3)
            mid_end   = int(width * 0.7)
            mid_zone  = col_norm[mid_start:mid_end]
            gap_center = mid_start + int(mid_zone.argmin())

            # Kui tühivöö on piisavalt tühi, on 2 veergu
            if col_norm[gap_center] < self.TWO_COL_GAP:
                left  = Column(0, 0, gap_center, gap_center,
                               text_density=float(col_norm[:gap_center].mean()))
                right = Column(1, gap_center, width, width - gap_center,
                               text_density=float(col_norm[gap_center:].mean()))
                return [left, right]

            return [Column(0, 0, width, width,
                           text_density=float(col_norm.mean()))]
        except ImportError:
            # numpy puudub — tagasta lihtne 1-veerg
            return [Column(0, 0, width, width)]

    def _analyze_margins(self, gray: Any, width: int, height: int) -> dict[str, int]:
        """Veeriste tuvastus — leia esimene must piksel igal küljel."""
        try:
            import numpy as np
            arr = np.array(gray)
            dark = arr < 200  # tume piksel = sisu

            top    = int(dark.any(axis=1).argmax())
            bottom = height - int(dark.any(axis=1)[::-1].argmax())
            left   = int(dark.any(axis=0).argmax())
            right  = width - int(dark.any(axis=0)[::-1].argmax())

            return {"top": top, "bottom": height - bottom,
                    "left": left, "right": width - right}
        except Exception:
            return {"top": 50, "bottom": 50, "left": 50, "right": 50}

    def _text_density_map(self, gray: Any, height: int, bands: int = 10) -> list[float]:
        """Jaota leht horisontaalseteks ribadeks ja arvuta tihedus."""
        try:
            import numpy as np
            arr = 255 - np.array(gray, dtype=np.float32)
            band_h = height // bands
            return [
                round(float(arr[i * band_h:(i + 1) * band_h].mean() / 255), 3)
                for i in range(bands)
            ]
        except Exception:
            return [0.0] * bands
