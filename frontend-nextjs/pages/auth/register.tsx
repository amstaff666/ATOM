"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { APP_NAME } from "../../lib/default-user";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName]         = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");
    const [showPw, setShowPw]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [success, setSuccess]   = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Paroolid ei kattu.");
            return;
        }
        if (password.length < 8) {
            setError("Parool peab olema vähemalt 8 tähemärki.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.detail || data.message || "Registreerimine ebaõnnestus.");
            } else {
                setSuccess(true);
                setTimeout(() => router.push("/auth/login"), 2000);
            }
        } catch {
            setError("Serveriga ühenduse viga. Proovi uuesti.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head><title>Registreeru — {APP_NAME}</title></Head>
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                            R
                        </div>
                        <span className="font-bold text-2xl text-foreground">{APP_NAME}</span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                        <h1 className="text-xl font-bold text-foreground mb-1">Loo konto</h1>
                        <p className="text-sm text-muted-foreground mb-6">Registreeru {APP_NAME} kasutajaks</p>

                        {error && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />{error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                                <CheckCircle className="h-4 w-4 shrink-0" />Konto loodud! Suunan sisselogimislehele…
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Täisnimi</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Eesnimi Perekonnanimi"
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">E-post</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="sinu@ettevõte.ee"
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Parool</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="Vähemalt 8 tähemärki"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Korda parooli</label>
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || success}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                            >
                                {loading ? (
                                    <span className="h-4 w-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}
                                {loading ? "Registreerimine…" : "Registreeru"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            On juba konto?{" "}
                            <Link href="/auth/login" className="text-primary hover:underline font-medium">Logi sisse</Link>
                        </p>
                    </div>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        <Link href="/" className="hover:underline">← Tagasi avalehele</Link>
                    </p>
                </div>
            </div>
        </>
    );
}

RegisterPage.getLayout = (page: React.ReactNode) => page;
