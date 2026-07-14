"use client";

import { useState, useRef, useEffect } from "react";
import {
    Moon, Sparkles, Send, RefreshCw, CheckCircle, AlertCircle,
    Clock, ChevronRight, FileText, BarChart3, Shield, Package,
    Zap, Bot, Bell, X, Check, Play, Square, Info, Activity,
    MessageSquare, Brain, Layers, Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: "luuna" | "user";
    text: string;
    timestamp: string;
    reasoning?: string[];
    hitl?: HITLRequest;
}

interface HITLRequest {
    action: string;
    caseId?: string;
    amount?: string;
    impact: string;
    reversible: boolean;
    risk: string;
    recommendation: "JAH" | "EI";
    status: "pending" | "approved" | "rejected";
}

interface AgentSkill {
    id: string;
    label: string;
    description: string;
    status: "idle" | "running" | "done" | "error";
    riskLevel: "low" | "high";
}

interface Notification {
    id: string;
    type: "hitl" | "info" | "warning" | "success";
    title: string;
    body: string;
    time: string;
    read: boolean;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: "1",
        role: "luuna",
        text: "Tere! Olen Luuna — sinu ATOM platvormi partner. Vaatan hetkel 18 aktiivset case'i. Case #AN-1042 vajab tähelepanu: Swedbank 12 kuu väljavõte on puudu. Soovitan alustada sealt.",
        timestamp: "10:30",
        reasoning: [
            "🔍 Analüüsin: Aktiivsed case'id laetud",
            "📊 Andmed: 18 case'i, 4 kriitilise staatusega",
            "⚡ Järeldus: AN-1042 on blokeering — puuduv dokument",
            "💡 Soovitus: Saada kliendile dokumendinõue",
        ],
    },
    {
        id: "2",
        role: "user",
        text: "Koosta 100k rahastuspakett Demo Ettevõte OÜ jaoks, aga ära saada veel.",
        timestamp: "10:31",
    },
    {
        id: "3",
        role: "luuna",
        text: "Paketi draft on valmis. Koostasin 3 varianti — kõige tugevam on Variant B (kiire katvus). Ükski variant pole kliendile saadetud — ootab sinu kinnitust.",
        timestamp: "10:31",
        reasoning: [
            "🔍 Analüüsin: Demo Ettevõte OÜ profiil ja cashflow",
            "📊 Andmed: 12k€/kuu käive, madal risk, 4/6 providerit sobivad",
            "⚡ Järeldus: 5 × 20k€ struktuur on optimaalne",
            "💡 Soovitus: Variant B — LHV + Coop + SEB + Bigbank + Nordic Hypo",
        ],
    },
];

const SKILLS: AgentSkill[] = [
    { id: "pdf-bank-statement-parser", label: "Pangaväljavõtte parser", description: "LHV, Swedbank, SEB, Coop, Luminor, Citadele", status: "idle", riskLevel: "low" },
    { id: "pdf-orchestrator", label: "PDF Orkestraator", description: "Täistsükkel: ingest → OCR → parse → manifest", status: "idle", riskLevel: "low" },
    { id: "invoice-organizer", label: "Arveote korraldaja", description: "Kategoriseerimine, duplikaadid, tähtajad", status: "idle", riskLevel: "low" },
    { id: "proactive-agent", label: "Proaktiivne agent", description: "Pidev monitooring, hoiatused, soovitused", status: "running", riskLevel: "low" },
    { id: "analytics-data-analysis", label: "Andmeanalüüs", description: "Cashflow, riskiskoor, provider matriiks", status: "idle", riskLevel: "low" },
    { id: "create-plan", label: "Rahastusplaani koostaja", description: "Multi-provider paketid — draft koostamine", status: "done", riskLevel: "high" },
    { id: "fix-errors", label: "Vigade parandaja", description: "OCR, formaadid, pipeline tõrked", status: "idle", riskLevel: "low" },
    { id: "self-improvement", label: "Iseõppimine", description: "Vigade logimine, protsessiparandused", status: "running", riskLevel: "low" },
];

const NOTIFICATIONS: Notification[] = [
    { id: "n1", type: "hitl", title: "HITL — Paketi kinnitamine", body: "Demo Ettevõte OÜ 100k€ pakett ootab kinnitust.", time: "2 min", read: false },
    { id: "n2", type: "warning", title: "Dokument puudub", body: "AN-1042: Swedbank 12 kuu väljavõte on puudu.", time: "15 min", read: false },
    { id: "n3", type: "info", title: "Provider update", body: "Bigbank tingimused muutusid — matriiks uuendatakse.", time: "1h", read: true },
    { id: "n4", type: "success", title: "OCR valmis", body: "Nordic Wood OÜ 3 dokumenti parsitud edukalt.", time: "2h", read: true },
];

// ─── Helper components ────────────────────────────────────────────────────────

function LuunaAvatar({ size = "md", glow = false }: { size?: "sm" | "md" | "lg"; glow?: boolean }) {
    const s = size === "sm" ? "w-7 h-7 text-sm" : size === "lg" ? "w-12 h-12 text-xl" : "w-9 h-9 text-base";
    return (
        <div className={cn(
            "rounded-full flex items-center justify-center shrink-0 font-bold select-none",
            "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]",
            s,
            glow && "shadow-[0_0_20px_rgba(99,102,241,0.5)]"
        )}>
            <Moon className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4.5 w-4.5"} style={{ color: "#fff" }} />
        </div>
    );
}

function SkillStatusDot({ status }: { status: AgentSkill["status"] }) {
    if (status === "running") return <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse" />;
    if (status === "done")    return <span className="w-2 h-2 rounded-full bg-[#10b981]" />;
    if (status === "error")   return <span className="w-2 h-2 rounded-full bg-[#ef4444]" />;
    return <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />;
}

function NotifIcon({ type }: { type: Notification["type"] }) {
    if (type === "hitl")    return <AlertCircle className="h-4 w-4 text-[#f59e0b]" />;
    if (type === "warning") return <AlertCircle className="h-4 w-4 text-[#f59e0b]" />;
    if (type === "success") return <CheckCircle className="h-4 w-4 text-[#10b981]" />;
    return <Info className="h-4 w-4 text-[#06b6d4]" />;
}

function HITLCard({ hitl, onApprove, onReject }: { hitl: HITLRequest; onApprove: () => void; onReject: () => void }) {
    if (hitl.status !== "pending") {
        const approved = hitl.status === "approved";
        return (
            <div className={cn("mt-2 rounded-xl px-3 py-2 border text-xs font-semibold flex items-center gap-2",
                approved
                    ? "bg-[rgba(16,185,129,0.10)] border-[rgba(16,185,129,0.30)] text-[#10b981]"
                    : "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.30)] text-[#ef4444]"
            )}>
                {approved ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {approved ? "Haldur kinnitas" : "Haldur keeldus"}
            </div>
        );
    }
    return (
        <div className="mt-2 rounded-xl border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.08)] p-3 space-y-2">
            <div className="flex items-center gap-2 text-[#f59e0b] font-bold text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                HITL KINNITUST VAJAV TOIMING
            </div>
            <div className="text-xs space-y-1 text-[#e2e8f0]">
                <p><span className="text-[#94a3b8]">Toiming: </span>{hitl.action}</p>
                {hitl.caseId && <p><span className="text-[#94a3b8]">Case: </span>{hitl.caseId}</p>}
                {hitl.amount && <p><span className="text-[#94a3b8]">Summa: </span>{hitl.amount}</p>}
                <p><span className="text-[#94a3b8]">Mõju: </span>{hitl.impact}</p>
                <p><span className="text-[#94a3b8]">Pöörduvus: </span>{hitl.reversible ? "Jah" : "EI — pöördumatu"}</p>
                <p><span className="text-[#94a3b8]">Risk: </span>{hitl.risk}</p>
                <p className="text-[#8b5cf6] font-semibold">
                    Luuna soovitus: {hitl.recommendation}
                </p>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={onApprove} className="flex-1 py-1.5 rounded-lg bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.40)] text-[#6366f1] text-xs font-bold hover:bg-[rgba(99,102,241,0.25)] transition-colors">
                    ✓ JAH
                </button>
                <button onClick={onReject} className="flex-1 py-1.5 rounded-lg bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.30)] text-[#ef4444] text-xs font-bold hover:bg-[rgba(239,68,68,0.20)] transition-colors">
                    ✕ EI
                </button>
            </div>
        </div>
    );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

function NotificationsPanel({ notifs, onClose }: { notifs: Notification[]; onClose: () => void }) {
    return (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-[#2d2d4e] bg-[#1a1a2e] shadow-[0_8px_32px_rgba(0,0,0,0.60)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d4e]">
                <span className="text-sm font-bold text-[#e2e8f0]">Teavitused</span>
                <button onClick={onClose} className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-[#2d2d4e]">
                {notifs.map((n) => (
                    <div key={n.id} className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]", !n.read && "bg-[rgba(99,102,241,0.04)]")}>
                        <div className="mt-0.5 shrink-0"><NotifIcon type={n.type} /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#e2e8f0] truncate">{n.title}</p>
                            <p className="text-xs text-[#94a3b8] mt-0.5">{n.body}</p>
                        </div>
                        <span className="text-[10px] text-[#64748b] shrink-0 mt-0.5">{n.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Agent Status Bar ─────────────────────────────────────────────────────────

function AgentStatusBar({ skills }: { skills: AgentSkill[] }) {
    const running = skills.filter((s) => s.status === "running");
    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2d2d4e] bg-[#16213e] overflow-x-auto scrollbar-hide">
            <Activity className="h-3.5 w-3.5 text-[#6366f1] shrink-0" />
            {skills.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 shrink-0">
                    <SkillStatusDot status={s.status} />
                    <span className="text-[11px] text-[#94a3b8]">{s.label}</span>
                </div>
            ))}
            {running.length > 0 && (
                <span className="text-[10px] text-[#6366f1] font-semibold shrink-0 ml-auto">
                    {running.length} agent töötab
                </span>
            )}
        </div>
    );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState("");
    const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>({});
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: input, timestamp: new Date().toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" }) };
        setMessages((p) => [...p, userMsg]);
        setInput("");
        setTimeout(() => {
            const reply: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "luuna",
                text: "Analüüsin sinu päringut... Uuendan case'i andmeid ja kontrollin provider maatriksit.",
                timestamp: new Date().toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" }),
                reasoning: ["🔍 Analüüsin: Päringu sisu", "📊 Andmed: Aktiivsed case'id laetud", "⚡ Järeldus: Tegevus identifitseeritud", "💡 Soovitus: Procedeerin"],
            };
            setMessages((p) => [...p, reply]);
        }, 900);
    };

    const handleHITL = (msgId: string, decision: "approved" | "rejected") => {
        setMessages((p) => p.map((m) => m.id === msgId && m.hitl ? { ...m, hitl: { ...m.hitl, status: decision } } : m));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((m) => (
                    <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                        {m.role === "luuna" && <LuunaAvatar size="sm" />}
                        <div className={cn("max-w-[80%] space-y-1.5", m.role === "user" ? "items-end" : "items-start")}>
                            <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                m.role === "luuna"
                                    ? "bg-[#1a1a2e] border border-[#2d2d4e] text-[#e2e8f0] rounded-tl-sm"
                                    : "bg-[#6366f1] text-white rounded-tr-sm"
                            )}>
                                {m.text}
                            </div>
                            {m.reasoning && (
                                <div>
                                    <button
                                        onClick={() => setShowReasoning((p) => ({ ...p, [m.id]: !p[m.id] }))}
                                        className="text-[10px] text-[#6366f1] hover:text-[#8b5cf6] flex items-center gap-1 transition-colors"
                                    >
                                        <Brain className="h-3 w-3" />
                                        {showReasoning[m.id] ? "Peida" : "Näita"} reasoning trace
                                    </button>
                                    {showReasoning[m.id] && (
                                        <div className="mt-1 rounded-xl bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)] px-3 py-2 space-y-1">
                                            {m.reasoning.map((r, i) => (
                                                <p key={i} className="text-[11px] text-[#94a3b8] font-mono">{r}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {m.hitl && (
                                <HITLCard hitl={m.hitl} onApprove={() => handleHITL(m.id, "approved")} onReject={() => handleHITL(m.id, "rejected")} />
                            )}
                            <p className="text-[10px] text-[#64748b] px-1">{m.timestamp}</p>
                        </div>
                        {m.role === "user" && (
                            <div className="w-7 h-7 rounded-full bg-[#16213e] border border-[#2d2d4e] flex items-center justify-center shrink-0">
                                <span className="text-xs text-[#94a3b8] font-bold">H</span>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="px-4 py-3 border-t border-[#2d2d4e] flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Kirjuta Luunale..."
                    className="flex-1 bg-[#16213e] border border-[#2d2d4e] rounded-xl px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#6366f1] transition-colors min-h-[44px]"
                />
                <button onClick={send} disabled={!input.trim()} className="w-11 h-11 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(99,102,241,0.30)]">
                    <Send className="h-4 w-4 text-white" />
                </button>
            </div>
        </div>
    );
}

// ─── Skills Panel ─────────────────────────────────────────────────────────────

function SkillsPanel({ skills, onToggle }: { skills: AgentSkill[]; onToggle: (id: string) => void }) {
    return (
        <div className="h-full overflow-y-auto p-4 space-y-3">
            <div className="mb-2">
                <h3 className="text-sm font-bold text-[#e2e8f0]">Luuna Skillid</h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">8 sub-agenti — kliki et käivitada</p>
            </div>
            {skills.map((s) => (
                <div key={s.id} className={cn(
                    "rounded-xl border p-3 transition-all",
                    s.status === "running" ? "border-[rgba(99,102,241,0.40)] bg-[rgba(99,102,241,0.06)] shadow-[0_0_20px_rgba(99,102,241,0.12)]" :
                    s.status === "done"    ? "border-[rgba(16,185,129,0.30)] bg-[rgba(16,185,129,0.05)]" :
                    s.status === "error"   ? "border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.05)]" :
                    "border-[#2d2d4e] bg-[#1a1a2e] hover:border-[rgba(99,102,241,0.25)]"
                )}>
                    <div className="flex items-start gap-2.5">
                        <div className="mt-0.5"><SkillStatusDot status={s.status} /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#e2e8f0]">{s.label}</p>
                            <p className="text-[11px] text-[#94a3b8] mt-0.5">{s.description}</p>
                            {s.riskLevel === "high" && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border border-[rgba(245,158,11,0.25)]">
                                    <Shield className="h-2.5 w-2.5" /> HITL nõutud
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => onToggle(s.id)}
                            className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                s.status === "running"
                                    ? "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.30)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.20)]"
                                    : "bg-[rgba(99,102,241,0.10)] border-[rgba(99,102,241,0.25)] text-[#6366f1] hover:bg-[rgba(99,102,241,0.20)]"
                            )}
                        >
                            {s.status === "running" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function MobileBottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
    const tabs = [
        { id: "chat",   icon: MessageSquare, label: "Luuna" },
        { id: "skills", icon: Layers,        label: "Skillid" },
        { id: "notifs", icon: Bell,          label: "Teavitused" },
    ];
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] border-t border-[#2d2d4e] flex">
            {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 transition-colors min-h-[56px]",
                        active ? "text-[#6366f1]" : "text-[#64748b]"
                    )}>
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-semibold">{t.label}</span>
                        {active && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[#6366f1]" />}
                    </button>
                );
            })}
        </nav>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LuunaPage() {
    const [skills, setSkills] = useState<AgentSkill[]>(SKILLS);
    const [showNotifs, setShowNotifs] = useState(false);
    const [mobileTab, setMobileTab] = useState("chat");
    const [darkMode, setDarkMode] = useState(true);
    const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

    const toggleSkill = (id: string) => {
        setSkills((prev) => prev.map((s) => s.id === id
            ? { ...s, status: s.status === "running" ? "idle" : "running" }
            : s
        ));
    };

    return (
        <div className={cn("flex flex-col h-screen", darkMode ? "bg-[#0f0f1a] text-[#e2e8f0]" : "bg-[#f8f9ff] text-[#1e293b]")}>

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d4e] bg-[#0f0f1a] shrink-0">
                <div className="flex items-center gap-3">
                    <LuunaAvatar size="md" glow />
                    <div>
                        <p className="text-sm font-bold text-[#e2e8f0] flex items-center gap-1.5">
                            Luuna
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">ATOM peaagent — 2 agenti töötab</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 relative">
                    <button
                        onClick={() => setDarkMode((d) => !d)}
                        className="w-9 h-9 rounded-xl bg-[#16213e] border border-[#2d2d4e] flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setShowNotifs((s) => !s)}
                        className="relative w-9 h-9 rounded-xl bg-[#16213e] border border-[#2d2d4e] flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                    >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6366f1] text-white text-[9px] font-bold flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {showNotifs && <NotificationsPanel notifs={NOTIFICATIONS} onClose={() => setShowNotifs(false)} />}
                </div>
            </header>

            {/* ── Agent status bar ─────────────────────────────────────────── */}
            <AgentStatusBar skills={skills} />

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0">

                {/* Chat — desktop always visible, mobile tab-controlled */}
                <div className={cn(
                    "flex flex-col flex-1 min-w-0 border-r border-[#2d2d4e]",
                    mobileTab !== "chat" ? "hidden lg:flex" : "flex"
                )}>
                    <ChatPanel />
                </div>

                {/* Skills sidebar — desktop */}
                <div className={cn(
                    "w-72 shrink-0 bg-[#0f0f1a] overflow-hidden",
                    mobileTab !== "skills" ? "hidden lg:block" : "block flex-1"
                )}>
                    <SkillsPanel skills={skills} onToggle={toggleSkill} />
                </div>

                {/* Notifications — mobile tab */}
                {mobileTab === "notifs" && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 lg:hidden">
                        <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">Teavitused</h3>
                        {NOTIFICATIONS.map((n) => (
                            <div key={n.id} className={cn(
                                "flex gap-3 p-3 rounded-xl border transition-colors",
                                !n.read ? "border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.05)]" : "border-[#2d2d4e] bg-[#1a1a2e]"
                            )}>
                                <div className="mt-0.5 shrink-0"><NotifIcon type={n.type} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#e2e8f0]">{n.title}</p>
                                    <p className="text-xs text-[#94a3b8] mt-0.5">{n.body}</p>
                                    <p className="text-[10px] text-[#64748b] mt-1">{n.time} tagasi</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Mobile FAB ───────────────────────────────────────────────── */}
            <button
                className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#6366f1] text-white font-semibold text-sm shadow-[0_0_20px_rgba(99,102,241,0.50)] hover:bg-[#4f46e5] transition-colors"
                onClick={() => setMobileTab("chat")}
            >
                <Moon className="h-4 w-4" />
                Küsi Luunalt
            </button>

            {/* ── Mobile bottom nav ────────────────────────────────────────── */}
            <MobileBottomNav activeTab={mobileTab} setActiveTab={setMobileTab} />

            {/* Bottom nav spacer on mobile */}
            <div className="lg:hidden h-16 shrink-0" />
        </div>
    );
}
