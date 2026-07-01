import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Upload,
  FileSearch,
  LayoutTemplate,
  Brain,
  FileOutput,
  Send,
  CheckCircle2,
  Circle,
  Loader2
} from "lucide-react";

const pipelineSteps = [
  { id: 1, name: "Input / upload", icon: Upload, status: "ready" },
  { id: 2, name: "OCR / parsing", icon: FileSearch, status: "ready" },
  { id: 3, name: "Template mapping", icon: LayoutTemplate, status: "pending" },
  { id: 4, name: "AI review", icon: Brain, status: "pending" },
  { id: 5, name: "Export PDF", icon: FileOutput, status: "pending" },
  { id: 6, name: "Save to case / send", icon: Send, status: "pending" },
];

const statusConfig = {
  ready: { label: "Valmis", color: "text-emerald-400", icon: CheckCircle2 },
  pending: { label: "Ootel", color: "text-slate-400", icon: Circle },
  running: { label: "TÃ¶Ã¶tab", color: "text-cyan-400", icon: Loader2 },
};

export const BuildPipeline: React.FC = () => {
  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Build pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {pipelineSteps.map((step, index) => {
            const StatusIcon = statusConfig[step.status].icon;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center min-w-[80px]">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    step.status === "ready"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : step.status === "running"
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-slate-700 bg-slate-800/50"
                  }`}>
                    <step.icon className={`h-5 w-5 ${
                      step.status === "ready"
                        ? "text-emerald-400"
                        : step.status === "running"
                        ? "text-cyan-400"
                        : "text-slate-500"
                    }`} />
                  </div>
                  <span className="mt-2 text-xs text-center text-slate-400">{step.name}</span>
                  <div className="mt-1">
                    <StatusIcon className={`h-3 w-3 ${statusConfig[step.status].color} ${
                      step.status === "running" ? "animate-spin" : ""
                    }`} />
                  </div>
                </div>
                {index < pipelineSteps.length - 1 && (
                  <div className="flex-shrink-0 w-8 h-px bg-slate-700 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BuildPipeline;
