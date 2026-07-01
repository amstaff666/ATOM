import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useToast } from "@/components/ui/use-toast";
import AgentCard, { AgentInfo } from "@/components/Agents/AgentCard";
import AgentTerminal from "@/components/Agents/AgentTerminal";
import { MaturityProgression } from "@/components/Agents/MaturityProgression";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import ReasoningChainViewer from "@/components/ReasoningChainViewer";
import { AgentOrchestratorGrid } from "@/components/Agents/AgentOrchestratorGrid";
import { AiWorkbenchDashboard } from "@/components/workbench/AiWorkbenchDashboard";
import { safeJson } from "@/lib/safe-fetch";

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4490';

const AgentsDashboard = () => {
    const router = useRouter();
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Run Dialog State
    const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [runInstructions, setRunInstructions] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    
    // Reasoning Modal State
    const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);
    const [selectedReasoningId, setSelectedReasoningId] = useState<string | null>(null);

    // WebSocket Integration
    const { isConnected, lastMessage, subscribe } = useWebSocket({ autoConnect: false });

    useEffect(() => {
        if (isConnected) {
            subscribe("workspace:default");
        }
    }, [isConnected, subscribe]);

    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === "agent_step_update") {
                const { agent_id, step } = lastMessage.data || (lastMessage as any).step || lastMessage;
                if (agent_id === activeAgentId) {
                    const stepText = step.thought || step.output || JSON.stringify(step.action);
                    if (stepText) {
                        let prefix = "";
                        if (step.thought) prefix = "Thought: ";
                        else if (step.action) prefix = "Action: ";
                        else if (step.output) prefix = "Observation: ";

                        setLogs(prev => [...prev, `${prefix}${stepText}`]);
                        if (step.final_answer) {
                            setLogs(prev => [...prev, `Final Answer: ${step.final_answer}`]);
                        }
                    }
                }
            } else if (lastMessage.type === "agent_status_change") {
                const { agent_id, status, error } = lastMessage.data || lastMessage as any;
                if (agent_id === activeAgentId) {
                    setLogs(prev => [...prev, `Status Changed: ${status}${error ? ` - Error: ${error}` : ''}`]);
                    if (status === "success" || status === "failed") {
                        // Optionally clear active agent after delay or keep for logs
                    }
                }
                // Refresh list to update badges
                fetchAgents();
            }
        }
    }, [lastMessage, activeAgentId]);

    // Fetch Agents
    const fetchAgents = async () => {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            setError(null);
            const result = await safeJson<AgentInfo[]>(`${apiBase}/api/agents/`, [], { headers });

            if (result.ok && Array.isArray(result.data)) {
                setAgents(result.data);
            } else if (result.status === 401 || result.status === 403) {
                setError("Agente ei saanud laadida. Kontrolli, et backend töötab.");
                localStorage.removeItem('auth_token');
            } else {
                setError(result.error || "Agentide laadimine ebaõnnestus. Näitan orkestri lokaalse plaani.");
            }
        } catch (err: any) {
            console.error("Agents fetch error:", err);
            setError(`Agentide laadimine ebaõnnestus: ${err.message || String(err)}. Vaata detaile konsoolist.`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleRunAgent = (id: string) => {
        setSelectedAgentId(id);
        setRunInstructions("");
        setIsRunDialogOpen(true);
    };

    const executeAgentRun = async () => {
        if (!selectedAgentId) return;

        setIsRunning(true);
        setActiveAgentId(selectedAgentId);
        setLogs([`Käivitan agenti: ${selectedAgentId}...`, "Ühendan reaalaja vooga...", `Juhised: ${runInstructions || "Vaikekäitumine"}`]);

        try {
            const result = await safeJson<any>(`${apiBase}/api/agents/${selectedAgentId}/run/`, { detail: "Käivitamine pole lokaalselt ühendatud." }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                method: 'POST',
                body: JSON.stringify({
                    parameters: {
                        task_input: runInstructions // Pass user instructions to backend
                    }
                })
            });

            if (result.ok) {
                toast({
                    title: "Agent käivitati",
                    description: `Agent ${selectedAgentId} töötab nüüd sinu juhistega.`,
                    duration: 5000
                });
                setIsRunDialogOpen(false); // Close dialog on success
            } else {
                toast({ title: "Käivitamine ebaõnnestus", description: result.data?.detail || result.error, variant: "error" });
                setLogs(prev => [...prev, `Viga: ${result.data?.detail || result.error || 'Tundmatu viga'}`]);
            }
        } catch (e) {
            toast({ title: "Viga", description: "Võrguviga", variant: "error" });
        } finally {
            setIsRunning(false);
        }
    };

    const handleStopAgent = async (id: string) => {
        try {
            const result = await safeJson<any>(`${apiBase}/api/agents/${id}/stop`, { detail: "Peatamine pole lokaalselt ühendatud." }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                method: 'POST'
            });

            if (result.ok) {
                toast({ title: "Agent peatatud", description: `Agendi ${id} peatamine küsitud.` });
                setLogs(prev => [...prev, "Kasutaja küsis peatamist..."]);
                fetchAgents();
            } else {
                toast({ title: "Peatamine ebaõnnestus", description: result.data?.detail || result.error, variant: "error" });
            }
        } catch (e) {
            toast({ title: "Viga", description: "Võrguviga", variant: "error" });
        }
    };

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editAgentName, setEditAgentName] = useState("");
    const [editAgentDescription, setEditAgentDescription] = useState("");

    const handleChat = (id: string) => {
        router.push(`/chat?agent_id=${id}`);
    };

    const handleEdit = (id: string) => {
        const agent = agents.find(a => a.id === id);
        if (agent) {
            setSelectedAgentId(id);
            setEditAgentName(agent.name);
            setEditAgentDescription(agent.description);
            setIsEditDialogOpen(true);
        }
    };

    const handleViewReasoning = (id: string) => {
        setSelectedReasoningId(id);
        setIsReasoningModalOpen(true);
    };

    const handleStepFeedback = async (stepId: string, score: number, comment?: string) => {
        try {
            // Internal path for single-tenant feedback
            const result = await safeJson<any>(`${apiBase}/api/v1/agents/steps/feedback`, { detail: "Tagasiside endpoint pole lokaalselt ühendatud." }, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    step_id: stepId,
                    score: score,
                    feedback_text: comment
                })
            });

            if (result.ok) {
                toast({ title: "Tagasiside salvestatud", description: "Agent õpib sellest parandusest." });
            }
        } catch (e) {
            toast({ title: "Viga", description: "Tagasiside saatmine ebaõnnestus", variant: "error" });
        }
    };

    const saveAgentChanges = async () => {
        if (!selectedAgentId) return;

        try {
            const result = await safeJson<any>(`${apiBase}/api/agents/${selectedAgentId}`, { detail: "Uuendamine pole lokaalselt ühendatud." }, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    name: editAgentName,
                    description: editAgentDescription
                })
            });

            if (result.ok) {
                toast({ title: "Agent uuendatud", description: "Agendi detailid salvestati." });
                setIsEditDialogOpen(false);
                fetchAgents();
            } else {
                toast({ title: "Uuendamine ebaõnnestus", description: result.data?.detail || result.error || "Tundmatu viga", variant: "error" });
            }
        } catch (e) {
            toast({ title: "Viga", description: "Võrguviga", variant: "error" });
        }
    };

    const activeAgentName = agents.find(a => a.id === activeAgentId)?.name || "Terminal";
    const activeAgentStatus = agents.find(a => a.id === activeAgentId)?.status || "idle";
    const activeAgentMaturity = agents.find(a => a.id === activeAgentId)?.maturity_level || "student";

    return (
        <div className="min-h-screen bg-[#070b14] p-6 font-sans text-slate-100 lg:p-8">
            <Head>
                <title>Agendid | Annaator</title>
            </Head>

            <div className="mx-auto max-w-7xl space-y-8">

                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200">AI Center</Badge>
                        <Badge variant={isConnected ? "default" : "secondary"}>
                            {isConnected ? "Reaalajas" : "Lokaalne fallback"}
                        </Badge>
                    </div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-100">
                        <LayoutDashboard className="h-8 w-8 text-cyan-300" />
                        Agentide juhtimiskeskus
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">Jälgi ja orkestreeri autonoomseid tööagente, PDF agente ja töövoogude haldureid.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/center/agents-workspace")}>
                        Ava .agents tööruum
                    </Button>
                </div>

                <AgentOrchestratorGrid />
                <AiWorkbenchDashboard compact initialModuleId="master-agent" title="Agentide AI ehitusplaan" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Agent Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold text-slate-100">Saadaval agendid</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isLoading && agents.length === 0 && (
                                <div className="col-span-1 py-12 text-center text-slate-400 md:col-span-2">
                                    <p>Laadin agente...</p>
                                </div>
                            )}

                            {error && (
                                <div className="col-span-1 rounded border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100 md:col-span-2">
                                    {error}
                                </div>
                            )}

                            {!isLoading && !error && agents.length === 0 && (
                                <div className="col-span-1 rounded border border-dashed border-slate-700 bg-slate-900/70 py-12 text-center text-slate-400 md:col-span-2">
                                    <p>Agente ei leitud. Loo esimene agent või käivita mallist.</p>
                                </div>
                            )}

                            {Array.isArray(agents) && agents.map(agent => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onRun={handleRunAgent}
                                    onStop={handleStopAgent}
                                    onChat={handleChat}
                                    onEdit={handleEdit}
                                    onViewReasoning={handleViewReasoning}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Terminal Panel */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-100">Reaalaja logid</h2>
                            <Badge variant={isConnected ? "default" : "outline"} className={isConnected ? "bg-green-500" : ""}>
                                {isConnected ? "Reaalajas ühendus" : "Võrgust väljas"}
                            </Badge>
                        </div>
                        <MaturityProgression 
                            currentLevel={activeAgentMaturity} 
                            className="mb-4"
                        />
                        <AgentTerminal
                            agentName={activeAgentName}
                            logs={logs}
                            status={activeAgentStatus}
                            activeTools={['outlook', 'zoho', 'whatsapp', 'excel']} // For Demo
                        />

                        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
                            <h3 className="mb-2 text-sm font-semibold text-slate-100">Süsteemi võimekus</h3>
                            <div className="rounded border border-blue-400/20 bg-blue-400/10 p-2 text-xs text-blue-100">
                                WebSocketi voog on valikuline. Kui teenus pole ühendatud, jääb UI lokaalse fallbackiga töökorda.
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Run Agent Dialog */}
            <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Käivita agent</DialogTitle>
                        <DialogDescription>
                            Anna sellele agendile täpsed juhised. Vaikekäitumiseks jäta väli tühjaks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Textarea
                            placeholder="Nt kontrolli kliendi dokumendid ja too puudused välja..."
                            value={runInstructions}
                            onChange={(e) => setRunInstructions(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRunDialogOpen(false)}>
                            Tühista
                        </Button>
                        <Button onClick={executeAgentRun} disabled={isRunning}>
                            {isRunning ? "Käivitan..." : "Käivita agent"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Agent Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Muuda agenti</DialogTitle>
                        <DialogDescription>
                            Uuenda agendi detaile.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nimi</Label>
                            <Input
                                id="name"
                                value={editAgentName}
                                onChange={(e) => setEditAgentName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Kirjeldus</Label>
                            <Textarea
                                id="description"
                                value={editAgentDescription}
                                onChange={(e) => setEditAgentDescription(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Tühista
                        </Button>
                        <Button onClick={saveAgentChanges}>
                            Salvesta muudatused
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Reasoning Viewer Dialog */}
            <Dialog open={isReasoningModalOpen} onOpenChange={setIsReasoningModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            Agendi mõttekäigu audit: {agents.find(a => a.id === selectedReasoningId)?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Vaata agendi sisemist mõttekäiku ja lisa parandusi täpsuse tõstmiseks.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReasoningId && (
                        <div className="py-2">
                            <ReasoningChainViewer 
                                chainId={selectedReasoningId} 
                                onStepFeedback={handleStepFeedback}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsReasoningModalOpen(false)}>Sulge</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default AgentsDashboard;
