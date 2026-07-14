"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { APP_NAME } from "../../lib/default-user";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (res?.error) {
                setError("Vale e-post või parool. Proovi uuesti.");
            } else {
                router.push("/");
            }
        } catch {
            setError("Sisselogimisel tekkis viga. Proovi uuesti.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head><title>Logi sisse — {APP_NAME}</title></Head>
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                            R
                        </div>
                        <span className="font-bold text-2xl text-foreground">{APP_NAME}</span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                        <h1 className="text-xl font-bold text-foreground mb-1">Tere tulemast tagasi</h1>
                        <p className="text-sm text-muted-foreground mb-6">Logi sisse oma kontoga</p>

                        {error && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-medium text-foreground">Parool</label>
                                    <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                                        Unustasid parooli?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                            >
                                {loading ? (
                                    <span className="h-4 w-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                {loading ? "Sisselogimine…" : "Logi sisse"}
                            </button>
                        </form>

                        {/* OAuth */}
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">või</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                            <button
                                onClick={() => signIn("google", { callbackUrl: "/" })}
                                className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Jätka Google'iga
                            </button>
                        </div>

                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            Pole kontot?{" "}
                            <Link href="/auth/register" className="text-primary hover:underline font-medium">
                                Registreeru
                            </Link>
                        </p>
                    </div>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        <Link href="/" className="hover:underline">← Tagasi avalehele (ilma kontota)</Link>
                    </p>
                </div>
            </div>
        </>
    );
}

// Override layout — auth lehtedel pole sidebar vaja
LoginPage.getLayout = (page: React.ReactNode) => page;
