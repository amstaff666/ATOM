import React from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

type ModuleCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  status?: "draft" | "active" | "planned" | "available";
  onSelect?: () => void;
  selected?: boolean;
  aiSuggestion?: string;
};

const statusConfig = {
  draft: { label: "Mustand", variant: "secondary" as const },
  active: { label: "Aktiivne", variant: "default" as const },
  planned: { label: "Planeeritud", variant: "outline" as const },
  available: { label: "Saadaval", variant: "default" as const },
};

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon: Icon,
  status = "available",
  onSelect,
  selected = false,
  aiSuggestion,
}) => {
  const statusInfo = statusConfig[status];

  return (
    <Card
      className={`cursor-pointer border-slate-800 bg-slate-900/70 transition-all duration-200 hover:border-cyan-400/40 ${
        selected ? "border-cyan-400/60 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.1)]" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Icon className="h-5 w-5" />
          </div>
          {status && (
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {aiSuggestion && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-purple-400/20 bg-purple-400/5 p-2">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <span className="text-xs text-purple-200">{aiSuggestion}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-between text-cyan-300 hover:text-cyan-200 hover:bg-cyan-400/10">
          <span>Ava moodul</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ModuleCard;
