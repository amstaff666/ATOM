import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    Play,
    Calendar,
    Settings,
    ChevronLeft,
    ChevronRight,
    Home,
    CreditCard,
    Layers,
    Zap,
    Bot,
    BarChart3,
    Sparkles,
    FileText,
    Shield,
    CheckCircle,
    Search,
    MessageSquare,
    CheckSquare,
    Store,
    Briefcase,
    Headphones,
    BookOpen,
    Radio,
    Workflow,
    Timer,
    GraduationCap,
    BrainCircuit,
    Factory,
    Music,
    Video,
    Wand2,
    Users,
    FileStack,
    Network,
    FileCog,
    Route,
    Database,
    KeyRound,
    Terminal,
    Gauge,
    GitBranch,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { FREE_EDITION_LABEL } from "../../lib/default-user";

interface SidebarProps {
    className?: string;
}

type SidebarItem = {
    label: string;
    icon: React.ElementType;
    path: string;
};

type SidebarCategory = {
    name: string;
    items: SidebarItem[];
};

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsMobile(true);
                setIsCollapsed(true);
            } else {
                setIsMobile(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const categories: SidebarCategory[] = [
        {
            name: "Core",
            items: [
                { label: "Avaleht", icon: Home, path: "/" },
                { label: "Vestlus", icon: MessageSquare, path: "/chat" },
                { label: "Otsing", icon: Search, path: "/search" },
                { label: "Dokumendid", icon: FileText, path: "/documents" },
                { label: "Ülesanded", icon: CheckSquare, path: "/tasks" },
                { label: "Automatsioonid", icon: Play, path: "/automations" },
                { label: "Agendid", icon: Bot, path: "/agents" },
                { label: "Marketplace", icon: Store, path: "/marketplace" },
            ]
        },
        {
            name: "AI juhtimine",
            items: [
                { label: "Peaagent", icon: BrainCircuit, path: "/center/master-agent" },
                { label: "Cron jobid", icon: Timer, path: "/center/cron-jobs" },
                { label: "Jobide järjekord", icon: Workflow, path: "/center/job-queue" },
                { label: "Agentide treening", icon: GraduationCap, path: "/center/agent-training" },
                { label: "Skill Factory", icon: Factory, path: "/center/skill-factory" },
                { label: "Agentide ladu", icon: Database, path: "/center/agent-registry" },
            ]
        },
        {
            name: "PDF Editor Orkester",
            items: [
                { label: "PDF Orkester", icon: FileCog, path: "/center/pdf-orchestrator" },
                { label: "PDF Editorid", icon: FileStack, path: "/center/pdf-editors" },
                { label: "PDF agendid", icon: Network, path: "/center/pdf-agents" },
                { label: "NexusPDF Alchemy", icon: Wand2, path: "/center/nexuspdf-alchemy" },
                { label: "OnePDF klient", icon: FileText, path: "/center/onepdf-client" },
                { label: ".agents tööruum", icon: Terminal, path: "/center/agents-workspace" },
            ]
        },
        {
            name: "Creator Studio",
            items: [
                { label: "Visual Flow PWA", icon: Route, path: "/center/visual-flow-pwa" },
                { label: "Aurora Multimedia", icon: Video, path: "/center/aurora-multimedia" },
                { label: "AI Multimedia Editor", icon: Wand2, path: "/center/ai-multimedia-editor" },
                { label: "AI Muusika", icon: Music, path: "/center/ai-muusika" },
                { label: "AI Influencer", icon: Users, path: "/center/ai-influencer" },
                { label: "Sisu kalender", icon: Calendar, path: "/center/content-calendar" },
            ]
        },
        {
            name: "Command Centers",
            items: [
                { label: "Projektid", icon: Briefcase, path: "/dashboards/projects" },
                { label: "Sales & CRM", icon: Zap, path: "/dashboards/sales" },
                { label: "Support", icon: Headphones, path: "/dashboards/support" },
                { label: "Knowledge", icon: BookOpen, path: "/dashboards/knowledge" },
                { label: "Communication", icon: Radio, path: "/dashboard/communication" },
            ]
        },
        {
            name: "Äri",
            items: [
                { label: "Laenu Haldur", icon: CreditCard, path: "/laenu-haldur" },
                { label: "Analüütika", icon: BarChart3, path: "/analytics" },
                { label: "Turundus", icon: Zap, path: "/marketing" },
                { label: "Finantsid", icon: CreditCard, path: "/finance" },
                { label: "Kalender", icon: Calendar, path: "/calendar" },
                { label: "Influencer CRM", icon: Users, path: "/center/influencer-crm" },
            ]
        },
        {
            name: "System",
            items: [
                { label: "Integratsioonid", icon: Layers, path: "/integrations" },
                { label: "API võtmed", icon: KeyRound, path: "/center/api-keys" },
                { label: "Tervis & logid", icon: Gauge, path: "/center/health-logs" },
                { label: "Deploy/Git", icon: GitBranch, path: "/center/deploy-git" },
                { label: "Seaded", icon: Settings, path: "/settings" },
                { label: "Ärifaktid", icon: CheckCircle, path: "/admin/business-facts" },
                { label: "JIT kontroll", icon: Shield, path: "/admin/jit-verification" },
            ]
        }
    ];

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div
            className={cn(
                "relative z-40 flex h-screen flex-col border-r border-slate-800/80 bg-[#0a0f1a]/95 shadow-[18px_0_60px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20" : "w-72",
                className
            )}
        >
            <div className="flex items-center justify-center h-16 border-b border-slate-800/80">
                <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center" : "px-6 w-full")}>
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                        A
                    </div>
                    {!isCollapsed && (
                        <span className="ml-3 font-bold text-xl tracking-tight text-slate-100">
                            Annaator
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-5 px-3">
                {categories.map((category) => (
                    <div key={category.name} className="space-y-1">
                        {!isCollapsed && (
                            <h3 className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2 ml-1">
                                {category.name}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {category.items.map((item) => {
                                const currentPath = router.asPath.split("?")[0];
                                const isActive = currentPath === item.path;

                                return (
                                    <Link key={item.path} href={item.path} passHref>
                                        <div
                                            className={cn(
                                                "relative flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
                                                isActive
                                                    ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                                                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100",
                                                isCollapsed ? "justify-center" : ""
                                            )}
                                            title={isCollapsed ? item.label : ""}
                                        >
                                            <item.icon
                                                className={cn(
                                                    "h-[18px] w-[18px] transition-all duration-300",
                                                    isActive
                                                        ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.55)] scale-110"
                                                        : "group-hover:text-slate-100 group-hover:scale-105"
                                                )}
                                            />
                                            {!isCollapsed && (
                                                <span className="ml-3 font-semibold text-[13px] truncate transition-colors">
                                                    {item.label}
                                                </span>
                                            )}

                                            {isCollapsed && isActive && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-300 rounded-l-full shadow-[0_0_10px_rgba(34,211,238,1)]" />
                                            )}

                                            {isActive && !isCollapsed && (
                                                <div className="absolute left-0 w-1 h-4 bg-cyan-300 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-slate-800/80 bg-slate-950/35 space-y-3">
                {!isCollapsed && (
                    <div className="flex items-center p-2 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white ring-2 ring-background border border-emerald-400/30">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-100 truncate">{FREE_EDITION_LABEL}</p>
                            <p className="text-[11px] text-slate-500 truncate">Kontot pole vaja</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    {isCollapsed && (
                        <div
                            className="mx-auto h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"
                            title={FREE_EDITION_LABEL}
                        >
                            <Sparkles className="h-5 w-5" />
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className={cn("text-muted-foreground hover:text-foreground hover:bg-secondary", isCollapsed ? "hidden" : "")}
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                    {isCollapsed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 mx-auto"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
