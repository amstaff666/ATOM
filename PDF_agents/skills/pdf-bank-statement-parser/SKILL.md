---
name: pdf-bank-statement-parser
version: 2.0.0
description: Eesti pangaväljavõtete täisautomaatne töötlemine. Tuvastab IBAN-id, tehingud, saldod ja kuupäevad LHV, Swedbank, SEB, Coop, Luminor ja Citadele formaatidest.
category: finance
agents: [TextExtractionAgent, ContentValidationAgent, TableDetectionAgent, FormatCorrectionAgent]
---

# PDF Bank Statement Parser

Töötleb Eesti pankade väljavõtteid ja ekstraheerib struktureeritud finantsandmed.

## Toetatud pangad

| Pank | Formaat | Tuvastus |
|------|---------|----------|
| LHV | PDF native | ✅ |
| Swedbank | PDF (tihti skanneeritud) | ✅ OCR |
| SEB | PDF native | ✅ |
| Coop Pank | PDF native | ✅ |
| Luminor | PDF native | ✅ |
| Citadele | PDF (mõnikord skanneeritud) | ✅ OCR |

## Kasutamine

```python
from PDF_agents import (
    TextExtractionAgent,
    ContentValidationAgent,
    TableDetectionAgent,
    FormatCorrectionAgent,
)
from PIL import Image

def parse_bank_statement(pdf_image_path: str, bank: str = "auto") -> dict:
    img = Image.open(pdf_image_path)

    # 1. Keel
    text_raw = TextExtractionAgent(lang="est+eng").process(img)

    # 2. Teksti puhastamine
    corrected = FormatCorrectionAgent().process(text_raw["text"], lang="est")

    # 3. Tabelid
    tables = TableDetectionAgent().process(img, corrected["corrected_text"])

    # 4. Valideerimine
    validation = ContentValidationAgent().process({
        "text": corrected["corrected_text"],
        "confidence": text_raw["confidence"],
        "source": f"{bank}_statement.pdf",
    })

    return {
        "bank": bank,
        "transactions": tables["tables_found"],
        "financial": validation["financial_data"],
        "is_valid": validation["is_valid"],
        "issues": validation["issues"],
    }
```

## Väljavõtte struktuur

```json
{
  "bank": "LHV",
  "transactions": [
    {"row": 0, "data": ["2025-01-15", "MAXIMA EESTI", "-42.30", "1 234.56"]}
  ],
  "financial": {
    "ibans": ["EE38 2200 2210 0123 4567"],
    "amounts": [42.30, 1234.56],
    "dates": ["15.01.2025"],
    "balance": 1234.56,
    "transaction_count": 47
  },
  "is_valid": true,
  "issues": []
}
```

## Tüüpilised vigade põhjused

| Viga | Põhjus | Lahendus |
|------|--------|----------|
| `NO_IBAN` | IBAN ei leitud | Kontrolli kas PDF on õige leht |
| `LOW_OCR_CONFIDENCE` | Skanneeritud ja halb kvaliteet | Lisa ImageProcessingAgent enne |
| `NO_TRANSACTIONS` | Tabel tuvastamata | Kontrolli TableDetectionAgent konfiguratsiooni |
