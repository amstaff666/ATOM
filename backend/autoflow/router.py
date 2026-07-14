"""
Luuna Autoflow Core - Router / Decision Engine
==============================================

Routes tasks to appropriate adapters based on domain, capabilities, and scoring.
Currently uses simple rule-based scoring.
"""

from typing import Dict, List, Optional, Tuple
from .models import AutoflowTask, TaskDomain, AdapterCapabilities
from .adapters.base import BaseAdapter


class Router:
    """
    Decision engine for selecting the best adapter for a task.
    
    Current implementation: Simple rule-based scoring.
    Future: ML-based routing, cost optimization, load balancing.
    """
    
    def __init__(self):
        self._adapter_scores: Dict[str, int] = {}
    
    def score_adapter(
        self, 
        task: AutoflowTask, 
        adapter: BaseAdapter
    ) -> int:
        """
        Score an adapter's suitability for a task.
        
        Scoring rules (simple, rule-based):
        - Domain match: +50 points
        - Can handle task: +20 points
        - Higher priority adapter: +priority value
        - Approval not required for plan_only: +10 points
        
        Returns:
            int: Score (higher = better match)
        """
        score = 0
        capabilities = adapter.capabilities
        
        # Domain match (most important)
        if task.domain in capabilities.domains:
            score += 50
        
        # Can handle check
        if adapter.can_handle(task):
            score += 20
        
        # Priority boost
        score += capabilities.priority
        
        # Mode considerations
        if task.mode.value == "plan_only" and not capabilities.requires_approval:
            score += 10
        
        # Domain-specific boosts
        if task.domain == TaskDomain.PDF and "pdf" in capabilities.id:
            score += 30
        elif task.domain == TaskDomain.WORKFLOW and "workflow" in capabilities.id:
            score += 30
        elif task.domain == TaskDomain.AGENT and "agent" in capabilities.id:
            score += 30
        elif task.domain == TaskDomain.DOCUMENT and "document" in capabilities.id:
            score += 30
        
        return score
    
    def select_adapter(
        self, 
        task: AutoflowTask, 
        adapters: Dict[str, BaseAdapter]
    ) -> Tuple[str, BaseAdapter]:
        """
        Select the best adapter for a task.
        
        Args:
            task: The task to route
            adapters: Available adapters
            
        Returns:
            Tuple of (adapter_id, adapter)
            
        Raises:
            ValueError: If no suitable adapter found
        """
        if not adapters:
            raise ValueError("No adapters available")
        
        scores: List[Tuple[str, BaseAdapter, int]] = []
        
        for adapter_id, adapter in adapters.items():
            score = self.score_adapter(task, adapter)
            scores.append((adapter_id, adapter, score))
        
        # Sort by score descending
        scores.sort(key=lambda x: x[2], reverse=True)
        
        # Return best match
        best_id, best_adapter, best_score = scores[0]
        
        if best_score == 0:
            # Fallback to mock-llm if nothing matches
            if "mock-llm" in adapters:
                return "mock-llm", adapters["mock-llm"]
            raise ValueError(f"No suitable adapter found for task: {task.goal}")
        
        return best_id, best_adapter
    
    def classify_task(self, task: AutoflowTask) -> Dict[str, any]:
        """
        Classify a task for routing decisions.
        
        Returns:
            Dict with classification info
        """
        classification = {
            "domain": task.domain.value,
            "mode": task.mode.value,
            "complexity": "medium",  # Default
            "suggested_adapters": [],
            "risk_level": "low" if task.mode.value == "plan_only" else "medium",
        }
        
        # Complexity heuristics based on goal length and keywords
        goal = task.goal.lower()
        complex_keywords = ["mitu", "kõik", "integreeri", "orkestreeri", "kompleksne"]
        if any(kw in goal for kw in complex_keywords) or len(goal) > 200:
            classification["complexity"] = "high"
        elif len(goal) < 50:
            classification["complexity"] = "low"
        
        # Risk assessment
        risky_keywords = ["kustuta", "delete", "deploy", "production", "live"]
        if any(kw in goal for kw in risky_keywords):
            classification["risk_level"] = "high"
        
        return classification
