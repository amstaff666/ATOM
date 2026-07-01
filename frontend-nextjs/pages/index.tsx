import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Play,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { OnboardingWizard } from "../components/Onboarding/OnboardingWizard";
import { AiWorkbenchDashboard } from "../components/workbench/AiWorkbenchDashboard";
import { safeJson } from "../lib/safe-fetch";

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  path: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4490";

const Home = () => {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string>("Kontrollimata");

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const token =
          localStorage.getItem("auth_token") || localStorage.getItem("token");
        if (token) {
          const status = await safeJson(`${apiBase}/api/onboarding/status`, { onboarding_completed: true }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (status.ok) {
            const data = status.data;
            if (!data.onboarding_completed) {
              setShowWizard(true);
              const userRes = await safeJson(`${apiBase}/api/users/me`, null, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                setUser(userRes.data);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to check onboarding status", err);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const refreshDashboard = async () => {
      const [health, documents, agents, workflows] = await Promise.all([
        safeJson(`${apiBase}/healthz`, null),
        safeJson(`${apiBase}/api/documents`, { data: [] }),
        safeJson(`${apiBase}/api/agents/`, []),
        safeJson("/api/workflows/executions", { executions: [] }),
      ]);

      setBackendHealthy(Boolean((health.data as any)?.ok || (health.data as any)?.status === "healthy"));
      setDocumentsCount(Array.isArray((documents.data as any)?.data) ? (documents.data as any).data.length : 0);
      setAgentsCount(Array.isArray(agents.data) ? agents.data.length : 0);
      setWorkflowCount(Array.isArray((workflows.data as any)?.executions) ? (workflows.data as any).executions.length : 0);
      setLastChecked(new Date().toLocaleTimeString());
    };

    refreshDashboard();
  }, []);

  const metrics: DashboardMetric[] = useMemo(
    () => [
      {
        label: "Aktiivsed dokumendid",
        value: String(documentsCount),
        detail: "Indekseeritud failid ülevaatuseks",
        icon: FileText,
        path: "/documents",
      },
      {
        label: "Agendid",
        value: String(agentsCount),
        detail: "Saadaval kohalikud operaatorid",
        icon: Bot,
        path: "/agents",
      },
      {
        label: "Töövood",
        value: String(workflowCount),
        detail: "Praegune käivituste järjekord",
        icon: Play,
        path: "/automations",
      },
      {
        label: "Backend",
        value: backendHealthy ? "Töös" : backendHealthy === false ? "Kontrolli" : "...",
        detail: `Viimati kontrollitud ${lastChecked}`,
        icon: Server,
        path: "/settings",
      },
    ],
    [agentsCount, backendHealthy, documentsCount, lastChecked, workflowCount],
  );

  const recentCases = [
    { name: "Dokumentide vastuvõtt", status: "Ootel", detail: "Aktiivseid üleslaadimisi pole" },
    { name: "Agentide register", status: "Valmis", detail: `${agentsCount} agenti saadaval` },
    { name: "Töövoogude jälgija", status: "Rahulik", detail: "Käimasolevaid töövooge pole" },
    { name: "Laenu Haldur", status: "Valmis", detail: "Rahastusjuhtumite töölaud on peamenüüs" },
  ];

  const warnings = [
    "Turunduse töölaud kasutab praegu lokaalset fallback-andmestikku.",
    "Töövoogude käivitused on tühjad kuni orkestreerimise teenus on ühendatud.",
    "NextAuth töötab lokaalses arendusrežiimis.",
  ];

  const quickActions = [
    { label: "Lisa dokument", icon: FileText, path: "/documents" },
    { label: "Ava agendid", icon: Bot, path: "/agents" },
    { label: "Uus automatsioon", icon: Zap, path: "/automations" },
    { label: "Laenu Haldur", icon: CreditCard, path: "/laenu-haldur" },
  ];

  return (
    <>
    <Head>
      <title>Annaator | Töölaud</title>
      <meta name="description" content="Annaatori kohalik operaatori töölaud." />
    </Head>
    <div className="mx-auto flex max-w-7xl flex-col gap-6 text-slate-100">
      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        user={user}
        onUpdate={(data) => {
          if (data.onboarding_completed) {
            setShowWizard(false);
          }
        }}
      />

      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={backendHealthy ? "default" : "secondary"}>
              {backendHealthy ? "Kohalik backend töös" : "Kohalik režiim"}
            </Badge>
            <span className="text-xs text-slate-400">Operaatori töölaud</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Annaator AI Workbench</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Jälgi kohalikke teenuseid, PDF orkestrit, agente, automatsioone ja järgmisi ehitust vajavaid mooduleid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analüütika
          </Button>
          <Button onClick={() => router.push("/automations")}>
            <Play className="mr-2 h-4 w-4" />
            Automatsioonid
          </Button>
        </div>
      </div>

      {backendHealthy === false && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Backend vajab tähelepanu</AlertTitle>
          <AlertDescription>
            Töölaud ei saanud `/healthz` vastust kinnitada. Lokaalsed fallback-vaated võivad siiski avaneda.
          </AlertDescription>
        </Alert>
      )}

      <AiWorkbenchDashboard compact />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className="cursor-pointer border-slate-800 bg-slate-900/70 transition-colors hover:border-cyan-400/40"
            onClick={() => router.push(metric.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-slate-400" />
              Hiljutised tööd
            </CardTitle>
            <CardDescription>Praegune kohalik tööjärjekord ja teenuste seis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCases.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Puuduvad asjad
            </CardTitle>
            <CardDescription>Teadaolevad lokaalsed puudused, mis ei tohiks UI tööd peatada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.map((warning) => (
              <div key={warning} className="flex gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="text-muted-foreground">{warning}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Kiirtegevused
            </CardTitle>
            <CardDescription>Liigu otse peamistesse töövoogudesse.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="justify-start"
                onClick={() => router.push(action.path)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Halduskontrollid
            </CardTitle>
            <CardDescription>Haldusvaated on saadaval vasakust menüüst.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Ärifaktid</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/business-facts")}>
                Ava
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">JIT kontroll</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/jit-verification")}>
                Ava
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Home;
