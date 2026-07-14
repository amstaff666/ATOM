import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  FileCog,
  Loader2,
  Play,
  RefreshCw,
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
import { Textarea } from "@/components/ui/textarea";
import { safeJson } from "@/lib/safe-fetch";

type KingPdfHealth = {
  success?: boolean;
  service?: string;
  status?: string;
  version?: string;
  external_execution?: boolean;
};

type KingPdfCapability = {
  id: string;
  label: string;
  description: string;
  status: string;
};

type KingPdfCapabilities = {
  success: boolean;
  capabilities: KingPdfCapability[];
  count: number;
};

type KingPdfPlan = {
  success: boolean;
  mode?: string;
  selected_adapter?: string;
  plan?: string[];
  warnings?: string[];
  requires_approval?: boolean;
  error?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4490";

export function KingPdfPanel() {
  const [health, setHealth] = useState<KingPdfHealth>({ status: "offline" });
  const [capabilities, setCapabilities] = useState<KingPdfCapability[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [goal, setGoal] = useState(
    "Integreeri KingPDF Annaatori PDF Orkestrisse laenutaotluste ja pangaväljavõtete töötluseks.",
  );
  const [mode, setMode] = useState("plan_only");
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<KingPdfPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const online = health.status === "registered" && !statusError;

  const refresh = async () => {
    setLoading(true);
    setStatusError(null);

    const [healthResult, capabilitiesResult] = await Promise.all([
      safeJson<KingPdfHealth>(`${apiBase}/api/kingpdf/health`, { status: "offline" }),
      safeJson<KingPdfCapabilities>(
        `${apiBase}/api/kingpdf/capabilities`,
        { success: false, capabilities: [], count: 0 },
      ),
    ]);

    setHealth(healthResult.data);
    setCapabilities(capabilitiesResult.data.capabilities || []);

    const errors = [healthResult.error, capabilitiesResult.error].filter(Boolean);
    setStatusError(errors.length ? errors.join(" | ") : null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const generatePlan = async () => {
    setPlanning(true);
    setPlan(null);
    setPlanError(null);

    const result = await safeJson<KingPdfPlan>(
      `${apiBase}/api/kingpdf/plan`,
      { success: false, error: "KingPDF plan failed" },
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          mode,
          document_type: "pdf",
          approval_required: true,
        }),
      },
    );

    setPlan(result.data);
    if (!result.ok || result.data.success === false) {
      setPlanError(result.data.error || result.error || "KingPDF plan request failed");
    }
    setPlanning(false);
  };

  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                KingPDF
              </Badge>
              <Badge variant={online ? "default" : "secondary"}>
                {online ? "registered" : "fallback"}
              </Badge>
              <Badge variant="secondary">external execution off</Badge>
            </div>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Crown className="h-5 w-5 text-cyan-300" />
              KingPDF moodul
            </CardTitle>
            <CardDescription>
              Eraldi Annaatori menüüosa KingPDF töövoogude jaoks. Praegu on see turvaline
              lokaalne adapter, mis ei tee päris väliseid KingPDF käivitusi.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Värskenda
          </Button>
        </div>

        {statusError && (
          <InlineWarning title="KingPDF backend pole saadaval" message={statusError} />
        )}
      </CardHeader>

      <CardContent className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Meta label="Status" value={health.status || "offline"} />
            <Meta label="Version" value={health.version || "-"} />
            <Meta label="Capabilities" value={String(capabilities.length)} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Võimekused
            </h3>
            <div className="grid gap-2">
              {capabilities.length ? (
                capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">{capability.label}</p>
                      <Badge variant="secondary">{capability.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{capability.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">
                  KingPDF capability list puudub või backend ei vasta.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Integratsiooni eesmärk
              </span>
              <Textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="min-h-[116px] border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                Mode
              </span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
              >
                <option value="plan_only">plan_only</option>
                <option value="execute_mock">execute_mock</option>
              </select>
            </label>

            <Button
              className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              onClick={generatePlan}
              disabled={planning || !goal.trim()}
            >
              {planning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Generate KingPDF Plan
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          {planError && <InlineWarning title="KingPDF plan failed" message={planError} />}
          {!plan && !planError && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <FileCog className="mb-3 h-10 w-10 text-slate-600" />
              <p className="font-semibold text-slate-200">KingPDF plaan ootab käivitust</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Plaan loob adapteri sammud ilma välise KingPDF käivituseta.
              </p>
            </div>
          )}

          {plan?.success && (
            <>
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  KingPDF plaan valmis
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Meta label="Adapter" value={plan.selected_adapter || "-"} />
                <Meta
                  label="Approval"
                  value={plan.requires_approval ? "required" : "not required"}
                />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Plan steps
                </h3>
                <ol className="space-y-2">
                  {(plan.plan || []).map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {(plan.warnings || []).length > 0 && (
                <div className="space-y-2">
                  {(plan.warnings || []).map((warning) => (
                    <InlineWarning key={warning} title="Warning" message={warning} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function InlineWarning({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="break-words text-amber-100/90">{message}</p>
    </div>
  );
}
