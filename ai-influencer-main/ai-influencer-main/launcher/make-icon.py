"""Build multi-size Windows .ico from launcher source image."""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "app-icon-source.jpg"
OUT = HERE / "app-icon.ico"

img = Image.open(SRC).convert("RGBA")
base = img.resize((256, 256), Image.Resampling.LANCZOS)
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
base.save(OUT, format="ICO", sizes=sizes)
print(f"Wrote {OUT}")