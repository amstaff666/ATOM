# PDF Agents — Restart-CRM PDF Orchestraator

**Asukoht:** `PDF_agents/`  
**Versioon:** 2.0.0  
**Eesmärk:** Eesti pangaväljavõtete ja finantsdokumentide täisautomaatne töötlemine

---

## Struktuur

```
PDF_agents/
├── orchestrator.py              ← Peamine koordinaator (kasuta seda)
├── __init__.py                  ← Kõigi agentide import
├── requirements.txt
│
├── text_extraction/agent.py     ← OCR + native text
├── layout_analysis/agent.py     ← Veerud, piirkonnad
├── table_detection/agent.py     ← Tabelid + lahtrid
├── image_processing/agent.py    ← Pildikvaliteet + deskew
├── format_correction/agent.py   ← Teksti puhastamine
├── language_detection/agent.py  ← Keele autovalik
├── content_validation/agent.py  ← Finantskontroll, IBAN
├── export_rendering/agent.py    ← JSON, TXT, CSV, manifest
│
├── skills/
│   ├── pdf-text-extraction/SKILL.md
│   ├── pdf-bank-statement-parser/SKILL.md
│   └── pdf-orchestrator/SKILL.md
│
├── SKILLLID/                    ← Kiro skills (välised)
└── skills/ (Kiro välised)       ← proactive-agent, self-improvement jne
```

---

## Kiire alustamine

```python
from PDF_agents.orchestrator import PDFOrchestrator

orch = PDFOrchestrator(output_dir="./output")
result = orch.run("lhv_statement_12m.pdf")

print("Kehtiv:", result["validation"]["is_valid"])
print("Tehinguid:", result["financial"]["transaction_count"])
print("Failid:", result["output_files"])
```

---

## 8 Agenti

| # | Agent | Ülesanne |
|---|-------|----------|
| 1 | **ImageProcessingAgent** | Pildikvaliteedi parandamine, deskew, Otsu threshold |
| 2 | **LanguageDetectionAgent** | Keeletuvastus (est/eng/rus/fin/deu/lav) |
| 3 | **TextExtractionAgent** | OCR (Tesseract) + native text (pypdfium2) |
| 4 | **LayoutAnalysisAgent** | Veerud, header/footer/body, veerised |
| 5 | **TableDetectionAgent** | Tabelite tuvastus (tekst + jooned) |
| 6 | **FormatCorrectionAgent** | Teksti puhastamine, sidekriipsud, artefaktid |
| 7 | **ContentValidationAgent** | IBAN, summad, kuupäevad, finantskontroll |
| 8 | **ExportRenderingAgent** | JSON + TXT + CSV + manifest eksport |

---

## Paigaldamine

```bash
pip install -r PDF_agents/requirements.txt

# Tesseract (Windows)
winget install UB-Mannheim.TesseractOCR
# Lisa PATH: C:\Program Files\Tesseract-OCR

# Eesti keelepakett
# Laadi tessdata: https://github.com/tesseract-ocr/tessdata
# Kopeeri est.traineddata → C:\Program Files\Tesseract-OCR\tessdata\
```

---

## Toetatud pangad

LHV · Swedbank · SEB · Coop Pank · Luminor · Citadele
