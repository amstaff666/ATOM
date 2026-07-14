"""
Luuna Autoflow Core v0.1
========================

A safe meta-orchestrator skeleton for ATOM / Annator.
Provider-agnostic core that can integrate with:
- CrewAI (future adapter)
- n8n (future adapter)
- ComfyUI (future adapter)
- HF / local models (future adapter)
- MCP tools (future adapter)
- ATOM tools (future adapter)

Current status: Mock/local adapters only.
All execution is logged and auditable.
Dangerous actions require approval flag.
"""

from .models import (
    AutoflowTask,
    AutoflowResult,
    ExecutionRecord,
    AdapterCapabilities,
    TaskDomain,
    TaskMode,
)
from .router import Router
from .execution_bus import ExecutionBus
from .policy import PolicyEngine
from .memory import MemoryStore
from .registry import AdapterRegistry

__version__ = "0.1.0"
__all__ = [
    "AutoflowTask",
    "AutoflowResult",
    "ExecutionRecord",
    "AdapterCapabilities",
    "TaskDomain",
    "TaskMode",
    "Router",
    "ExecutionBus",
    "PolicyEngine",
    "MemoryStore",
    "AdapterRegistry",
]
