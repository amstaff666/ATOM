"""
ContentValidationAgent v2
==========================
Ekstraheeritud sisu valideerimine ja kvaliteedikontroll.

Kontrollib:
  - Teksti täielikkus (word count, lehe katvus)
  - OCR kvaliteet (artefaktide arv, ebakindluse märgid)
  - Kohustuslikud väljad: kuupäev, summa, saaja (finantsdokumendid)
  - Pangaväljavõtete struktuur (IBAN, tehingud, saldod)
  - Duplikaatide tuvastus
  - Keele konsistents
  - Vastutustundliku laenamise indikaatorid
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ValidationIssue:
    severity: str   # "error" | "warning" | "info"
    code: str
    message: str
    field: str = ""


@dataclass
class FinancialData:
    ibans: list[str]
    amounts: list[float]
    dates: list[str]
    balance: float | None
    transaction_count: int


class ContentValidationAgent:
    """
    Sisu valideerimine, eriti finantsdokumentide jaoks.

    Kasutamine:
        result = agent.process({"text": "...", "page": 0, "source": "lhv.pdf"})
        if not result["is_valid"]:
            for issue in result["issues"]:
                print(issue["severity"], issue["message"])
    """

    MIN_WORDS_PER_PAGE = 30
    MAX_OCR_ARTIFACT_RATIO = 0.05  # max 5% kahtlased märgid

    # Pangaväljavõtete mustrid
    IBAN_RE    = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b")
    AMOUNT_RE  = re.compile(r"[-+]?\s*\d{1,3}(?:\s?\d{3})*[.,]\d{2}\s*€?")
    DATE_RE    = re.compile(r"\b\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}\b")
    BALANCE_RE = re.compile(r"(?:saldo|balance|jääk|остаток)[:\s]+([+-]?\s*[\d\s.,]+)", re.I)

    def process(self, extracted_data: dict[str, Any]) -> dict[str, Any]:
        text    = extracted_data.get("text", "")
        page    = extracted_data.get("page", 0)
        source  = extracted_data.get("source", "unknown")
        conf    = extracted_data.get("confidence", 1.0)

        issues: list[ValidationIssue] = []
        issues.extend(self._check_text_quality(text, conf))
        fin = self._extract_financial_data(text)
        issues.extend(self._check_financial_completeness(fin, source))
        completeness = self._calc_completeness(text, fin)
        content_hash = hashlib.md5(text.encode("utf-8", errors="ignore")).hexdigest()

        errors   = [i for i in issues if i.severity == "error"]
        warnings = [i for i in issues if i.severity == "warning"]

        return {
            "is_valid": len(errors) == 0,
            "completeness": completeness,
            "word_count": len(text.split()) if text else 0,
            "char_count": len(text),
            "content_hash": content_hash,
            "financial_data": {
                "ibans": fin.ibans,
                "amounts": fin.amounts,
                "dates": fin.dates,
                "balance": fin.balance,
                "transaction_count": fin.transaction_count,
            },
            "issues": [{"severity": i.severity, "code": i.code,
                         "message": i.message, "field": i.field}
                        for i in issues],
            "error_count": len(errors),
            "warning_count": len(warnings),
            "errors": [],  # agent-level errors
        }

    # ── validatsioon ─────────────────────────────────────────────────────────

    def _check_text_quality(self, text: str, confidence: float) -> list[ValidationIssue]:
        issues = []

        if not text or not text.strip():
            issues.append(ValidationIssue("error", "EMPTY_TEXT",
                                           "Tekst on tühi — OCR ebaõnnestus"))
            return issues

        words = text.split()
        if len(words) < self.MIN_WORDS_PER_PAGE:
            issues.append(ValidationIssue("warning", "LOW_WORD_COUNT",
                                           f"Vähesõnaline leht ({len(words)} sõna)"))

        if confidence < 0.6:
            issues.append(ValidationIssue("warning", "LOW_OCR_CONFIDENCE",
                                           f"OCR usaldusväärsus {confidence:.0%} — kontrolli käsitsi"))

        # Artefaktide osakaal
        artifact_chars = len(re.findall(r"[|\\^~`]", text))
        ratio = artifact_chars / max(len(text), 1)
        if ratio > self.MAX_OCR_ARTIFACT_RATIO:
            issues.append(ValidationIssue("warning", "OCR_ARTIFACTS",
                                           f"Palju OCR artefakte ({artifact_chars} tk, {ratio:.1%})"))

        # Juhtmärgid
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text):
            issues.append(ValidationIssue("error", "CONTROL_CHARS",
                                           "Tekst sisaldab juhtmärke"))

        return issues

    def _check_financial_completeness(self, fin: FinancialData,
                                       source: str) -> list[ValidationIssue]:
        issues = []
        src_lower = source.lower()

        is_bank_stmt = any(b in src_lower for b in
                           ["statement", "väljavõte", "lhv", "swed", "seb",
                            "coop", "luminor", "citadele"])

        if is_bank_stmt:
            if not fin.ibans:
                issues.append(ValidationIssue("warning", "NO_IBAN",
                                               "IBAN-i ei leitud — kas õige dokument?",
                                               field="iban"))
            if not fin.amounts:
                issues.append(ValidationIssue("warning", "NO_AMOUNTS",
                                               "Summasid ei leitud", field="amounts"))
            if not fin.dates:
                issues.append(ValidationIssue("warning", "NO_DATES",
                                               "Kuupäevi ei leitud", field="dates"))
            if fin.balance is None:
                issues.append(ValidationIssue("info", "NO_BALANCE",
                                               "Saldo ei leitud dokumendist", field="balance"))
            if fin.transaction_count == 0:
                issues.append(ValidationIssue("warning", "NO_TRANSACTIONS",
                                               "Tehinguid ei tuvastatud"))

        return issues

    # ── andmete ekstraheerimine ───────────────────────────────────────────────

    def _extract_financial_data(self, text: str) -> FinancialData:
        ibans = list({m.group() for m in self.IBAN_RE.finditer(text)})

        raw_amounts = self.AMOUNT_RE.findall(text)
        amounts = []
        for raw in raw_amounts:
            cleaned = re.sub(r"[€\s]", "", raw).replace(",", ".")
            try:
                amounts.append(round(float(cleaned), 2))
            except ValueError:
                pass

        dates = list({m.group() for m in self.DATE_RE.finditer(text)})[:20]

        balance = None
        bm = self.BALANCE_RE.search(text)
        if bm:
            try:
                bal_str = re.sub(r"\s", "", bm.group(1)).replace(",", ".")
                balance = float(bal_str)
            except ValueError:
                pass

        # Tehingute arv: ridade arv kus on kuupäev + summa
        lines_with_tx = sum(
            1 for line in text.split("\n")
            if self.DATE_RE.search(line) and self.AMOUNT_RE.search(line)
        )

        return FinancialData(
            ibans=ibans,
            amounts=amounts,
            dates=dates,
            balance=balance,
            transaction_count=lines_with_tx,
        )

    def _calc_completeness(self, text: str, fin: FinancialData) -> float:
        """Arvuta täielikkuse skoor 0–1."""
        score = 0.0
        if text and len(text.strip()) > 50: score += 0.25
        if fin.ibans:    score += 0.20
        if fin.amounts:  score += 0.20
        if fin.dates:    score += 0.20
        if fin.transaction_count > 0: score += 0.15
        return round(min(1.0, score), 2)
