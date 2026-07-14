"""
Luuna Autoflow - Base Adapter Interface
=======================================

Abstract base class for all adapters.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from ..models import AutoflowTask, AdapterCapabilities, TaskDomain


class BaseAdapter(ABC):
    """
    Base adapter interface.
    
    All adapters must implement:
    - capabilities: Declare what the adapter can do
    - can_handle(): Check if adapter can handle a task
    - plan(): Generate execution plan
    - execute(): Execute the task (mock or real)
    """
    
    @property
    @abstractmethod
    def capabilities(self) -> AdapterCapabilities:
        """Return adapter capabilities."""
        pass
    
    @abstractmethod
    def can_handle(self, task: AutoflowTask) -> bool:
        """
        Check if this adapter can handle the given task.
        
        Args:
            task: The task to check
            
        Returns:
            True if adapter can handle the task
        """
        pass
    
    @abstractmethod
    def plan(self, task: AutoflowTask) -> List[str]:
        """
        Generate an execution plan for the task.
        
        Args:
            task: The task to plan
            
        Returns:
            List of plan steps
        """
        pass
    
    @abstractmethod
    def execute(self, task: AutoflowTask) -> Dict[str, Any]:
        """
        Execute the task.
        
        Args:
            task: The task to execute
            
        Returns:
            Execution result data
            
        Note:
            In mock mode, this returns simulated results.
            Real execution requires approval and proper configuration.
        """
        pass
    
    def _default_plan(self, task: AutoflowTask, steps: List[str]) -> List[str]:
        """
        Generate default plan with context.
        
        Args:
            task: The task
            steps: Plan steps
            
        Returns:
            Formatted plan steps
        """
        return [
            f"1. Analüüsi ülesanne: {task.goal[:100]}...",
            *[
                f"{i+2}. {step}" 
                for i, step in enumerate(steps)
            ],
            f"{len(steps)+2}. Tagasta tulemus",
        ]
    
    def _mock_result(self, adapter_name: str, task: AutoflowTask) -> Dict[str, Any]:
        """
        Generate mock execution result.
        
        Args:
            adapter_name: Name of the adapter
            task: The executed task
            
        Returns:
            Mock result data
        """
        return {
            "adapter": adapter_name,
            "mode": "mock",
            "goal_processed": task.goal,
            "status": "simulated",
            "note": "This is a mock result. No real execution performed.",
        }
