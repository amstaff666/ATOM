"""
Luuna Autoflow - Mock LLM Adapter
=================================

Mock adapter for testing and development.
Simulates LLM responses without real API calls.
"""

from typing import Any, Dict, List

from ..models import AutoflowTask, AdapterCapabilities, TaskDomain
from .base import BaseAdapter


class MockLLMAdapter(BaseAdapter):
    """
    Mock LLM adapter for development and testing.
    
    Provides:
    - Simulated plan generation
    - Mock execution results
    - No real API calls
    """
    
    def __init__(self):
        self._capabilities = AdapterCapabilities(
            id="mock-llm",
            name="Mock LLM Adapter",
            description="Simulated LLM adapter for development and testing. No real API calls.",
            domains=[TaskDomain.GENERAL, TaskDomain.AGENT, TaskDomain.DOCUMENT],
            can_execute=True,
            requires_approval=False,
            priority=1,  # Lower priority - used as fallback
        )
    
    @property
    def capabilities(self) -> AdapterCapabilities:
        return self._capabilities
    
    def can_handle(self, task: AutoflowTask) -> bool:
        """Mock adapter can handle any task in simulation mode."""
        return task.mode.value in ["plan_only", "execute_mock"]
    
    def plan(self, task: AutoflowTask) -> List[str]:
        """Generate a simulated plan."""
        goal = task.goal.lower()
        
        # Domain-specific mock plans
        if task.domain == TaskDomain.PDF or "pdf" in goal:
            return self._pdf_plan(task)
        elif task.domain == TaskDomain.WORKFLOW or "töövoog" in goal or "workflow" in goal:
            return self._workflow_plan(task)
        elif task.domain == TaskDomain.AGENT or "agent" in goal:
            return self._agent_plan(task)
        elif task.domain == TaskDomain.DOCUMENT or "dokument" in goal:
            return self._document_plan(task)
        else:
            return self._generic_plan(task)
    
    def _pdf_plan(self, task: AutoflowTask) -> List[str]:
        """Generate PDF-related plan."""
        return self._default_plan(task, [
            "Tuvasta PDF tüüp ja struktuur",
            "Rakenda OCR kui vajalik",
            "Ekstrakti tekst ja tabelid",
            "Analüüsi sisu ja tuvasta võtmelemendid",
            "Genereeri töödeldud väljund",
        ])
    
    def _workflow_plan(self, task: AutoflowTask) -> List[str]:
        """Generate workflow-related plan."""
        return self._default_plan(task, [
            "Kaardista töövoo sammud",
            "Identifitseeri vajalikud integratsioonid",
            "Konfigureeri päästikud ja tegevused",
            "Testi töövoogu simuleeritud andmetega",
            "Valmista töövoog käivitamiseks",
        ])
    
    def _agent_plan(self, task: AutoflowTask) -> List[str]:
        """Generate agent-related plan."""
        return self._default_plan(task, [
            "Defineeri agendi roll ja eesmärk",
            "Konfigureeri tööriistade komplekt",
            "Seadista otsustusloogika",
            "Testi agent simuleeritud stsenaariumitega",
            "Hinda agendi valmidus",
        ])
    
    def _document_plan(self, task: AutoflowTask) -> List[str]:
        """Generate document-related plan."""
        return self._default_plan(task, [
            "Laadi dokument sisse",
            "Tuvasta dokumendi tüüp",
            "Ekstrakti struktureeritud andmed",
            "Valideeri ja rikasta sisu",
            "Genereeri kokkuvõte või raport",
        ])
    
    def _generic_plan(self, task: AutoflowTask) -> List[str]:
        """Generate generic plan."""
        return self._default_plan(task, [
            "Analüüsi ülesande nõuded",
            "Koosta tegevusplaan",
            "Rakenda lahendus",
            "Kontrolli tulemusi",
        ])
    
    def execute(self, task: AutoflowTask) -> Dict[str, Any]:
        """Execute in mock mode."""
        plan = self.plan(task)
        
        return {
            **self._mock_result("mock-llm", task),
            "plan": plan,
            "message": f"Mock execution completed for: {task.goal[:100]}...",
            "tokens_used": {
                "prompt": 150,
                "completion": 200,
                "total": 350,
            },
            "model": "mock-model-v1",
            "latency_ms": 150,
        }
