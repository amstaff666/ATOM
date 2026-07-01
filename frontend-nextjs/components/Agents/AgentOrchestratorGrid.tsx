import React from "react";
import { Bot, BrainCircuit, FileText, Network, Shield, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const orchestrators = [
  {
    name: "Peaagent",
    role: "Tööde prioriteet ja agentide käsuahel",
    status: "soovitusrežiim",
    icon: BrainCircuit,
    queue: "0 aktiivset",
  },
  {
    name: "PDF marsruutija",
    role: "Valib OCR, merge, split, redaktsiooni või analüüsi tee",
    status: "valmis disainiks",
    icon: FileText,
    queue: "upload adapter",
  },
  {
    name: "Workflow planner",
    role: "Koostab töövoo sammud ja seob endpointid",
    status: "mock-plaan",
    icon: Workflow,
    queue: "3 malli",
  },
  {
    name: "Riskikontroll",
    role: "Hoiab ära saladuste, õiguste ja redaktsiooni vead",
    status: "vajalik",
    icon: Shield,
    queue: "HITL",
  },
  {
    name: "Agentide register",
    role: "Hoiab võimekused, skillid ja versioonid korras",
    status: "lokaalne",
    icon: Network,
    queue: "manifest",
  },
  {
    name: "Kliendi case agent",
    role: "Tõlgib dokumendid, staatuse ja järgmised tegevused kliendivaatesse",
    status: "planeeritud",
    icon: Bot,
    queue: "case log",
  },
];

export function AgentOrchestratorGrid() {
  return (
    <Card className="border-slate-800 bg-slate-950/60">
      <CardHeader>
        <CardTitle>Agentide orkestrid</CardTitle>
        <CardDescription>
          Kohalik vaade näitab, millised agendid peavad PDF ja AI Center töövooge vedama.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orchestrators.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.name} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary">{agent.status}</Badge>
              </div>
              <h3 className="font-semibold text-slate-100">{agent.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{agent.role}</p>
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                Queue: <span className="text-cyan-200">{agent.queue}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
