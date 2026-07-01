import Head from "next/head";
import type React from "react";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileCog,
  FileStack,
  GitBranch,
  GraduationCap,
  KeyRound,
  Music,
  Network,
  Route,
  Settings,
  Sparkles,
  Terminal,
  Users,
  Video,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiWorkbenchDashboard } from "@/components/workbench/AiWorkbenchDashboard";
import { PdfOrchestratorPanel } from "@/components/pdf/PdfOrchestratorPanel";

type CenterModule = {
  title: string;
  group: string;
  icon: React.ElementType;
  status: string;
  source?: string;
  description: string;
  nextSteps: string[];
};

const modules: Record<string, CenterModule> = {
  "master-agent": {
    title: "Peaagent",
    group: "AI juhtimine",
    icon: Bot,
    status: "juhtimiskeskus",
    description: "Keskne agent, mis saab hiljem hallata teisi agente, töövooge, jobe ja eskalatsioone.",
    nextSteps: ["Rollid ja õigused", "Agentide käsuahel", "HITL kinnitused", "Auditilogi"],
  },
  "cron-jobs": {
    title: "Cron jobid",
    group: "AI juhtimine",
    icon: Clock,
    status: "planeeritud",
    description: "Ajastatud tööd: andmete sync, PDF töötlus, turunduse postitused, raportid ja treeningutsüklid.",
    nextSteps: ["Jobide register", "Ajastuse editor", "Run history", "Veateavitused"],
  },
  "job-queue": {
    title: "Jobide järjekord",
    group: "AI juhtimine",
    icon: Workflow,
    status: "planeeritud",
    description: "Ühine queue kõikidele agentide ja orkestrite töödele, koos prioriteedi ja retry loogikaga.",
    nextSteps: ["Prioriteedid", "Retry policy", "Worker status", "Dead-letter queue"],
  },
  "agent-training": {
    title: "Agentide treening",
    group: "AI juhtimine",
    icon: GraduationCap,
    status: "planeeritud",
    description: "Tagasiside, õppeandmed ja testjuhtumid agentide kvaliteedi tõstmiseks.",
    nextSteps: ["Treeningandmed", "Evalid", "Skill gap raport", "Versioonide võrdlus"],
  },
  "skill-factory": {
    title: "Skill Factory",
    group: "AI juhtimine",
    icon: Sparkles,
    status: "planeeritud",
    description: "Koht, kus sünnivad Annaatori uued skillid, tööriistad ja automaatse töö mallid.",
    nextSteps: ["Skillide register", "Test sandbox", "Publitseerimine", "Õiguste kontroll"],
  },
  "agent-registry": {
    title: "Agentide ladu",
    group: "AI juhtimine",
    icon: Database,
    status: "planeeritud",
    description: "Kõik agendid, nende võimed, tööriistad, versioonid, omanikud ja käivitamise reeglid.",
    nextSteps: ["Agent manifest", "Tööriistade seosed", "Võimekuse skoor", "Omaniku vaade"],
  },
  "pdf-orchestrator": {
    title: "PDF Editor Orkester",
    group: "PDF Editor Orkester",
    icon: FileCog,
    status: "prioriteet",
    description: "Peavaade PDF editoride ja PDF agentide orkestreerimiseks: OCR, split/merge, redaktsioon, vormid ja AI töötlus.",
    nextSteps: ["PDF agentide register", "Editorite käivitamine", "Dokumendi pipeline", "HITL kinnitused"],
  },
  "pdf-editors": {
    title: "PDF Editorid",
    group: "PDF Editor Orkester",
    icon: FileStack,
    status: "planeeritud",
    description: "Kõik PDF tööriistad ühes kohas: editor, converter, OCR, annotatsioon, redaktsioon ja eksport.",
    nextSteps: ["Editorite kaart", "Failide routing", "Batch töötlus", "Kvaliteedikontroll"],
  },
  "pdf-agents": {
    title: "PDF agendid",
    group: "PDF Editor Orkester",
    icon: Network,
    status: "planeeritud",
    description: "Agendid, mis mõistavad PDF-e, parandavad dokumente ja juhivad editorite töövooge.",
    nextSteps: ["OCR agent", "Tabeli agent", "Redaktsiooni agent", "Kontrollagent"],
  },
  "nexuspdf-alchemy": {
    title: "NexusPDF Alchemy",
    group: "PDF Editor Orkester",
    icon: Wand2,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\NexusPDF-Alchemy",
    description: "NexusPDF-Alchemy moodul läheb PDF orkestri alla eraldi tööriistana.",
    nextSteps: ["Repo audit", "Käivitusviis", "API adapter", "Menüü süvaintegratsioon"],
  },
  "onepdf-client": {
    title: "OnePDF klient",
    group: "PDF Editor Orkester",
    icon: FileStack,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\onepdf-client",
    description: "OnePDF klient registreeritakse Annaatori PDF tööriistade ökosüsteemi.",
    nextSteps: ["UI audit", "Failide üleandmine", "Auth/õigused", "Agent bridge"],
  },
  "agents-workspace": {
    title: ".agents tööruum",
    group: "PDF Editor Orkester",
    icon: Terminal,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\.agents",
    description: "Agentide konfiguratsioonid ja tööruumi failid, mida PDF orkester ja peaagent saavad hiljem hallata.",
    nextSteps: ["Manifestid", "Skillide sidumine", "Turvakontroll", "Versioonimine"],
  },
  "visual-flow-pwa": {
    title: "Visual Flow PWA",
    group: "Creator Studio",
    icon: Route,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\atom\\VisualFLOWPWA",
    description: "Visuaalne flow builder creatorite, automatsioonide ja agentide töövoogude jaoks.",
    nextSteps: ["Rakenduse audit", "Embed/iframe või native route", "Flow export", "Agent triggerid"],
  },
  "aurora-multimedia": {
    title: "Aurora Multimedia",
    group: "Creator Studio",
    icon: Video,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\atom\\AuroraMultimedia",
    description: "Multimeedia stuudio video, pildi ja sisu töövoogude jaoks.",
    nextSteps: ["Build audit", "Asset pipeline", "Render queue", "Creator workspace"],
  },
  "ai-multimedia-editor": {
    title: "AI Multimedia Editor",
    group: "Creator Studio",
    icon: Wand2,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\atom\\ai_multimedia_editor",
    description: "AI-ga pildi, video ja sotsiaalmeedia sisu muutmise moodul.",
    nextSteps: ["Editor adapter", "Prompt presetid", "Failide salvestus", "Approval flow"],
  },
  "ai-muusika": {
    title: "AI Muusika",
    group: "Creator Studio",
    icon: Music,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\atom\\AImuusikaapppCLAUDEI",
    description: "Muusika ja helisisu loomise töölaud kampaaniate, creatorite ja brändide jaoks.",
    nextSteps: ["Mudelite adapter", "Helifailide haldus", "Promptid", "Õiguste kontroll"],
  },
  "ai-influencer": {
    title: "AI Influencer",
    group: "Creator Studio",
    icon: Users,
    status: "kaust olemas",
    source: "I:\\Devdrive\\PDFEDITOR\\ATOM\\ATOM\\atom\\ai-influencer-main",
    description: "Influencerite, tegelaste, kampaaniate ja sisuagentide haldusmoodul.",
    nextSteps: ["Persona register", "Kampaaniad", "Postituste kalender", "Brändi reeglid"],
  },
  "content-calendar": {
    title: "Sisu kalender",
    group: "Creator Studio",
    icon: Calendar,
    status: "planeeritud",
    description: "Postituste, kampaaniate ja influencer workflow'de ajakava.",
    nextSteps: ["Kalendri vaade", "Kinnitusring", "Platvormide sync", "Automaatpostitus"],
  },
  "influencer-crm": {
    title: "Influencer CRM",
    group: "Äri",
    icon: Users,
    status: "planeeritud",
    description: "Influencerite, klientide, pakkumiste ja kampaaniate äripool.",
    nextSteps: ["Kontaktid", "Pakkumised", "Kampaaniad", "Tulemuste mõõdikud"],
  },
  "api-keys": {
    title: "API võtmed",
    group: "System",
    icon: KeyRound,
    status: "turvarežiim",
    description: "Võtmete ja ühenduste seis. Saladusi ei kuvata ega muudeta selles vaates.",
    nextSteps: ["Teenuste staatus", "Puuduvad võtmed", "Rotatsiooni meeldetuletus", "Õigused"],
  },
  "health-logs": {
    title: "Tervis & logid",
    group: "System",
    icon: Settings,
    status: "planeeritud",
    description: "Backend, frontend, workerid, queue'd ja agentide logid ühes operaatori vaates.",
    nextSteps: ["Health endpointid", "Log stream", "Error inbox", "Teavitused"],
  },
  "deploy-git": {
    title: "Deploy/Git",
    group: "System",
    icon: GitBranch,
    status: "ainult lokaalne",
    description: "Koodi olek, deploy-valmidus ja release checklist. Deploy jääb käsitsi kinnituse alla.",
    nextSteps: ["Git status", "Build kontroll", "Netlify checklist", "Release notes"],
  },
};

const fallbackModule: CenterModule = {
  title: "Annaatori moodul",
  group: "AI Center",
  icon: Zap,
  status: "registreeritud",
  description: "See moodul on menüüs registreeritud ja ootab detailset integratsiooni.",
  nextSteps: ["Audit", "Käivitusviis", "API ühendus", "UI integratsioon"],
};

export default function CenterModulePage() {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;
  const module = (slug && modules[slug]) || fallbackModule;
  const Icon = module.icon;
  const isPdfModule = Boolean(
    slug && ["pdf-orchestrator", "pdf-editors", "pdf-agents", "nexuspdf-alchemy", "onepdf-client"].includes(slug),
  );

  return (
    <>
      <Head>
        <title>{module.title} | Annaator</title>
        <meta name="description" content={`${module.title} Annaatori AI Centeris.`} />
      </Head>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-slate-100">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{module.group}</Badge>
                <Badge>{module.status}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">{module.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">{module.description}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi töölauale
          </Button>
        </div>

        {module.source && (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="h-4 w-4 text-slate-400" />
                Lähtekaust
              </CardTitle>
              <CardDescription>Moodul on Annaatori menüüs registreeritud selle lokaalse projekti põhjal.</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-cyan-200">
                {module.source}
              </code>
            </CardContent>
          </Card>
        )}

        <AiWorkbenchDashboard
          initialModuleId={slug || "pdf-orchestrator"}
          title={`${module.title} AI mooduliplaan`}
          description="Vali moodul, genereeri lokaalne plaan ja vaata enne backend integratsiooni vajalikud agendid, endpointid, riskid ning järgmine tegevus."
        />

        {isPdfModule && <PdfOrchestratorPanel />}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/70 lg:col-span-2">
            <CardHeader>
              <CardTitle>Integratsiooni plaan</CardTitle>
              <CardDescription>Järgmised tehnilised sammud enne päris ühendamist.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {module.nextSteps.map((step) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-sm text-slate-200">{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle>Praegune olek</CardTitle>
              <CardDescription>Menüüvalik on valmis, süvaintegratsioon tuleb järgmise tööna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <span>Menüüs</span>
                <Badge>jah</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <span>404 kaitse</span>
                <Badge>jah</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <span>Backend ühendus</span>
                <Badge variant="secondary">hiljem</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
