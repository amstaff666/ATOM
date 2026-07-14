"use client";
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft, Palette } from "lucide-react";
import React from "react";

export default function DesignStudioPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>DesignFlow AI — Restart-CRM</title>
      </Head>
      <div className="fixed inset-0 z-50 flex flex-col bg-[#171614]">
        {/* Mini header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#1c1b19] border-b border-[#393836] shrink-0 z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-[#797876] hover:text-[#cdccca] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tagasi
          </button>
          <div className="w-px h-4 bg-[#393836]" />
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#4f98a3]" />
            <span className="text-sm font-semibold text-[#cdccca]">DesignFlow AI</span>
            <span className="text-xs text-[#5a5957]">— Tootekirjeldusest UI-ni minutitega</span>
          </div>
        </div>
        {/* Full app iframe */}
        <iframe
          src="/design-studio/index.html"
          className="flex-1 w-full border-0"
          title="DesignFlow AI"
          allow="clipboard-write"
        />
      </div>
    </>
  );
}

// Override layout — DesignFlow AI on fullscreen, sidebar pole vaja
DesignStudioPage.getLayout = (page: React.ReactNode) => page;
