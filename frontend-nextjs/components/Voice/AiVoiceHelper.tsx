import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Bot,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { safeJson } from "@/lib/safe-fetch";

type HelperMode = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

const routeCommands = [
  { terms: ["kingpdf", "king pdf"], route: "/center/kingpdf", label: "KingPDF" },
  { terms: ["pdf", "orkester"], route: "/center/pdf-orchestrator", label: "PDF Orkester" },
  { terms: ["dokumendid", "documents"], route: "/documents", label: "Dokumendid" },
  { terms: ["agendid", "agents"], route: "/agents", label: "Agendid" },
  { terms: ["automatsioon", "automation"], route: "/automations", label: "Automatsioonid" },
  { terms: ["laenu", "loan"], route: "/laenu-haldur", label: "Laenu Haldur" },
  { terms: ["dashboard", "avaleht"], route: "/", label: "Avaleht" },
];

export function AiVoiceHelper() {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<HelperMode>("idle");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("Tere. Olen Annaatori häälassistent. Ütle näiteks: ava KingPDF, kontrolli KingPDF staatust või ava dokumendid.");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  const busy = mode === "thinking";

  const statusLabel = useMemo(() => {
    if (mode === "listening") return "Kuulan";
    if (mode === "thinking") return "Mõtlen";
    if (mode === "speaking") return "Räägin";
    return "Valmis";
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSpeechSupported("speechSynthesis" in window);
    setRecognitionSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || muted || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ""));
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("et")) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
      voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = preferredVoice?.lang || "et-EE";
    utterance.rate = 1;
    utterance.onstart = () => setMode("speaking");
    utterance.onend = () => setMode("idle");
    utterance.onerror = () => setMode("idle");
    window.speechSynthesis.speak(utterance);
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Browser speech recognition can throw if it is already stopped.
    }
    recognitionRef.current = null;
    setMode((current) => (current === "listening" ? "idle" : current));
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    setError(null);

    const Recognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!Recognition) {
      setError("Sinu brauser ei toeta kõnetuvastust. Chrome või Edge töötab kõige paremini.");
      return;
    }

    window.speechSynthesis?.cancel();
    stopListening();

    const recognition: SpeechRecognitionLike = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "et-EE";
    recognition.onstart = () => setMode("listening");
    recognition.onerror = (event: any) => {
      setError(event?.error ? `Mikrofoni viga: ${event.error}` : "Mikrofoni viga.");
      setMode("idle");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setMode((current) => (current === "listening" ? "idle" : current));
    };
    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const nextText = (finalText || interim).trim();
      setInput(nextText);

      if (finalText.trim()) {
        recognition.stop();
        void handleSubmit(finalText.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmit = async (rawText = input) => {
    const text = rawText.trim();
    if (!text || busy) return;

    setInput(text);
    setError(null);
    setMode("thinking");

    const lower = text.toLowerCase();
    const nextRoute = routeCommands.find((command) =>
      command.terms.some((term) => lower.includes(term)),
    );

    if (lower.includes("staatus") || lower.includes("status") || lower.includes("tervis")) {
      const result = await safeJson<{ status?: string; version?: string; service?: string }>(
        `${apiBase}/api/kingpdf/health`,
        {},
      );
      const message = result.ok
        ? `KingPDF backend vastab. Staatus: ${result.data.status || "unknown"}, versioon: ${result.data.version || "unknown"}.`
        : `Backend ei vasta praegu: ${result.error || "ühendus puudub"}.`;
      setReply(message);
      speak(message);
      return;
    }

    if (nextRoute) {
      await router.push(nextRoute.route);
      const message = `Avasin vaate: ${nextRoute.label}.`;
      setReply(message);
      speak(message);
      return;
    }

    const fallback =
      "Sain käsu kätte. Praegu oskan avada KingPDF, PDF Orkestri, dokumendid, agendid, automatsioonid ja kontrollida KingPDF staatust.";
    setReply(fallback);
    speak(fallback);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500 text-slate-950 shadow-[0_0_34px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400"
        aria-label="Ava Annaatori häälassistent"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <section className="fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Annaatori häälassistent</p>
            <p className="text-xs text-slate-500">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={() => setMuted((current) => !current)}
            title={muted ? "Luba hääl" : "Vaigista hääl"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={() => setOpen(false)}
            title="Sulge"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            Vastus
          </div>
          <p className="text-sm leading-6 text-slate-200">{reply}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Käsklus
          </span>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                void handleSubmit();
              }
            }}
            className="min-h-[86px] w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
            placeholder="Näiteks: ava KingPDF või kontrolli KingPDF staatust"
          />
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            onClick={() => void handleSubmit()}
            disabled={busy || !input.trim()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Saada
          </Button>
          <Button
            type="button"
            variant={mode === "listening" ? "destructive" : "outline"}
            className="shrink-0"
            onClick={mode === "listening" ? stopListening : startListening}
            disabled={!recognitionSupported}
            title={recognitionSupported ? "Kõnesisend" : "Kõnesisend pole selles brauseris saadaval"}
          >
            {mode === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span>Kõne: {speechSupported ? "sees" : "puudub"}</span>
          <span>Mikrofon: {recognitionSupported ? "valmis" : "puudub"}</span>
          <span>Ctrl+Enter saadab</span>
        </div>
      </div>
    </section>
  );
}
