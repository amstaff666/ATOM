import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Bot,
  CheckCircle2,
  FileCog,
  FileStack,
  GitBranch,
  Network,
  Play,
  Sparkles,
  Terminal,
  Wand2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LuunaAutoflowPanel } from "@/components/workbench/LuunaAutoflowPanel";

export type WorkbenchModule = {
  id: string;
  title: string;
  group: string;
  status: string;
  icon: React.ElementType;
  route: string;
  purpose: string;
  requiredAgents: string[];
  endpoints: string[];
  buildSteps: string[];
  risks: string[];
  nextAction: string;
};

export const workbenchModules: WorkbenchModule[] = [
  {
    id: "pdf-orchestrator",
    title: "PDF Editor Orkester",
    group: "PDF",
    status: "prioriteet",
    icon: FileCog,
    route: "/center/pdf-orchestrator",
    purpose: "Juhib PDF editorite, OCR-i, split/merge, redaktsiooni ja kvaliteedikontrolli ühist töövoogu.",
    requiredAgents: ["PDF marsruutija", "OCR agent", "Redaktsiooni agent", "Kvaliteedikontroll"],
    endpoints: ["/api/documents/upload", "/api/pdf/orchestrator/jobs", "/api/pdf/agents/status"],
    buildSteps: ["Faili vastuvõtt", "Töö tüübi tuvastus", "Agentide ja editorite valik", "Inimese kinnitus", "Eksport ja logi"],
    risks: ["NexusPDF adapter vajab lõplikku lepingut", "Suured PDF-id vajavad queue'd", "Redaktsioon vajab auditeeritavat kinnitust"],
    nextAction: "Defineeri PDF job manifest ja ühenda upload tööjärjekorraga.",
  },
  {
    id: "pdf-agents",
    title: "PDF agendid",
    group: "PDF",
    status: "disain",
    icon: Network,
    route: "/center/pdf-agents",
    purpose: "Spetsialiseeritud agendid PDF sisu lugemiseks, parandamiseks, vormistamiseks ja kontrollimiseks.",
    requiredAgents: ["Tabeli agent", "Vormi agent", "Metaandmete agent", "Riskikontroll"],
    endpoints: ["/api/pdf/agents", "/api/pdf/agents/:id/run", "/api/pdf/review"],
    buildSteps: ["Agentide register", "Võimekuse skoor", "Testfailid", "Run history", "Tagasiside tsükkel"],
    risks: ["Agentide piirid peavad olema selged", "OCR kvaliteet sõltub failist", "Vale redaktsioon on kõrge riskiga"],
    nextAction: "Lisa PDF agentide võimekuste register ja testjuhtumid.",
  },
  {
    id: "nexuspdf-alchemy",
    title: "NexusPDF Alchemy",
    group: "PDF",
    status: "lokaalselt töös",
    icon: Wand2,
    route: "/center/nexuspdf-alchemy",
    purpose: "Eraldi PDF mootor, mida Annaator saab kasutada analüüsi ja dokumenditöötluse alamteenusena.",
    requiredAgents: ["Adapter agent", "Faili valideerija", "Analüüsi agent"],
    endpoints: ["http://127.0.0.1:8001/health", "http://127.0.0.1:8001/documents/upload"],
    buildSteps: ["Health kontroll", "Upload adapter", "Analüüsi fallback", "UI link", "Töölogi"],
    risks: ["Täis AI stack on veel kerge režiimiga", "Portide konfliktid", "Suurte failide ajastus"],
    nextAction: "Lisa Annaatori poole NexusPDF health/status kaart ja failiedastuse adapter.",
  },
  {
    id: "agents-workspace",
    title: ".agents tööruum",
    group: "Agendid",
    status: "kaust olemas",
    icon: Terminal,
    route: "/center/agents-workspace",
    purpose: "Agentide manifestid, skillid ja tööreeglid, mida peaagent saab hiljem hallata.",
    requiredAgents: ["Peaagent", "Skill auditor", "Turvakontroll"],
    endpoints: ["/api/agents/", "/api/skills/list", "/api/agent-governance"],
    buildSteps: ["Manifestide lugemine", "Skillide sidumine", "Õiguste kontroll", "Versioonimine", "Auditilogi"],
    risks: ["Saladusi ei tohi UI-s näidata", "Skillide käivitamine vajab õiguste kihti", "Agentide nimed vajavad standardit"],
    nextAction: "Koosta agent manifesti skeem ja näita seda ainult lokaalse tööruumi vaates.",
  },
  {
    id: "workflow-builder",
    title: "Automatsioonide orkester",
    group: "AI Center",
    status: "aktiivne",
    icon: GitBranch,
    route: "/automations",
    purpose: "Seob dokumendid, agendid, jobid ja välised teenused korduvkasutatavateks töövoogudeks.",
    requiredAgents: ["Workflow planner", "Queue worker", "Kinnituse agent"],
    endpoints: ["/api/workflows/definitions", "/api/workflows/executions", "/api/workflows/services"],
    buildSteps: ["Mallid", "Visuaalne builder", "Käivitus", "Ajalugu", "Fork/resume"],
    risks: ["Backend võib vastata fallbackiga", "Teenuste auth pole igal pool ühendatud", "Pikkade tööde jaoks vaja queue'd"],
    nextAction: "Hoia kõik API vastused JSON-na ja näita tühiseisu ilma crashita.",
  },
  {
    id: "master-agent",
    title: "Peaagent",
    group: "AI Center",
    status: "planeeritud",
    icon: Bot,
    route: "/center/master-agent",
    purpose: "Haldab agentide käsuahelat, tööde prioriteete ja inimese kinnitusi.",
    requiredAgents: ["Peaagent", "Policy agent", "Audit agent"],
    endpoints: ["/api/agents/", "/api/agent-governance", "/api/ws/stats"],
    buildSteps: ["Rollid", "Käsuahel", "HITL kontroll", "Tööde prioriteet", "Audit"],
    risks: ["Liiga lai autonoomia", "Puuduv kinnitusring", "Ebaselged õigused"],
    nextAction: "Alusta ainult soovitusrežiimist, kus peaagent pakub plaane, mitte ei muuda ise süsteemi.",
  },
];

type Props = {
  compact?: boolean;
  initialModuleId?: string;
  title?: string;
  description?: string;
};

export function AiWorkbenchDashboard({
  compact = false,
  initialModuleId = "pdf-orchestrator",
  title = "Annaator AI Workbench",
  description = "Moodulite, agentide ja PDF orkestri planeerimise töölaud. Päris AI backend pole siin vajalik, plaan sünnib lokaalsest olekust.",
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialModuleId);
  const [planGenerated, setPlanGenerated] = useState(false);
  const selected = useMemo(
    () => workbenchModules.find((module) => module.id === selectedId) || workbenchModules[0],
    [selectedId],
  );
  const SelectedIcon = selected.icon;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200">AI Center</Badge>
            <Badge variant="secondary">lokaalne mock-plaan</Badge>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p>
        </div>
        <Button
          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          onClick={() => setPlanGenerated(true)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate plan
        </Button>
      </div>

      <LuunaAutoflowPanel />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workbenchModules.slice(0, compact ? 4 : workbenchModules.length).map((module) => {
            const Icon = module.icon;
            const active = module.id === selected.id;
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => {
                  setSelectedId(module.id);
                  setPlanGenerated(false);
                }}
                className={`rounded-lg border p-4 text-left transition ${
                  active
                    ? "border-cyan-300/50 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.10)]"
                    : "border-slate-800 bg-slate-900/70 hover:border-blue-400/40 hover:bg-slate-900"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant={active ? "default" : "secondary"}>{module.status}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-100">{module.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{module.purpose}</p>
              </button>
            );
          })}
        </div>

        <Card className="border-slate-800 bg-slate-950/65">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SelectedIcon className="h-5 w-5 text-cyan-300" />
              {selected.title}
            </CardTitle>
            <CardDescription>{selected.purpose}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!planGenerated && (
              <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 p-3 text-blue-100">
                Vali moodul ja vajuta “Generate plan”, et näha lokaalselt koostatud ehitusplaani.
              </div>
            )}

            <InfoList title="Vajalikud agendid" items={selected.requiredAgents} />
            <InfoList title="Soovitatud backend endpointid" items={selected.endpoints} mono />
            {planGenerated && (
              <>
                <InfoList title="Ehitusplaan" items={selected.buildSteps} />
                <InfoList title="Riskid / puuduvad tükid" items={selected.risks} warning />
              </>
            )}

            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
              <div className="mb-1 flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Järgmine tegevus
              </div>
              <p className="text-slate-300">{selected.nextAction}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push(selected.route)}>
                Ava moodul
              </Button>
              <Button variant="ghost" onClick={() => router.push("/automations")}>
                <Play className="mr-2 h-4 w-4" />
                Seo töövooga
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function InfoList({
  title,
  items,
  mono = false,
  warning = false,
}: {
  title: string;
  items: string[];
  mono?: boolean;
  warning?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className={`rounded-md border px-3 py-2 ${
              warning
                ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                : "border-slate-800 bg-slate-900/70 text-slate-300"
            } ${mono ? "font-mono text-xs" : "text-sm"}`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
