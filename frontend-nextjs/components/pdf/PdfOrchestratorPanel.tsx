import React from "react";
import { CheckCircle2, FileCog, FileSearch, FileStack, Scissors, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const lanes = [
  { label: "Vastuvõtt", detail: "PDF/DOCX/TXT/MD üleslaadimine", icon: FileStack, status: "töös" },
  { label: "Analüüs", detail: "OCR, tabelid, leheküljed, metaandmed", icon: FileSearch, status: "järgmine" },
  { label: "Muutmine", detail: "split, merge, vormid, annotatsioon", icon: Scissors, status: "planeeritud" },
  { label: "Redaktsioon", detail: "peidetavad väljad ja audit", icon: ShieldCheck, status: "HITL" },
  { label: "Eksport", detail: "kvaliteedikontroll ja lõppfail", icon: FileCog, status: "planeeritud" },
];

export function PdfOrchestratorPanel() {
  return (
    <Card className="border-slate-800 bg-slate-950/60">
      <CardHeader>
        <CardTitle>PDF töövoo orkester</CardTitle>
        <CardDescription>
          PDF Editor Orkester jagab faili väikesteks kontrollitavateks töödeks ja suunab need õigetele agentidele.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-5">
        {lanes.map((lane, index) => {
          const Icon = lane.icon;
          return (
            <div key={lane.label} className="relative rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10 text-purple-200">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary">{lane.status}</Badge>
              </div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Samm {index + 1}
              </div>
              <h3 className="text-sm font-semibold text-slate-100">{lane.label}</h3>
              <p className="mt-1 text-xs text-slate-400">{lane.detail}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
