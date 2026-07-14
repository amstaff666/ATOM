"""
KingPDF integration routes.

This is a safe local adapter surface for Annaator. It does not call external
KingPDF services yet; it exposes stable JSON endpoints for frontend integration
and future backend wiring.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/kingpdf", tags=["kingpdf"])


class KingPdfHealthResponse(BaseModel):
    success: bool = True
    service: str = "kingpdf"
    status: str = "registered"
    version: str = "0.1-local"
    external_execution: bool = False
    timestamp: str


class KingPdfCapability(BaseModel):
    id: str
    label: str
    description: str
    status: str = "planned"


class KingPdfPlanRequest(BaseModel):
    goal: str = Field(..., min_length=1)
    mode: str = Field(default="plan_only")
    document_type: str = Field(default="pdf")
    approval_required: bool = Field(default=True)


class KingPdfPlanResponse(BaseModel):
    success: bool
    mode: str
    selected_adapter: str
    plan: List[str]
    warnings: List[str] = Field(default_factory=list)
    requires_approval: bool = True
    result: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


CAPABILITIES = [
    KingPdfCapability(
        id="pdf_editor",
        label="PDF editor",
        description="PDF vaatamine, vormide täitmine, annotatsioonid ja lehekülgede korrastamine.",
        status="registered",
    ),
    KingPdfCapability(
        id="pdf_conversion",
        label="PDF conversion",
        description="PDF import/export ja formaadivahetuse töövood.",
        status="planned",
    ),
    KingPdfCapability(
        id="pdf_orchestration",
        label="PDF orchestration",
        description="KingPDF sidumine Annaatori PDF Orkestri ja Autoflow plaanidega.",
        status="registered",
    ),
    KingPdfCapability(
        id="loan_documents",
        label="Loan document package",
        description="Laenutaotluse põhjade ja pangaväljavõtete PDF töötluse tugi.",
        status="planned",
    ),
]


@router.get("/health", response_model=KingPdfHealthResponse)
async def kingpdf_health() -> KingPdfHealthResponse:
    return KingPdfHealthResponse(timestamp=datetime.utcnow().isoformat())


@router.get("/capabilities")
async def kingpdf_capabilities() -> Dict[str, Any]:
    return {
        "success": True,
        "service": "kingpdf",
        "capabilities": [capability.model_dump() for capability in CAPABILITIES],
        "count": len(CAPABILITIES),
        "external_execution": False,
    }


@router.post("/plan", response_model=KingPdfPlanResponse)
async def kingpdf_plan(request: KingPdfPlanRequest) -> KingPdfPlanResponse:
    if request.mode not in {"plan_only", "execute_mock"}:
        return KingPdfPlanResponse(
            success=False,
            mode=request.mode,
            selected_adapter="kingpdf-local",
            plan=[],
            warnings=[],
            requires_approval=True,
            error="Invalid mode. Allowed modes: plan_only, execute_mock",
        )

    plan = [
        f"Analüüsi eesmärk: {request.goal}",
        "Kaardista KingPDF editori roll Annaatori PDF Orkestris.",
        "Seo PDF failide sisend document_metadata / pdf_jobs töövooga.",
        "Lisa turvaline plan_only või execute_mock käivitusrada.",
        "Määra käsitsi kinnituse punktid enne päris PDF muutmist või eksporti.",
        "Valmista hilisem adapter päris KingPDF teenuse või lokaalse mooduli jaoks.",
    ]

    return KingPdfPlanResponse(
        success=True,
        mode=request.mode,
        selected_adapter="kingpdf-local",
        plan=plan,
        warnings=["Local adapter only - no external KingPDF execution performed"],
        requires_approval=request.approval_required,
        result={
            "document_type": request.document_type,
            "external_execution": False,
            "ready_for_menu": True,
        },
    )


__all__ = ["router"]
