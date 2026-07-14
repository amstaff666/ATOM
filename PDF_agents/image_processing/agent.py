"""
ImageProcessingAgent v2
=======================
PDF lehelt piltide töötlemine ja kvaliteedi parandamine.

Funktsioonid:
  - Automaatne pildikvaliteedi hindamine (blur / noise / brightness)
  - Adaptive enhancement (teritamine, kontrastsus, heledus)
  - Deskew (kallutuse korrektsioon)
  - Binariseerimine OCR-i jaoks (Otsu threshold)
  - DPI normaliseerimine
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ImageQuality:
    sharpness: float      # 0–1 (1 = terav)
    brightness: float     # 0–1 (0.5 = optimaalne)
    contrast: float       # 0–1
    noise_level: float    # 0–1 (0 = müravaba)
    is_acceptable: bool
    suggestions: list[str]


class ImageProcessingAgent:
    """
    Piltide töötlemine ja kvaliteedi parandamine.

    Kasutamine:
        agent = ImageProcessingAgent(target_dpi=300)
        result = agent.process(pil_image)
        enhanced_image = result["enhanced_image"]
    """

    TARGET_DPI       = 300
    MIN_SHARPNESS    = 0.3
    OPTIMAL_BRIGHTNESS_MIN = 0.35
    OPTIMAL_BRIGHTNESS_MAX = 0.75

    def __init__(self, target_dpi: int = 300, auto_enhance: bool = True):
        self.target_dpi    = target_dpi
        self.auto_enhance  = auto_enhance

    def process(self, image: Any) -> dict[str, Any]:
        """Töötle ja paranda pilti."""
        try:
            from PIL import Image, ImageEnhance, ImageFilter, ImageOps

            if isinstance(image, str):
                img = Image.open(image).convert("RGB")
            else:
                img = image.convert("RGB") if hasattr(image, "convert") else image

            quality = self._assess_quality(img)
            enhanced = img

            if self.auto_enhance:
                enhanced = self._enhance(img, quality)

            # Deskew
            try:
                enhanced = self._deskew(enhanced)
            except Exception:
                pass

            return {
                "image_processed": True,
                "original_size": img.size,
                "enhanced_size": enhanced.size,
                "quality": {
                    "sharpness": quality.sharpness,
                    "brightness": quality.brightness,
                    "contrast": quality.contrast,
                    "noise_level": quality.noise_level,
                    "is_acceptable": quality.is_acceptable,
                    "suggestions": quality.suggestions,
                },
                "enhanced_image": enhanced,
                "ocr_ready": self._to_ocr_binary(enhanced),
                "errors": [],
            }

        except Exception as e:
            logger.exception("Pilditöötlus ebaõnnestus")
            return {"image_processed": False, "errors": [str(e)],
                    "enhanced_image": image, "ocr_ready": None, "quality": {}}

    # ── quality assessment ───────────────────────────────────────────────────

    def _assess_quality(self, img: Any) -> ImageQuality:
        try:
            import numpy as np
            from PIL import ImageOps, ImageFilter

            gray_arr = np.array(ImageOps.grayscale(img), dtype=np.float32)

            # Teravus: Laplacian variance
            from PIL import Image
            laplacian = img.convert("L").filter(ImageFilter.FIND_EDGES)
            sharpness = min(1.0, float(np.array(laplacian).var()) / 500)

            # Heledus
            brightness = float(gray_arr.mean()) / 255

            # Kontrastsus (std)
            contrast = min(1.0, float(gray_arr.std()) / 80)

            # Müra (kõrgsagedus)
            noise = min(1.0, float(np.array(
                img.convert("L").filter(ImageFilter.DETAIL)
            ).std()) / 60)

            suggestions = []
            if sharpness < self.MIN_SHARPNESS:
                suggestions.append("Pilt on hägune — soovitan teritamist")
            if brightness < self.OPTIMAL_BRIGHTNESS_MIN:
                suggestions.append("Pilt on liiga tume — suurenda heledust")
            if brightness > self.OPTIMAL_BRIGHTNESS_MAX:
                suggestions.append("Pilt on liiga hele — vähenda heledust")
            if contrast < 0.3:
                suggestions.append("Madal kontrastsus — paranda OCR täpsust")

            return ImageQuality(
                sharpness=round(sharpness, 3),
                brightness=round(brightness, 3),
                contrast=round(contrast, 3),
                noise_level=round(noise, 3),
                is_acceptable=sharpness >= self.MIN_SHARPNESS and 0.2 <= brightness <= 0.85,
                suggestions=suggestions,
            )
        except Exception:
            return ImageQuality(0.5, 0.5, 0.5, 0.1, True, [])

    # ── enhancement ──────────────────────────────────────────────────────────

    def _enhance(self, img: Any, q: ImageQuality) -> Any:
        from PIL import ImageEnhance, ImageFilter

        result = img

        # Heledus
        if q.brightness < self.OPTIMAL_BRIGHTNESS_MIN:
            factor = min(1.8, self.OPTIMAL_BRIGHTNESS_MIN / max(q.brightness, 0.01))
            result = ImageEnhance.Brightness(result).enhance(factor)
        elif q.brightness > self.OPTIMAL_BRIGHTNESS_MAX:
            factor = max(0.6, self.OPTIMAL_BRIGHTNESS_MAX / q.brightness)
            result = ImageEnhance.Brightness(result).enhance(factor)

        # Kontrastsus
        if q.contrast < 0.4:
            result = ImageEnhance.Contrast(result).enhance(1.5)

        # Teravus
        if q.sharpness < self.MIN_SHARPNESS:
            result = ImageEnhance.Sharpness(result).enhance(2.0)
            result = result.filter(ImageFilter.SHARPEN)

        return result

    def _deskew(self, img: Any) -> Any:
        """Korrigeeri kallutus (kuni ±15°)."""
        try:
            import numpy as np
            from PIL import Image, ImageOps

            gray = np.array(ImageOps.grayscale(img))
            binary = (gray < 128).astype(np.uint8)

            # Hough-transform põhine nurga leidmine
            coords = np.column_stack(np.where(binary > 0))
            if len(coords) < 50:
                return img

            # PCA nurga leidmiseks
            coords_centered = coords - coords.mean(axis=0)
            _, _, vt = np.linalg.svd(coords_centered)
            angle_rad = math.atan2(vt[0, 0], vt[0, 1])
            angle_deg = math.degrees(angle_rad)

            if abs(angle_deg) > 0.5 and abs(angle_deg) < 15:
                return img.rotate(angle_deg, expand=True, fillcolor=255)
        except Exception:
            pass
        return img

    def _to_ocr_binary(self, img: Any) -> Any:
        """Loo OCR-optimeeritud binaarepilt (Otsu threshold)."""
        try:
            from PIL import Image, ImageOps
            import numpy as np

            gray = np.array(ImageOps.grayscale(img))
            # Otsu threshold
            hist, bins = np.histogram(gray.flatten(), bins=256)
            total = gray.size
            best_t, max_var = 128, 0.0
            w0 = 0
            sum_total = float(np.dot(np.arange(256), hist))
            sum0 = 0.0
            for t in range(256):
                w0 += hist[t]
                if w0 == 0:
                    continue
                w1 = total - w0
                if w1 == 0:
                    break
                sum0 += t * hist[t]
                m0 = sum0 / w0
                m1 = (sum_total - sum0) / w1
                var = w0 * w1 * (m0 - m1) ** 2
                if var > max_var:
                    max_var, best_t = var, t

            binary = (gray > best_t).astype(np.uint8) * 255
            return Image.fromarray(binary.astype(np.uint8), mode="L")
        except Exception:
            return None
