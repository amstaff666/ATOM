import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Sparkles, Zap, Bot, Lightbulb, ArrowRight } from "lucide-react";

type AiPromptBarProps = {
  onGeneratePlan?: (prompt: string) => void;
  onBuildModule?: (prompt: string) => void;
  onAskAi?: (prompt: string) => void;
};

export const AiPromptBar: React.FC<AiPromptBarProps> = ({
  onGeneratePlan,
  onBuildModule,
  onAskAi,
}) => {
  const [prompt, setPrompt] = useState("");

  return (
    <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">AI assistent</span>
            <Badge variant="secondary" className="text-xs">Lokaalne</Badge>
          </div>

          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Kirjelda, mida tahad ehitada... nt: loo PDF editor, mis teeb laenutaotluse pÃµhja, loeb pangavÃ¤ljavÃµtteid ja mÃ¤rgib puuduvad dokumendid"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-cyan-300 border-cyan-400/20 hover:bg-cyan-400/10"
              onClick={() => onGeneratePlan?.(prompt)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Generate plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-purple-300 border-purple-400/20 hover:bg-purple-400/10"
              onClick={() => onBuildModule?.(prompt)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Build module
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-300 border-emerald-400/20 hover:bg-emerald-400/10"
              onClick={() => onAskAi?.(prompt)}
            >
              <Bot className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiPromptBar;
