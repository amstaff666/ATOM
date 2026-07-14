"use client";

import { useState } from "react";
import Head from "next/head";
import {
    Landmark, FileText, Building2, Bot, Package, CheckCircle,
    AlertCircle, Clock, ChevronRight, Send, RefreshCw, X,
    Check, BarChart3, Shield, Users, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Case {
    id: string;
    client: string;
    type: string;
    amount: string;
    nextStep: string;
}

interface Provider {
    name: string;
    category: string;
    fit: number;
    maxAmount: string;
    docs: string;
    risk: string;
}

interface Document {
    name: string;
    bank: string;
    status: "Parsed" | "OCR needed" | "Missing";
    agent: string;
}

interface ChatMessage {
    role: "agent" | "user";
    text: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const CASES: Case[] = [
    { id: "AN-1042", client: "Demo Ettevõte OÜ", type: "Ettevõte", amount: "100 000 €", nextStep: "Haldur kinnitab provider package'i" },
    { id: "AN-1043", client: "Nordic Wood OÜ",   type: "Ettevõte", amount: "60 000 €",  nextStep: "Saada LHV/Coop shortlist" },
];

const QUICK_CASES = [
    { client: "Demo Ettevõte OÜ", amount: "100k", status: "dok puudub",   color: "text-amber-400" },
    { client: "Nordic Wood OÜ",   amount: "60k",  status: "valmis",       color: "text-emerald-400" },
    { client: "Atlas Trade OÜ",   amount: "25k",  status: "OCR",          color: "text-blue-400" },
    { client: "Ranna Invest OÜ",  amount: "150k", status: "risk",         color: "text-red-400" },
];

const PROVIDERS: Provider[] = [
    { name: "LHV",          category: "pank / business loan",      fit: 92, maxAmount: "20k",  docs: "12m väljavõte + aruanded", risk: "Madal" },
    { name: "Coop Pank",    category: "pank / väikelaen ärile",    fit: 88, maxAmount: "20k",  docs: "6–12m väljavõte",          risk: "Madal/kesk" },
    { name: "Bigbank",      category: "krediidiasutus",             fit: 74, maxAmount: "20k",  docs: "Käive + kohustused",        risk: "Kesk" },
    { name: "Nordic Hypo",  category: "tagatis",                    fit: 81, maxAmount: "40k+", docs: "Tagatis + hindamine",       risk: "Madal" },
];

const DOCUMENTS: Document[] = [
    { name: "statement_lhv_12m.pdf",  bank: "LHV",      status: "Parsed",     agent: "Table Agent" },
    { name: "statement_swed_6m.pdf",  bank: "Swedbank", status: "OCR needed", agent: "OCR Agent" },
    { name: "balance_2025.pdf",       bank: "Bilanss",  status: "Missing",    agent: "Client task" },
];

const PACKAGE_ROWS = [
    { source: "LHV",         amount: "20 000 €", role: "pank" },
    { source: "Coop",        amount: "20 000 €", role: "pank" },
    { source: "SEB",         amount: "20 000 €", role: "pank" },
    { source: "Bigbank",     amount: "20 000 €", role: "krediidiasutus" },
    { source: "Nordic Hypo", amount: "20 000 €", role: "tagatis/backup" },
];

const PIPELINE_STEPS = [
    { num: 1, title: "Dokumentide vastuvõtu agent", desc: "Pangaväljavõtted, bilanss ja kasumiaruanne võeti sisse.",            status: "OK",     color: "text-emerald-400" },
    { num: 2, title: "PDF AI Orchestrator",          desc: "OCR, tabelite tuvastus, kvaliteedikontroll ja manifest.",            status: "2 failil OCR", color: "text-amber-400" },
    { num: 3, title: "Finantseerijate uuringuagent", desc: "Kontrollib pankade ja krediidiandjate tingimusi.",                   status: "maatriks", color: "text-blue-400" },
    { num: 4, title: "Paketi optimeerija",           desc: "Koostab 100 000 € rahastuspaketi mitmest allikast.",                 status: "mustand", color: "text-purple-400" },
    { num: 5, title: "Halduri kinnitusring",         desc: "Ühtegi taotlust ei saadeta enne käsitsi kinnitamist.",               status: "manual", color: "text-orange-400" },
];

// ─── Helper: status badge ────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: Document["status"] }) {
    const map: Record<Document["status"], string> = {
        "Parsed":     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        "OCR needed": "bg-amber-500/15 text-amber-400 border-amber-500/30",
        "Missing":    "bg-red-500/15 text-red-400 border-red-500/30",
    };
    return (
        <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", map[status])}>
            {status}
        </span>
    );
}

// ─── Sub-sections ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{sub}</p>
        </div>
    );
}

function KpiCard({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <span className={cn("text-2xl font-bold", color)}>{value}</span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
    );
}

// ─── Tab: Ülevaade ───────────────────────────────────────────────────────────

function TabOverview() {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Annaatori laenuhalduse töölaud"
                sub="Üks koht kliendi dokumentide, agentide, providerite tingimuste ja rahastuspaketi otsuste jaoks."
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard value="18" label="Aktiivsed case'id" sub="4 uut täna"          color="text-blue-400" />
                <KpiCard value="46" label="Dokumendid töötluses" sub="OCR + parser queue" color="text-amber-400" />
                <KpiCard value="78%" label="Rahastusvalmidus AI" sub="Demo Ettevõte OÜ"  color="text-emerald-400" />
                <KpiCard value="100k€" label="Katvus provideritega" sub="5 × 20k simulatsioon" color="text-purple-400" />
            </div>

            {/* Pipeline */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground font-mono">Annaatori töövoog — juhtum #AN-1042</p>
                        <p className="text-xs text-muted-foreground">Kliendi failid → PDF/OCR → risk → provider matrix → halduri kinnitamine</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">running</span>
                </div>
                <div className="space-y-3">
                    {PIPELINE_STEPS.map((s) => (
                        <div key={s.num} className="flex items-start gap-3">
                            <span className="mt-0.5 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">{s.num}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                                <p className="text-xs text-muted-foreground">{s.desc}</p>
                            </div>
                            <span className={cn("text-xs font-mono shrink-0", s.color)}>{s.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick cases */}
            <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Kiired case'id — prioriteet haldurile</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground text-xs border-b border-border">
                                <th className="text-left py-2 pr-4">Klient</th>
                                <th className="text-left py-2 pr-4">Summa</th>
                                <th className="text-left py-2">Seis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {QUICK_CASES.map((c) => (
                                <tr key={c.client} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                                    <td className="py-2 pr-4 font-medium text-foreground">{c.client}</td>
                                    <td className="py-2 pr-4 text-muted-foreground">{c.amount}</td>
                                    <td className={cn("py-2 font-semibold", c.color)}>{c.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Cases ──────────────────────────────────────────────────────────────

function TabCases() {
    return (
        <div className="space-y-6">
            <SectionHeader title="Kliendid / Juhtumid" sub="Annaatori halduri tabel: iga klient, laenusumma, dokumendid, finantseerijate katvus ja järgmine tegevus." />

            {/* Case cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { name: "Demo Ettevõte OÜ", rows: [["Soovitud summa","100 000 €"],["Finantseerija lagi","20 000 €"],["6 panga baas","4/6"],["Seis","Maatriks valmis"]] },
                    { name: "Nordic Wood OÜ",   rows: [["Soovitud summa","60 000 €"],["Dokumendid","100%"],["Risk","Madal"],["Seis","Kinnitamisel"]] },
                    { name: "Atlas Trade OÜ",   rows: [["Soovitud summa","25 000 €"],["OCR","Töös"],["Puudub","Bilanss"],["Seis","Dok kontroll"]] },
                ].map((c) => (
                    <div key={c.name} className="bg-card border border-border rounded-xl p-4 space-y-2">
                        <h3 className="font-bold text-foreground">{c.name}</h3>
                        {c.rows.map(([k, v]) => (
                            <div key={k} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="font-semibold text-foreground">{v}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Registry table */}
            <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-1">Juhtumite register</h3>
                <p className="text-xs text-muted-foreground mb-4">Tulevikus siia Neon tabelid: case_records + person_profiles + organization_profiles.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground text-xs border-b border-border">
                                <th className="text-left py-2 pr-4">ID</th>
                                <th className="text-left py-2 pr-4">Klient</th>
                                <th className="text-left py-2 pr-4">Tüüp</th>
                                <th className="text-left py-2 pr-4">Taotlus</th>
                                <th className="text-left py-2">Järgmine samm</th>
                            </tr>
                        </thead>
                        <tbody>
                            {CASES.map((c) => (
                                <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                                    <td className="py-2 pr-4 font-mono text-xs text-blue-400">{c.id}</td>
                                    <td className="py-2 pr-4 font-medium text-foreground">{c.client}</td>
                                    <td className="py-2 pr-4 text-muted-foreground">{c.type}</td>
                                    <td className="py-2 pr-4 font-semibold text-foreground">{c.amount}</td>
                                    <td className="py-2 text-muted-foreground">{c.nextStep}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Dokumendid ─────────────────────────────────────────────────────────

function TabDocuments() {
    return (
        <div className="space-y-6">
            <SectionHeader title="Dokumendid" sub="PDF AI Orchestrator: pangaväljavõtted, bilansid, aruanded, OCR, tabelid ja kvaliteedikontroll." />

            {/* Drop zone */}
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">Lohista kliendi PDF-id siia</p>
                <p className="text-xs mt-1">Swedbank, SEB, LHV, Coop, Luminor, Citadele väljavõtted + bilanss</p>
            </div>

            {/* Documents table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-xs border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-3 pr-4">Dokument</th>
                            <th className="text-left px-4 py-3 pr-4">Pank / tüüp</th>
                            <th className="text-left px-4 py-3 pr-4">Staatus</th>
                            <th className="text-left px-4 py-3">Agent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DOCUMENTS.map((d) => (
                            <tr key={d.name} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-foreground">{d.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{d.bank}</td>
                                <td className="px-4 py-3"><DocStatusBadge status={d.status} /></td>
                                <td className="px-4 py-3 text-muted-foreground">{d.agent}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quality cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-amber-400 font-bold text-lg">Q</span>
                        <div>
                            <p className="text-sm font-semibold text-foreground">OCR confidence</p>
                            <p className="text-xs text-muted-foreground mt-1">Üks Swedbank fail on skännitud ja vajab Tesseract + vision mudelit.</p>
                        </div>
                        <span className="ml-auto text-amber-400 font-bold text-lg">72%</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-blue-400 font-bold text-lg">T</span>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Tabelid</p>
                            <p className="text-xs text-muted-foreground mt-1">Tehinguridade struktuur tuvastatud 5/6 pangal.</p>
                        </div>
                        <span className="ml-auto text-emerald-400 font-bold text-sm">OK</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Provider Matrix ────────────────────────────────────────────────────

function TabProviders() {
    return (
        <div className="space-y-6">
            <SectionHeader title="Finantseerijate maatriks" sub="Agent võrdleb kliendi profiili pankade, krediidiandjate, liisingu ja tagatisega laenude tingimustega." />
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-xs border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-3">Finantseerija</th>
                            <th className="text-left px-4 py-3">Sobivus</th>
                            <th className="text-left px-4 py-3">Max demo</th>
                            <th className="text-left px-4 py-3 hidden md:table-cell">Dok nõuded</th>
                            <th className="text-left px-4 py-3 hidden md:table-cell">Risk</th>
                            <th className="text-left px-4 py-3">Halduri otsus</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PROVIDERS.map((p) => (
                            <tr key={p.name} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="font-bold text-foreground">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.category}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.fit}%` }} />
                                        </div>
                                        <span className={cn("text-xs font-bold", p.fit >= 88 ? "text-emerald-400" : p.fit >= 78 ? "text-blue-400" : "text-amber-400")}>{p.fit}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-foreground">{p.maxAmount}</td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.docs}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <span className={cn("text-xs font-semibold", p.risk === "Madal" ? "text-emerald-400" : p.risk === "Madal/kesk" ? "text-blue-400" : "text-amber-400")}>{p.risk}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <button className="text-xs px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                                        Vali paketis
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Tab: Agendid ────────────────────────────────────────────────────────────

const AGENTS = [
    { icon: FileText, name: "Dokumentide vastuvõtu agent", desc: "Võtab kliendi failid sisse ja paneb juhtumi külge." },
    { icon: BarChart3, name: "OCR / visiooni agent",        desc: "Tuvastab skännitud väljavõtted ja tabelid." },
    { icon: Building2, name: "Finantseerijate uuringuagent", desc: "Hoiab finantseerijate tingimuste registrit ajakohasena." },
    { icon: Package,   name: "Paketi optimeerija",          desc: "Koostab 100k rahastuse mitme finantseerijaga." },
    { icon: Shield,    name: "Riski ja vastavuse agent",    desc: "Kontrollib vastutustundliku laenamise riski." },
    { icon: CheckCircle, name: "Halduri kinnituse agent",   desc: "Peatab kõik tegevused, mis vajavad käsitsi kinnitust." },
];

function TabAgents() {
    const [running, setRunning] = useState<string[]>([]);
    const toggle = (name: string) =>
        setRunning((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

    return (
        <div className="space-y-6">
            <SectionHeader title="Agentide töölaud" sub="Annaatori tehniline võimekus: agentide käivitamine, seiskamine, suunamine ja reasoning trace." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AGENTS.map((a) => {
                    const Icon = a.icon;
                    const active = running.includes(a.name);
                    return (
                        <div key={a.name} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", active ? "bg-blue-500/15" : "bg-secondary")}>
                                <Icon className={cn("h-5 w-5", active ? "text-blue-400" : "text-muted-foreground")} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">{a.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                            </div>
                            <button
                                onClick={() => toggle(a.name)}
                                className={cn("shrink-0 text-xs px-3 py-1 rounded-full border font-semibold transition-colors",
                                    active ? "bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25"
                                           : "border-border text-muted-foreground hover:bg-secondary")}
                            >
                                {active ? "Peata" : "Käivita"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Tab: Rahastuspakett ─────────────────────────────────────────────────────

function TabPackage() {
    return (
        <div className="space-y-6">
            <SectionHeader title="Rahastuspakett" sub="Kui klient tahab 100 000 €, aga üks allikas annab max 20 000 €, koostab agent mitu realistlikku varianti." />

            <div className="bg-card border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-foreground">Variant B — kiire katvus</h3>
                        <p className="text-xs text-muted-foreground">Demo, mitte päris pakkumine</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">vajab halduri kinnitust</span>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-xs border-b border-border">
                            <th className="text-left py-2 pr-4">Allikas</th>
                            <th className="text-left py-2 pr-4">Summa</th>
                            <th className="text-left py-2">Roll</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PACKAGE_ROWS.map((r) => (
                            <tr key={r.source} className="border-b border-border/40">
                                <td className="py-2 pr-4 font-semibold text-foreground">{r.source}</td>
                                <td className="py-2 pr-4 text-foreground">{r.amount}</td>
                                <td className="py-2 text-muted-foreground">{r.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-3 pt-3 border-t border-border flex justify-between font-bold text-foreground text-sm">
                    <span>Kokku</span><span>100 000 €</span>
                </div>
            </div>

            {/* Risk checks */}
            <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Riskikontroll — enne saatmist</h3>
                <div className="space-y-3">
                    {[
                        { num: 1, title: "Kohustuste kontroll", desc: "Olemasolevad laenud ja kuumaksed.", status: "vajab andmeid", color: "text-amber-400" },
                        { num: 2, title: "Cashflow kontroll",   desc: "Kas maksevõime kannab mitut allikat.",  status: "OK",           color: "text-emerald-400" },
                        { num: 3, title: "Manual approve",      desc: "Haldur kinnitab enne taotluste saatmist.", status: "required",  color: "text-orange-400" },
                    ].map((r) => (
                        <div key={r.num} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0 mt-0.5">{r.num}</span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                                <p className="text-xs text-muted-foreground">{r.desc}</p>
                            </div>
                            <span className={cn("text-xs font-mono shrink-0", r.color)}>{r.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Annaatori assistendi vestlus ─────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [
    { role: "agent", text: "Leidsin case #AN-1042 juures 3 puudust: Swedbank 12 kuu väljavõte, bilanss ja Luminor/Citadele kontode seis." },
    { role: "user",  text: "Koosta 100k rahastuspakett, aga ära saada taotlusi." },
    { role: "agent", text: "Draft valmis. Soovitan 3 varianti: konservatiivne, kiire katvus ja etapiline. Halduri kinnitus on nõutud." },
];

const APPROVAL_ITEMS = [
    { type: "Kinnitus nõutud", desc: "Finantseerimispaketi saatmine kliendile vajab kinnitust.", badge: "hitl", color: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
    { type: "Dokumendipäring kliendile", desc: "Küsi kliendilt 12 kuu Swedbank väljavõte ja bilanss.", badge: "klient", color: "bg-blue-500/15 border-blue-500/30 text-blue-400" },
    { type: "Reeglite uuendus agendile", desc: "Uuenda Bigbank / Inbank / Holm tingimused enne päris otsust.", badge: "agent", color: "bg-purple-500/15 border-purple-500/30 text-purple-400" },
];

function ChatWidget() {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState("");

    const send = () => {
        if (!input.trim()) return;
        setMessages((prev) => [...prev, { role: "user", text: input }]);
        setInput("");
        setTimeout(() => {
            setMessages((prev) => [...prev, { role: "agent", text: "Analüüsin... Uuendan case'i andmeid." }]);
        }, 800);
    };

    return (
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-bold text-foreground">Annaatori assistent</span>
                    <span className="text-xs text-muted-foreground">GlobalChatWidget / reasoning / HITL</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="online" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm",
                            m.role === "agent"
                                ? "bg-secondary text-foreground"
                                : "bg-primary text-primary-foreground")}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>
            <div className="px-3 py-2 border-t border-border flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Küsi või anna käsk…"
                    className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button onClick={send} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

type Tab = "overview" | "cases" | "documents" | "providers" | "agents" | "package";

const TABS: { id: Tab; label: string }[] = [
    { id: "overview",   label: "Ülevaade" },
    { id: "cases",      label: "Kliendid / Juhtumid" },
    { id: "documents",  label: "Dokumendid" },
    { id: "providers",  label: "Finantseerijad" },
    { id: "agents",     label: "Agentide töölaud" },
    { id: "package",    label: "Rahastuspakett" },
];

export default function LaenuHaldurPage() {
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    return (
        <>
        <Head>
            <title>Laenu Haldur | Annaator</title>
            <meta name="description" content="Annaatori laenuhalduse ja rahastusjuhtumite töölaud." />
        </Head>
        <div className="flex h-screen overflow-hidden bg-[#070b12] text-slate-100">
            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0a0f1a]/90 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                            <Landmark className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-foreground leading-tight">Laenu Haldur</h1>
                            <p className="text-xs text-muted-foreground">Annaator halduri platvorm</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />Kohalik AI valmis
                        </span>
                        <span className="text-xs text-muted-foreground">Neon / Netlify</span>
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold">
                            + Uus case
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-border shrink-0 overflow-x-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={cn("px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors",
                                activeTab === t.id
                                    ? "text-primary border-b-2 border-primary bg-primary/5"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content + approval sidebar */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "overview"   && <TabOverview />}
                        {activeTab === "cases"      && <TabCases />}
                        {activeTab === "documents"  && <TabDocuments />}
                        {activeTab === "providers"  && <TabProviders />}
                        {activeTab === "agents"     && <TabAgents />}
                        {activeTab === "package"    && <TabPackage />}
                    </div>

                    {/* Right panel: chat + approvals */}
                    <div className="w-80 shrink-0 border-l border-border flex flex-col gap-4 p-4 overflow-y-auto bg-background/50 hidden xl:flex">
                        <div className="flex-1 min-h-0 flex flex-col" style={{ minHeight: 320 }}>
                            <ChatWidget />
                        </div>
                        <div className="space-y-3">
                            {APPROVAL_ITEMS.map((a) => (
                                <div key={a.type} className="bg-card border border-border rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border", a.color)}>{a.badge}</span>
                                        <span className="text-xs font-semibold text-foreground">{a.type}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button className="flex-1 text-xs py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-semibold flex items-center justify-center gap-1">
                                            <Check className="h-3 w-3" /> Kinnita
                                        </button>
                                        <button className="flex-1 text-xs py-1 rounded bg-secondary border border-border text-muted-foreground hover:bg-secondary/70 transition-colors font-semibold flex items-center justify-center gap-1">
                                            <X className="h-3 w-3" /> Lükka tagasi
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
