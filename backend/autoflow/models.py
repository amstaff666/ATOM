"""
Luuna Autoflow Core - Data Models
=================================

Pydantic models for task definitions, results, and execution records.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class TaskDomain(str, Enum):
    """Supported task domains for routing."""
    PDF = "pdf"
    WORKFLOW = "workflow"
    AGENT = "agent"
    DOCUMENT = "document"
    GENERAL = "general"


class TaskMode(str, Enum):
    """Execution modes."""
    PLAN_ONLY = "plan_only"
    EXECUTE_MOCK = "execute_mock"
    # Future: EXECUTE_REAL = "execute_real"  # Requires approval


class TaskStatus(str, Enum):
    """Execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_APPROVAL = "requires_approval"


class AutoflowTask(BaseModel):
    """Input task definition."""
    goal: str = Field(..., description="Task goal/description")
    mode: TaskMode = Field(default=TaskMode.PLAN_ONLY, description="Execution mode")
    domain: TaskDomain = Field(default=TaskDomain.GENERAL, description="Task domain")
    approval_required: bool = Field(default=True, description="Whether approval is required for execution")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class AutoflowResult(BaseModel):
    """Structured execution result."""
    success: bool = Field(..., description="Whether execution succeeded")
    execution_id: str = Field(..., description="Unique execution identifier")
    selected_adapter: str = Field(..., description="Adapter that handled the task")
    plan: List[str] = Field(default_factory=list, description="Generated plan steps")
    result: Dict[str, Any] = Field(default_factory=dict, description="Execution result data")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    requires_approval: bool = Field(default=False, description="Whether further approval is needed")
    status: TaskStatus = Field(default=TaskStatus.COMPLETED, description="Execution status")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")


class ExecutionRecord(BaseModel):
    """Stored execution record for memory/persistence."""
    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal: str = Field(..., description="Original goal")
    domain: TaskDomain = Field(..., description="Task domain")
    mode: TaskMode = Field(..., description="Execution mode")
    selected_adapter: Optional[str] = Field(default=None, description="Selected adapter")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Execution status")
    plan: List[str] = Field(default_factory=list, description="Generated plan")
    result: Dict[str, Any] = Field(default_factory=dict, description="Result data")
    warnings: List[str] = Field(default_factory=list, description="Warnings")
    requires_approval: bool = Field(default=False, description="Whether approval is required")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


class AdapterCapabilities(BaseModel):
    """Adapter capability declaration."""
    id: str = Field(..., description="Adapter identifier")
    name: str = Field(..., description="Human-readable name")
    description: str = Field(default="", description="Adapter description")
    domains: List[TaskDomain] = Field(default_factory=list, description="Supported domains")
    can_execute: bool = Field(default=False, description="Can execute real actions")
    requires_approval: bool = Field(default=True, description="Requires approval for execution")
    priority: int = Field(default=0, description="Routing priority (higher = preferred)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ProviderInfo(BaseModel):
    """Provider/adapter info for API responses."""
    id: str
    name: str
    description: str
    domains: List[str]
    can_execute: bool
    requires_approval: bool
    status: str = "available"
