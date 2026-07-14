---
name: pdf-text-extraction
version: 2.0.0
description: PDF teksti ekstraheerimine Tesseract OCR + pypdfium2 abil. Toetab eesti, inglise ja vene keelt, mitmeleheküljelist töötlemist ja confidence scoring-ut.
category: pdf-processing
agent: TextExtractionAgent
---

# PDF Text Extraction Skill

Ekstraheerib teksti PDF-dokumentidest kasutades kaheastmelist strateegiat:
1. **Native text layer** (pypdfium2) — kiire ja täpne digitaalsetele PDF-idele
2. **OCR fallback** (Tesseract) — skanneeritud ja pildipõhistele dokumentidele

## Kasutamine

```python
from PDF_agents.text_extraction.agent import TextExtractionAgent

agent = TextExtractionAgent(lang="est+eng")
result = agent.process(pil_image, page_num=0)

print(result["text"])          # ekstraheeritud tekst
print(result["confidence"])    # OCR usaldusväärsus (0–1)
print(result["ocr_used"])      # kas OCR-i kasutati
```

## Mitmeleheküljeline töötlemine

```python
results = agent.process_multipage(images_list)
full_text = "\n".join(r["text"] for r in results)
```

## Tagastatav struktuur

```json
{
  "text": "Pangaväljavõte...",
  "confidence": 0.94,
  "blocks": [{"id": 0, "text": "...", "page": 0, "confidence": 0.95, "bbox": {...}}],
  "page": 0,
  "word_count": 342,
  "char_count": 2841,
  "ocr_used": true,
  "errors": []
}
```

## Sõltuvused

```
pytesseract>=0.3.10
Pillow>=10.0.0
pypdfium2>=4.0.0  # valikuline, native text layer jaoks
```

## Tesseract paigaldamine

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-est tesseract-ocr-eng

# Windows (winget)
winget install UB-Mannheim.TesseractOCR
```
