import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  FileCog,
  Network,
  Wand2,
  FileStack,
  Workflow,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/router";

const orchestrators = [
  {
    name: "PDF Orkester",
    icon: FileCog,
    status: "draft",
    path: "/center/pdf-orchestrator",
    description: "Keskne PDF tÃ¶Ã¶voogude haldur"
  },
  {
    name: "PDF Agentid",
    icon: Network,
    status: "active",
    path: "/center/pdf-agents",
    description: "PDF-spetsiifilised agendid"
  },
  {
    name: "NexusPDF Alchemy",
    icon: Wand2,
    status: "active",
    path: "/center/nexuspdf-alchemy",
    description: "PDF moodulite ehitaja"
  },
  {
    name: "OnePDF klient",
    icon: FileStack,
    status: "draft",
    path: "/center/onepdf-client",
    description: "OnePDF integratsioon"
  },
  {
    name: "Workflow Automation",
    icon: Workflow,
    status: "active",
    path: "/automations",
    description: "Automatiseeritud tÃ¶Ã¶vood"
  },
  {
    name: "Agent Approval Flow",
    icon: CheckCircle,
    status: "planned",
    path: "/center/agent-registry",
    description: "Agentide kinnitamise protsess"
  },
];

const statusConfig = {
  draft: { label: "Mustand", variant: "secondary" as const },
  active: { label: "Aktiivne", variant: "default" as const },
  planned: { label: "Planeeritud", variant: "outline" as const },
};

export const ActiveOrchestrators: React.FC = () => {
  const router = useRouter();

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Aktiivsed orkestraatorid</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {orchestrators.map((orch) => (
          <div
            key={orch.name}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 p-3 hover:border-cyan-400/30 transition-colors cursor-pointer"
            onClick={() => router.push(orch.path)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <orch.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{orch.name}</p>
                <p className="text-xs text-slate-500">{orch.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig[orch.status as keyof typeof statusConfig].variant}>
                {statusConfig[orch.status as keyof typeof statusConfig].label}
              </Badge>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ActiveOrchestrators;
