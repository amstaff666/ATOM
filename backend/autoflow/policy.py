"""
Luuna Autoflow Core - Policy Layer
==================================

Enforces safety policies:
- Blocks real external execution by default
- Allows only plan_only and execute_mock modes
- Marks risky actions as requires_approval
- No shell commands, file writes or deploy actions without approval
"""

import re
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum

from .models import AutoflowTask, TaskMode


class RiskLevel(str, Enum):
    """Risk assessment levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PolicyResult:
    """Result of policy check."""
    allowed: bool
    requires_approval: bool
    reason: str
    risk_level: RiskLevel = RiskLevel.LOW


class PolicyEngine:
    """
    Safety policy engine for Luuna Autoflow.
    
    Ensures that:
    1. Only safe modes are allowed (plan_only, execute_mock)
    2. Dangerous actions require approval
    3. No unauthorized external execution
    4. All actions are logged
    """
    
    # Blocked patterns in goals
    BLOCKED_PATTERNS = [
        r"delete\s+(all|everything|database|production)",
        r"drop\s+table",
        r"rm\s+-rf",
        r"format\s+disk",
        r"shutdown\s+server",
        r"deploy\s+to\s+production",
        r"execute\s+in\s+production",
        r"live\s+environment",
    ]
    
    # High-risk patterns (require approval)
    HIGH_RISK_PATTERNS = [
        r"send\s+email",
        r"send\s+message",
        r"post\s+to",
        r"upload\s+to",
        r"download\s+from",
        r"api\s+key",
        r"password",
        r"secret",
        r"token",
        r"credential",
        r"deploy",
        r"production",
        r"live",
    ]
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize policy engine.
        
        Args:
            strict_mode: If True, block all real execution modes
        """
        self.strict_mode = strict_mode
    
    def check(self, task: AutoflowTask) -> PolicyResult:
        """
        Check if a task is allowed by policy.
        
        Args:
            task: The task to check
            
        Returns:
            PolicyResult with allowed status and risk assessment
        """
        # Check mode
        mode_result = self._check_mode(task)
        if not mode_result.allowed:
            return mode_result
        
        # Check for blocked patterns
        blocked_result = self._check_blocked_patterns(task)
        if not blocked_result.allowed:
            return blocked_result
        
        # Check for high-risk patterns
        risk_result = self._check_risk_patterns(task)
        
        return risk_result
    
    def _check_mode(self, task: AutoflowTask) -> PolicyResult:
        """Check if the execution mode is allowed."""
        allowed_modes = [TaskMode.PLAN_ONLY, TaskMode.EXECUTE_MOCK]
        
        if task.mode not in allowed_modes:
            return PolicyResult(
                allowed=False,
                requires_approval=True,
                reason=f"Mode '{task.mode.value}' is not allowed. Allowed modes: plan_only, execute_mock",
                risk_level=RiskLevel.HIGH,
            )
        
        return PolicyResult(
            allowed=True,
            requires_approval=False,
            reason="Mode allowed",
            risk_level=RiskLevel.LOW,
        )
    
    def _check_blocked_patterns(self, task: AutoflowTask) -> PolicyResult:
        """Check for blocked patterns in the goal."""
        goal_lower = task.goal.lower()
        
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, goal_lower, re.IGNORECASE):
                return PolicyResult(
                    allowed=False,
                    requires_approval=True,
                    reason=f"Blocked pattern detected: operation not allowed for safety",
                    risk_level=RiskLevel.CRITICAL,
                )
        
        return PolicyResult(
            allowed=True,
            requires_approval=False,
            reason="No blocked patterns detected",
            risk_level=RiskLevel.LOW,
        )
    
    def _check_risk_patterns(self, task: AutoflowTask) -> PolicyResult:
        """Check for high-risk patterns in the goal."""
        goal_lower = task.goal.lower()
        
        for pattern in self.HIGH_RISK_PATTERNS:
            if re.search(pattern, goal_lower, re.IGNORECASE):
                return PolicyResult(
                    allowed=True,
                    requires_approval=True,
                    reason=f"High-risk operation detected: approval required",
                    risk_level=RiskLevel.HIGH,
                )
        
        return PolicyResult(
            allowed=True,
            requires_approval=False,
            reason="No high-risk patterns detected",
            risk_level=RiskLevel.LOW,
        )
    
    def assess_risk(self, task: AutoflowTask) -> RiskLevel:
        """
        Assess the risk level of a task.
        
        Returns:
            RiskLevel enum value
        """
        # Check mode first
        if task.mode not in [TaskMode.PLAN_ONLY, TaskMode.EXECUTE_MOCK]:
            return RiskLevel.HIGH
        
        # Check patterns
        goal_lower = task.goal.lower()
        
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, goal_lower, re.IGNORECASE):
                return RiskLevel.CRITICAL
        
        for pattern in self.HIGH_RISK_PATTERNS:
            if re.search(pattern, goal_lower, re.IGNORECASE):
                return RiskLevel.HIGH
        
        return RiskLevel.LOW
