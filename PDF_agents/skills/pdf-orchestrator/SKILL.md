---
name: pdf-orchestrator
version: 2.0.0
description: PDF AI Orchestraatori täistsükkel — koordineerib kõiki 8 agenti üheks pipeline'iks. Sisend: PDF fail. Väljund: JSON, TXT, CSV, manifest.
category: orchestration
agents: all
---

# PDF AI Orchestrator

Koordineerib kõiki 8 PDF agenti loogilises järjekorras.

## Pipeline

```
PDF fail
  ↓
[1] ImageProcessingAgent     → pildikvaliteedi parandamine
  ↓
[2] LanguageDetectionAgent   → Tesseract keele valimine
  ↓
[3] TextExtractionAgent      → OCR / native text
  ↓
[4] LayoutAnalysisAgent      → veerud, piirkonnad
  ↓
[5] TableDetectionAgent      → tabelid + lahtrid
  ↓
[6] FormatCorrectionAgent    → teksti puhastamine
  ↓
[7] ContentValidationAgent   → finantskontroll, IBAN, summad
  ↓
[8] ExportRenderingAgent     → JSON + TXT + CSV + manifest
```

## Kasutamine

```python
from PDF_agents.orchestrator import PDFOrchestrator

orch = PDFOrchestrator(output_dir="./output")
result = orch.run("lhv_statement_12m.pdf")

print(result["validation"]["is_valid"])
print(result["financial"]["transaction_count"])
for f in result["output_files"]:
    print(f"Eksporditud: {f}")
```

## Konfiguratsiooni näide

```python
orch = PDFOrchestrator(
    output_dir="./output",
    dpi=300,
    lang="est+eng",
    formats=["json", "txt", "csv", "manifest"],
    auto_enhance=True,
)
```

## Veahaldus

Iga agent töötab iseseisvalt — ühe agendi viga ei peata kogu pipeline'i.
Vead kogutakse `result["errors"]` väljale.

## Nõuded

```
pytesseract>=0.3.10
Pillow>=10.0.0
numpy>=1.24.0
pypdfium2>=4.0.0
langdetect>=1.0.9    # valikuline
reportlab>=4.0.0     # valikuline, PDF ekspordi jaoks
```
