"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
    Users, ShieldCheck, Trash2, Ban, RefreshCw,
    CheckCircle, AlertCircle, Search, ChevronDown,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "blocked" | "pending";
    created_at: string;
    last_login_at?: string;
}

type FilterStatus = "kõik" | "active" | "blocked" | "pending";

export default function AdminPanelPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers]       = useState<AdminUser[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState("");
    const [search, setSearch]     = useState("");
    const [filter, setFilter]     = useState<FilterStatus>("kõik");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Kaitse — ainult admin pääseb ligi
    useEffect(() => {
        if (status === "loading") return;
        if (!session || (session.user as any)?.role !== "super_admin") {
            router.push("/");
        }
    }, [session, status, router]);

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/users", {
                headers: { Authorization: `Bearer ${(session as any)?.backendToken}` },
            });
            if (!res.ok) throw new Error("Kasutajate laadimine ebaõnnestus");
            const data = await res.json();
            setUsers(data.users || data || []);
        } catch (e: any) {
            setError(e.message);
            // Demo data kui API pole saadaval
            setUsers([
                { id: "1", name: "Demo Admin", email: "admin@restart-crm.ee", role: "super_admin", status: "active", created_at: new Date().toISOString() },
                { id: "2", name: "Test Kasutaja", email: "test@restart-crm.ee", role: "user", status: "active", created_at: new Date().toISOString() },
                { id: "3", name: "Blokeeritud", email: "blocked@example.ee", role: "user", status: "blocked", created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchUsers();
    }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateUserStatus = async (userId: string, newStatus: "active" | "blocked") => {
        setActionLoading(userId);
        try {
            await fetch(`/api/admin/users/${userId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${(session as any)?.backendToken}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
        } catch {
            // lokaalne uuendus fallback
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (userId: string, name: string) => {
        if (!confirm(`Kustuta kasutaja "${name}"? See toiming on pöördumatu.`)) return;
        setActionLoading(userId);
        try {
            await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${(session as any)?.backendToken}` },
            });
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = users.filter((u) => {
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                            u.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "kõik" || u.status === filter;
        return matchSearch && matchFilter;
    });

    const stats = {
        total:   users.length,
        active:  users.filter((u) => u.status === "active").length,
        blocked: users.filter((u) => u.status === "blocked").length,
        admins:  users.filter((u) => u.role === "super_admin").length,
    };

    if (status === "loading") return null;

    return (
        <>
            <Head><title>Admin paneel — Restart-CRM</title></Head>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Admin paneel</h1>
                            <p className="text-xs text-muted-foreground">Kasutajate haldus ja süsteemi seaded</p>
                        </div>
                    </div>
                    <button onClick={fetchUsers} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Värskenda
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Kasutajaid kokku", value: stats.total,   color: "text-blue-400" },
                        { label: "Aktiivsed",         value: stats.active,  color: "text-emerald-400" },
                        { label: "Blokeeritud",       value: stats.blocked, color: "text-red-400" },
                        { label: "Adminid",           value: stats.admins,  color: "text-purple-400" },
                    ].map((s) => (
                        <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Search + filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Otsi kasutajat nime või e-posti järgi…"
                            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterStatus)}
                            className="appearance-none bg-card border border-border rounded-lg px-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        >
                            <option value="kõik">Kõik staatused</option>
                            <option value="active">Aktiivsed</option>
                            <option value="blocked">Blokeeritud</option>
                            <option value="pending">Ootel</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error} — Kuvatakse demoandmed.
                    </div>
                )}

                {/* Users table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30 text-muted-foreground text-xs">
                                <th className="text-left px-4 py-3">Kasutaja</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Roll</th>
                                <th className="text-left px-4 py-3">Staatus</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">Loodud</th>
                                <th className="text-right px-4 py-3">Tegevused</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                                        Laadin kasutajaid…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        Kasutajaid ei leitud
                                    </td>
                                </tr>
                            ) : filtered.map((user) => (
                                <tr key={user.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-blue-600/40 flex items-center justify-center text-xs font-bold text-primary">
                                                {user.name?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className={cn("text-xs font-semibold",
                                            user.role === "super_admin" ? "text-purple-400" : "text-muted-foreground")}>
                                            {user.role === "super_admin" ? "Admin" : "Kasutaja"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border",
                                            user.status === "active"  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                            user.status === "blocked" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                            "bg-amber-500/10 border-amber-500/20 text-amber-400")}>
                                            {user.status === "active" ? "Aktiivne" : user.status === "blocked" ? "Blokeeritud" : "Ootel"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                                        {new Date(user.created_at).toLocaleDateString("et-EE")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {user.status === "active" ? (
                                                <button
                                                    onClick={() => updateUserStatus(user.id, "blocked")}
                                                    disabled={actionLoading === user.id}
                                                    title="Blokeeri"
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updateUserStatus(user.id, "active")}
                                                    disabled={actionLoading === user.id}
                                                    title="Aktiveeri"
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteUser(user.id, user.name)}
                                                disabled={actionLoading === user.id || user.email === session?.user?.email}
                                                title="Kustuta"
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
