"""
Luuna Autoflow Core - Execution Bus
===================================

Central execution orchestrator that:
- Creates execution IDs
- Calls router for adapter selection
- Calls adapter for execution
- Catches exceptions
- Always returns JSON
- Logs status
"""

import logging
from typing import Dict, Optional
from datetime import datetime
import uuid

from .models import (
    AutoflowTask,
    AutoflowResult,
    ExecutionRecord,
    TaskStatus,
)
from .router import Router
from .policy import PolicyEngine
from .memory import MemoryStore
from .adapters.base import BaseAdapter

logger = logging.getLogger(__name__)


class ExecutionBus:
    """
    Central execution orchestrator for Luuna Autoflow.
    
    All executions go through this bus for:
    - Auditing
    - Policy enforcement
    - Error handling
    - Result formatting
    """
    
    def __init__(
        self, 
        adapters: Dict[str, BaseAdapter],
        memory: Optional[MemoryStore] = None,
        policy: Optional[PolicyEngine] = None,
    ):
        self.adapters = adapters
        self.memory = memory or MemoryStore()
        self.policy = policy or PolicyEngine()
        self.router = Router()
    
    def execute(self, task: AutoflowTask) -> AutoflowResult:
        """
        Execute a task through the appropriate adapter.
        
        Args:
            task: The task to execute
            
        Returns:
            AutoflowResult with execution outcome
        """
        # Create execution ID
        execution_id = str(uuid.uuid4())
        
        # Create initial record
        record = ExecutionRecord(
            execution_id=execution_id,
            goal=task.goal,
            domain=task.domain,
            mode=task.mode,
            status=TaskStatus.PENDING,
            requires_approval=task.approval_required,
        )
        self.memory.store(record)
        
        logger.info(f"[Autoflow] Starting execution {execution_id}: {task.goal[:100]}...")
        
        try:
            # Policy check
            policy_result = self.policy.check(task)
            if not policy_result.allowed:
                return self._create_blocked_result(
                    execution_id, 
                    record, 
                    policy_result.reason
                )
            
            # Route to adapter
            try:
                adapter_id, adapter = self.router.select_adapter(task, self.adapters)
            except ValueError as e:
                return self._create_error_result(
                    execution_id, 
                    record, 
                    str(e)
                )
            
            record.selected_adapter = adapter_id
            record.status = TaskStatus.RUNNING
            self.memory.update(record)
            
            logger.info(f"[Autoflow] Routed to adapter: {adapter_id}")
            
            # Generate plan
            plan = adapter.plan(task)
            record.plan = plan
            
            # Check if approval required
            requires_approval = (
                task.approval_required
                or policy_result.requires_approval
                or adapter.capabilities.requires_approval
            )
            
            # Execute based on mode
            result_data = {}
            warnings = []
            
            if task.mode.value == "execute_mock":
                # Only execute in mock mode
                if adapter.can_handle(task):
                    result_data = adapter.execute(task)
                    warnings.append("Executed in mock mode - no real actions taken")
                else:
                    warnings.append("Adapter cannot handle task - plan only")
            else:
                warnings.append("Plan-only mode - no execution performed")
            
            # Update record
            record.status = TaskStatus.COMPLETED
            record.result = result_data
            record.warnings = warnings
            record.requires_approval = requires_approval
            record.completed_at = datetime.utcnow()
            self.memory.update(record)
            
            logger.info(f"[Autoflow] Execution {execution_id} completed successfully")
            
            return AutoflowResult(
                success=True,
                execution_id=execution_id,
                selected_adapter=adapter_id,
                plan=plan,
                result=result_data,
                warnings=warnings,
                requires_approval=requires_approval,
                status=TaskStatus.COMPLETED,
            )
            
        except Exception as e:
            logger.error(f"[Autoflow] Execution {execution_id} failed: {str(e)}")
            return self._create_error_result(execution_id, record, str(e))
    
    def get_execution(self, execution_id: str) -> Optional[ExecutionRecord]:
        """Retrieve an execution record by ID."""
        return self.memory.get(execution_id)
    
    def _create_error_result(
        self, 
        execution_id: str, 
        record: ExecutionRecord, 
        error: str
    ) -> AutoflowResult:
        """Create an error result."""
        record.status = TaskStatus.FAILED
        record.warnings = [error]
        record.completed_at = datetime.utcnow()
        self.memory.update(record)
        
        return AutoflowResult(
            success=False,
            execution_id=execution_id,
            selected_adapter=record.selected_adapter or "none",
            plan=record.plan,
            result={"error": error},
            warnings=[error],
            requires_approval=False,
            status=TaskStatus.FAILED,
        )
    
    def _create_blocked_result(
        self, 
        execution_id: str, 
        record: ExecutionRecord, 
        reason: str
    ) -> AutoflowResult:
        """Create a blocked result from policy."""
        record.status = TaskStatus.REQUIRES_APPROVAL
        record.warnings = [reason]
        record.requires_approval = True
        self.memory.update(record)
        
        return AutoflowResult(
            success=False,
            execution_id=execution_id,
            selected_adapter="none",
            plan=[],
            result={"blocked": True, "reason": reason},
            warnings=[reason],
            requires_approval=True,
            status=TaskStatus.REQUIRES_APPROVAL,
        )
