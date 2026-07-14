"use client";

import { useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";
import { APP_NAME } from "../../lib/default-user";

export default function ForgotPasswordPage() {
    const [email, setEmail]     = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [sent, setSent]       = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.detail || "Viga e-kirja saatmisel.");
            } else {
                setSent(true);
            }
        } catch {
            setError("Serveriga ühenduse viga.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head><title>Unustasid parooli — {APP_NAME}</title></Head>
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]">R</div>
                        <span className="font-bold text-2xl text-foreground">{APP_NAME}</span>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                        <h1 className="text-xl font-bold text-foreground mb-1">Lähtesta parool</h1>
                        <p className="text-sm text-muted-foreground mb-6">Sisesta oma e-posti aadress ja saadame sulle parooli lähtestamise lingi.</p>

                        {error && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />{error}
                            </div>
                        )}
                        {sent ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <CheckCircle className="h-10 w-10 text-emerald-500" />
                                <p className="text-sm text-foreground font-semibold text-center">E-kiri saadetud!</p>
                                <p className="text-xs text-muted-foreground text-center">Kontrolli oma postkasti aadressil <strong>{email}</strong>.</p>
                                <Link href="/auth/login" className="mt-2 text-sm text-primary hover:underline">← Tagasi sisselogimisele</Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">E-post</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="sinu@ettevõte.ee"
                                            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                                >
                                    {loading && <span className="h-4 w-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />}
                                    {loading ? "Saatmine…" : "Saada lähtestamislink"}
                                </button>
                                <p className="text-center text-sm text-muted-foreground">
                                    <Link href="/auth/login" className="text-primary hover:underline">← Tagasi sisselogimisele</Link>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

ForgotPasswordPage.getLayout = (page: React.ReactNode) => page;
