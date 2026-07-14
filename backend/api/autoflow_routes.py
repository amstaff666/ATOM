"""
Luuna Autoflow - API Routes
==========================

FastAPI routes for Autoflow Core.

Endpoints:
- GET  /api/autoflow/health       - Health check
- GET  /api/autoflow/providers    - List providers
- POST /api/autoflow/tasks        - Submit task
- GET  /api/autoflow/tasks/{id}   - Get execution record
- GET  /api/autoflow/tasks        - List executions
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Body, status
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError

# Import autoflow core
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from autoflow import (
    AutoflowTask,
    AutoflowResult,
    ExecutionRecord,
    TaskDomain,
    TaskMode,
    Router,
    ExecutionBus,
    PolicyEngine,
    MemoryStore,
    AdapterRegistry,
)
from autoflow.adapters import (
    MockLLMAdapter,
    PDFOrchestratorAdapter,
    AtomToolsAdapter,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/autoflow", tags=["autoflow"])

# Initialize components
memory = MemoryStore()
policy = PolicyEngine()
registry = AdapterRegistry()

# Register adapters
registry.register(MockLLMAdapter())
registry.register(PDFOrchestratorAdapter())
registry.register(AtomToolsAdapter())

# Create execution bus
bus = ExecutionBus(
    adapters=registry.list_adapters(),
    memory=memory,
    policy=policy,
)


# Request/Response models
class TaskRequest(BaseModel):
    """Task submission request."""
    goal: str = Field(..., description="Task goal/description", min_length=1)
    mode: str = Field(default="plan_only", description="Execution mode: plan_only or execute_mock")
    domain: str = Field(default="general", description="Task domain: pdf, workflow, agent, document, general")
    approval_required: bool = Field(default=True, description="Whether approval is required")


def error_response(status_code: int, error: str, details: Any = None) -> JSONResponse:
    """Return stable JSON errors for Autoflow clients."""
    payload = {
        "success": False,
        "error": error,
        "details": details,
    }
    return JSONResponse(status_code=status_code, content=payload)


def validation_details(exc: ValidationError) -> list[dict[str, Any]]:
    """Make Pydantic validation errors JSON serializable and useful."""
    return [
        {
            "loc": list(error.get("loc", [])),
            "msg": error.get("msg", "Invalid value"),
            "type": error.get("type", "validation_error"),
        }
        for error in exc.errors()
    ]


class TaskResponse(BaseModel):
    """Task submission response."""
    success: bool
    execution_id: str
    selected_adapter: str
    plan: list
    result: dict
    warnings: list
    requires_approval: bool
    status: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str


class ProviderResponse(BaseModel):
    """Provider list response."""
    providers: list
    count: int


class ExecutionResponse(BaseModel):
    """Execution record response."""
    execution_id: str
    goal: str
    domain: str
    mode: str
    selected_adapter: Optional[str]
    status: str
    plan: list
    result: dict
    warnings: list
    requires_approval: bool
    created_at: str
    updated_at: str
    completed_at: Optional[str]


# Endpoints
@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns service status and version.
    """
    return HealthResponse(
        status="ok",
        service="luuna-autoflow",
        version="0.1",
    )


@router.get("/providers", response_model=ProviderResponse)
async def list_providers():
    """
    List registered providers/adapters.
    
    Returns list of available adapters with their capabilities.
    """
    providers = registry.list_providers()
    
    return ProviderResponse(
        providers=[p.model_dump() for p in providers],
        count=len(providers),
    )


@router.post("/tasks", response_model=TaskResponse)
async def submit_task(payload: dict[str, Any] = Body(...)):
    """
    Submit a task for execution.
    
    Behavior:
    - Classifies the task
    - Chooses adapter
    - Creates execution ID
    - If mode=plan_only, returns plan without execution
    - If mode=execute_mock, runs mock adapter only
    
    Returns structured result.
    """
    try:
        try:
            request = TaskRequest.model_validate(payload)
        except ValidationError as e:
            return error_response(
                status.HTTP_400_BAD_REQUEST,
                "Invalid Autoflow task payload",
                validation_details(e),
            )

        # Validate mode
        try:
            task_mode = TaskMode(request.mode)
        except ValueError:
            return error_response(
                status.HTTP_400_BAD_REQUEST,
                f"Invalid mode: {request.mode}",
                {
                    "allowed_modes": [mode.value for mode in TaskMode],
                    "received": request.mode,
                },
            )
        
        # Validate domain
        try:
            task_domain = TaskDomain(request.domain)
        except ValueError:
            return error_response(
                status.HTTP_400_BAD_REQUEST,
                f"Invalid domain: {request.domain}",
                {
                    "allowed_domains": [domain.value for domain in TaskDomain],
                    "received": request.domain,
                },
            )
        
        # Create task
        task = AutoflowTask(
            goal=request.goal,
            mode=task_mode,
            domain=task_domain,
            approval_required=request.approval_required,
        )
        
        # Execute through bus
        result: AutoflowResult = bus.execute(task)
        
        return TaskResponse(
            success=result.success,
            execution_id=result.execution_id,
            selected_adapter=result.selected_adapter,
            plan=result.plan,
            result=result.result,
            warnings=result.warnings,
            requires_approval=result.requires_approval,
            status=result.status.value,
        )
        
    except Exception as e:
        logger.error(f"Task execution failed: {str(e)}")
        return error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Task execution failed",
            str(e),
        )


@router.get("/tasks/{execution_id}")
async def get_execution(execution_id: str):
    """
    Get execution record by ID.
    
    Returns stored execution details.
    Returns 404 JSON if execution not found.
    """
    record: Optional[ExecutionRecord] = bus.get_execution(execution_id)
    
    if not record:
        # Return JSON 404, not HTML error
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": "Execution not found",
                "execution_id": execution_id,
                "detail": f"No execution record found with ID: {execution_id}"
            }
        )
    
    return ExecutionResponse(
        execution_id=record.execution_id,
        goal=record.goal,
        domain=record.domain.value,
        mode=record.mode.value,
        selected_adapter=record.selected_adapter,
        status=record.status.value,
        plan=record.plan,
        result=record.result,
        warnings=record.warnings,
        requires_approval=record.requires_approval,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
        completed_at=record.completed_at.isoformat() if record.completed_at else None,
    )


@router.get("/tasks")
async def list_executions(limit: int = 10, status_filter: Optional[str] = None):
    """
    List recent executions.
    
    Optional filters:
    - limit: Maximum number of records (default 10)
    - status_filter: Filter by status (pending, running, completed, failed)
    """
    if status_filter:
        records = memory.list_by_status(status_filter)
    else:
        records = memory.list_all()
    
    # Sort by created_at descending and limit
    records.sort(key=lambda r: r.created_at, reverse=True)
    records = records[:limit]
    
    return {
        "executions": [
            {
                "execution_id": r.execution_id,
                "goal": r.goal[:100] + "..." if len(r.goal) > 100 else r.goal,
                "domain": r.domain.value,
                "status": r.status.value,
                "selected_adapter": r.selected_adapter,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ],
        "count": len(records),
    }


# Export router for registration
__all__ = ["router"]




