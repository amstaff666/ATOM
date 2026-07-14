"""
Luuna Autoflow - PDF Orchestrator Adapter
=========================================

Safe planning-only adapter for PDF workflow modules.

This adapter does not process PDF files, write files, call external APIs, or
execute dangerous actions. It only classifies a PDF-related goal and returns a
useful build plan for the operator/backend team.
"""

from __future__ import annotations

from typing import Any, Dict, List

from ..models import AdapterCapabilities, AutoflowTask, TaskDomain
from .base import BaseAdapter


PDF_KEYWORDS = (
    "pdf",
    "ocr",
    "template",
    "mall",
    "laenutaotlus",
    "pangaväljavõte",
    "pangavaljavote",
    "bank statement",
    "redaction",
    "merge",
    "split",
    "allkiri",
    "signature",
)


class PDFOrchestratorAdapter(BaseAdapter):
    """Creates safe build plans for the PDF Orkester."""

    def __init__(self) -> None:
        self.capabilities = AdapterCapabilities(
            id="pdf-orchestrator",
            name="PDF Orchestrator Adapter",
            description="Orkestreerib PDF tööriistu ja agente.",
            domains=[TaskDomain.PDF, TaskDomain.DOCUMENT],
            can_execute=True,
            requires_approval=False,
            priority=100,
            metadata={
                "safe_mode": True,
                "real_pdf_processing": False,
                "external_apis": False,
            },
        )

    def can_handle(self, task: AutoflowTask) -> bool:
        """Prefer this adapter for PDF domain and PDF-like goals."""
        goal = task.goal.lower()
        return task.domain == TaskDomain.PDF or any(
            keyword in goal for keyword in PDF_KEYWORDS
        )

    def plan(self, task: AutoflowTask) -> List[str]:
        """Return a stable, useful PDF build plan as API-safe list entries."""
        pdf_plan = self._build_pdf_plan(task.goal)

        steps: List[str] = [
            f"module: {pdf_plan['module']}",
            f"purpose: {pdf_plan['purpose']}",
            "required_agents:",
        ]
        steps.extend(f"- {agent}" for agent in pdf_plan["required_agents"])
        steps.append("suggested_backend_endpoints:")
        steps.extend(
            f"- {endpoint}" for endpoint in pdf_plan["suggested_backend_endpoints"]
        )
        steps.append("build_steps:")
        steps.extend(f"- {step}" for step in pdf_plan["build_steps"])
        steps.append("risks:")
        steps.extend(f"- {risk}" for risk in pdf_plan["risks"])
        steps.append("next_actions:")
        steps.extend(f"- {action}" for action in pdf_plan["next_actions"])
        return steps

    def execute(self, task: AutoflowTask) -> Dict[str, Any]:
        """
        Mock execution only.

        The execution bus calls this only for execute_mock mode. Keep the result
        structured and side-effect free.
        """
        return self._build_pdf_plan(task.goal)

    def _build_pdf_plan(self, goal: str) -> Dict[str, Any]:
        modules = self._select_modules(goal)

        return {
            "module": "PDF Orkester",
            "purpose": (
                "Koostada kontrollitud backend pipeline PDF editori, mallide, "
                "OCR-i, tabelite ja laenudokumentide orkestreerimiseks."
            ),
            "required_agents": self._required_agents(modules),
            "suggested_backend_endpoints": [
                "GET /api/autoflow/health",
                "GET /api/autoflow/providers",
                "POST /api/autoflow/tasks",
                "POST /api/pdf/jobs",
                "GET /api/pdf/jobs/{job_id}",
                "POST /api/pdf/templates",
                "POST /api/pdf/ocr",
                "POST /api/pdf/bank-statements/parse",
                "POST /api/pdf/loan-packs",
            ],
            "build_steps": self._build_steps(modules),
            "risks": [
                "Päris PDF töötlus peab jooksma backend/HF runtime’is, mitte frontendist.",
                "OCR ja pangaväljavõtete parser vajavad testfaile ning käsitsi kinnitust.",
                "Redaction/signature töövood on kõrge riskiga ja vajavad HITL approvalit.",
                "Failide salvestus peab kasutama backend kontrollitud storage kihti.",
                "Ära logi ega tagasta tundlikke isiku- või pangandusandmeid plain textina.",
            ],
            "next_actions": [
                "Kinnita PDF job schema ja staatuse mudel.",
                "Lisa backend route skeletonid PDF jobide, template ja OCR adapteri jaoks.",
                "Seo PDF Orkester Autoflow taskidega ainult plan_only/execute_mock režiimis.",
                "Lisa test payloadid laenutaotluse põhja ja pangaväljavõtte parseri jaoks.",
            ],
        }

    def _select_modules(self, goal: str) -> List[str]:
        text = goal.lower()
        selected: List[str] = []

        rules = [
            (
                ("editor", "muuda", "täida", "pdf editor"),
                "PDF Editor Builder",
            ),
            (
                ("template", "mall", "põhi", "pohja", "laenutaotlus"),
                "PDF Template Generator",
            ),
            (
                ("ocr", "tabel", "table", "extract", "väljavõte", "valjavote"),
                "OCR + Table Extractor",
            ),
            (
                ("pangaväljavõte", "pangavaljavote", "bank statement"),
                "Bank Statement Parser",
            ),
            (
                ("redaction", "redact", "peida", "mask"),
                "Redaction Agent",
            ),
            (
                ("merge", "split", "sign", "allkiri", "signature"),
                "Merge/Split/Sign PDF",
            ),
            (
                ("loan pack", "laenupakk", "laenu", "laenutaotlus"),
                "Loan Pack Builder",
            ),
            (
                ("missing", "puuduv", "puudu"),
                "Missing Documents Agent",
            ),
            (
                ("risk", "summary", "kokkuvõte", "kokkuvote"),
                "Risk Summary PDF",
            ),
            (
                ("client intake", "intake", "kliendi", "taotlus"),
                "Client Intake PDF Pack",
            ),
        ]

        for keywords, module in rules:
            if any(keyword in text for keyword in keywords):
                selected.append(module)

        if not selected:
            selected = [
                "PDF Editor Builder",
                "PDF Template Generator",
                "OCR + Table Extractor",
            ]

        return list(dict.fromkeys(selected))

    def _required_agents(self, modules: List[str]) -> List[str]:
        agents = {
            "PDF Router Agent",
            "PDF Editor Agent",
            "PDF Template Agent",
            "OCR Agent",
            "Table Extraction Agent",
        }

        if "Bank Statement Parser" in modules:
            agents.add("Bank Statement Parser Agent")
        if "Redaction Agent" in modules:
            agents.add("Redaction Agent")
        if "Merge/Split/Sign PDF" in modules:
            agents.add("Merge/Split Agent")
            agents.add("Signature/Fill Agent")
        if "Loan Pack Builder" in modules:
            agents.add("Loan Pack Builder Agent")
        if "Missing Documents Agent" in modules:
            agents.add("Missing Documents Agent")
        if "Risk Summary PDF" in modules:
            agents.add("Risk Summary Agent")
        if "Client Intake PDF Pack" in modules:
            agents.add("Client Intake Pack Agent")

        return sorted(agents)

    def _build_steps(self, modules: List[str]) -> List[str]:
        steps = [
            "Klassifitseeri PDF ülesande tüüp ja vali vajalikud moodulid.",
            f"Valitud moodulid: {', '.join(modules)}.",
            "Loo PDF job manifest: input files, target output, approvals, audit id.",
        ]

        if "PDF Editor Builder" in modules:
            steps.append("Disaini PDF editori backend adapter: load, annotate, fill, export.")
        if "PDF Template Generator" in modules:
            steps.append("Kirjelda laenutaotluse template väljad ja validation reeglid.")
        if "OCR + Table Extractor" in modules:
            steps.append("Lisa OCR/table extraction pipeline koos confidence score väljundiga.")
        if "Bank Statement Parser" in modules:
            steps.append("Lisa pangaväljavõtte parser: kontod, read, saldo, sissetulekud, kohustused.")
        if "Loan Pack Builder" in modules:
            steps.append("Koosta Loan Pack Builder: intake + dokumendid + risk summary + pangaraport.")

        steps.extend(
            [
                "Tagasta ainult plaan ja kontrollitud next_actions kuni päris PDF runtime on ühendatud.",
                "Nõua approval_required=true enne päris faili muutmist, allkirjastamist või redigeerimist.",
            ]
        )
        return steps
