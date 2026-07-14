"""Planning-only adapter for local ATOM workflow build tasks.

This adapter intentionally does not execute shell commands, edit files, call
external APIs, or trigger deployments. It turns operator goals into a small,
auditable implementation plan that can later be approved and executed by a
separate controlled pipeline.
"""

from __future__ import annotations

from typing import Any, Dict, List

from backend.autoflow.adapters.base import BaseAdapter
from backend.autoflow.models import AdapterCapabilities, AutoflowTask, TaskDomain


WORKFLOW_KEYWORDS = (
    "workflow",
    "töövoog",
    "toovoog",
    "route",
    "endpoint",
    "api",
    "proxy",
    "frontend",
    "backend",
    "smoke",
    "approval",
    "gate",
    "agent",
    "document",
    "neon",
    "hf",
    "hugging face",
    "runtime",
)


class AtomToolsAdapter(BaseAdapter):
    """Build safe local ATOM workflow plans without executing real tools."""

    def __init__(self) -> None:
        self.capabilities = AdapterCapabilities(
            id="atom-tools",
            name="ATOM Tools Adapter",
            description="Koostab lokaalse ATOM arendustöö plaani ilma päris tööriistu käivitamata.",
            domains=[
                TaskDomain.WORKFLOW,
                TaskDomain.AGENT,
                TaskDomain.DOCUMENT,
                TaskDomain.GENERAL,
            ],
            can_execute=True,
            requires_approval=False,
            priority=80,
            metadata={
                "planning_only": True,
                "mock_execution_only": True,
                "external_tools_called": False,
            },
        )

    async def can_handle(self, task: AutoflowTask) -> bool:
        """Prefer ATOM tools for local workflow, agent, document and general tasks."""
        if task.domain in {
            TaskDomain.WORKFLOW,
            TaskDomain.AGENT,
            TaskDomain.DOCUMENT,
            TaskDomain.GENERAL,
        }:
            return True

        goal = task.goal.lower()
        return any(keyword in goal for keyword in WORKFLOW_KEYWORDS)

    async def plan(self, task: AutoflowTask) -> List[str]:
        """Return an API-safe list plan with clear implementation sections."""
        workflow_plan = self._build_workflow_plan(task.goal, task.domain)
        return self._format_plan(workflow_plan)

    async def execute(self, task: AutoflowTask) -> Dict[str, Any]:
        """Return a mock result only; no real tools are called."""
        return {
            "executed": False,
            "mode": "execute_mock",
            "message": "Mock execution only. No external tools were called.",
            "plan": self._build_workflow_plan(task.goal, task.domain),
        }

    def _build_workflow_plan(self, goal: str, domain: TaskDomain) -> Dict[str, Any]:
        selected_steps = self._select_steps(goal)

        return {
            "module": "ATOM Local Workflow Builder",
            "purpose": (
                "Muuta kasutaja eesmärk kontrollitud ATOM arendusplaaniks, "
                "kus frontend, backend, API proxy, testid ja hilisemad runtime "
                "ühendused liiguvad eraldi kinnitatavate sammudena."
            ),
            "domain": domain.value if hasattr(domain, "value") else str(domain),
            "requested_goal": goal,
            "required_agents": [
                "Workflow Planner Agent",
                "Backend API Agent",
                "Frontend Route Agent",
                "Smoke Test Agent",
                "Approval Gate Agent",
                "Runtime Integration Agent",
            ],
            "suggested_backend_endpoints": [
                "GET /healthz",
                "POST /api/autoflow/tasks",
                "GET /api/autoflow/providers",
                "POST /api/workflows",
                "GET /api/workflows/executions",
                "POST /api/approvals",
            ],
            "build_steps": selected_steps,
            "risks": [
                "Frontend ei tohi otse Neoniga suhelda; kõik peab liikuma backend API kaudu.",
                "HF runtime adapter tuleb lisada hiljem eraldi kinnitatud backend tööna.",
                "Approval gate peab jääma vahele enne tegevusi, mis muudavad faile, käivitavad agente või kasutavad väliseid teenuseid.",
                "API proxy peab tagastama stabiilse JSON vastuse ka siis, kui backend ei ole saadaval.",
            ],
            "next_actions": [
                "Kinnita, milline workflow või route on esimene päris teostuse kandidaat.",
                "Lisa või täpsusta backend endpoint schema enne UI sidumist.",
                "Lisa smoke test, mis kontrollib 200/JSON vastuseid ja ei eelda päris AI runtime'i.",
                "Planeeri Neon tabel ja HF adapter järgmise kinnitatud backend taskina.",
            ],
        }

    def _select_steps(self, goal: str) -> List[str]:
        goal_lower = goal.lower()
        steps = [
            "Register backend endpoint: määra route, request schema, response schema ja stabiilne JSON fallback.",
            "Create frontend route: lisa kasutajale nähtav leht või paneel olemasoleva layout'i sisse.",
            "Connect API proxy: seo frontend backend API-ga ilma secrets või Neon otseühenduseta.",
            "Add smoke test: kontrolli lokaalselt health, API endpoint ja peamine frontend route.",
            "Add approval gate: märgi riskantsed tegevused kinnitust vajavaks enne päris käivitust.",
            "Add Neon table later: planeeri skeem, migratsioon ja ligipääs ainult backendist.",
            "Add HF runtime adapter later: planeeri AI/PDF/job execution runtime eraldi backend adapterina.",
        ]

        if "endpoint" in goal_lower or "api" in goal_lower or "backend" in goal_lower:
            steps.insert(0, "Prioritize backend contract: alusta endpoint'i nimest, payloadist ja veakujust.")

        if "frontend" in goal_lower or "route" in goal_lower or "ui" in goal_lower:
            steps.insert(0, "Prioritize UI route: alusta nähtavast route'ist, loading/error/empty state'idest ja sidebar lingist.")

        if "agent" in goal_lower:
            steps.append("Agent workflow: defineeri agent role, allowed actions, audit output ja approval boundary.")

        if "document" in goal_lower or "pdf" in goal_lower:
            steps.append("Document workflow: defineeri upload, processing job, status polling ja download/result view.")

        return list(dict.fromkeys(steps))

    def _format_plan(self, workflow_plan: Dict[str, Any]) -> List[str]:
        lines = [
            f"module: {workflow_plan['module']}",
            f"purpose: {workflow_plan['purpose']}",
            f"domain: {workflow_plan['domain']}",
            f"requested_goal: {workflow_plan['requested_goal']}",
            "required_agents:",
        ]
        lines.extend(f"- {agent}" for agent in workflow_plan["required_agents"])
        lines.append("suggested_backend_endpoints:")
        lines.extend(f"- {endpoint}" for endpoint in workflow_plan["suggested_backend_endpoints"])
        lines.append("build_steps:")
        lines.extend(f"- {step}" for step in workflow_plan["build_steps"])
        lines.append("risks:")
        lines.extend(f"- {risk}" for risk in workflow_plan["risks"])
        lines.append("next_actions:")
        lines.extend(f"- {action}" for action in workflow_plan["next_actions"])
        return lines
