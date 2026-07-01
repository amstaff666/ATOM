import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Sparkles, Plus, ArrowRight } from "lucide-react";

const defaultRecommendations = [
  "Lisa pangaväljavõtte parser",
  "Ühenda dokumendi check-list Neon case'iga",
  "Lisa riskianalüüsi kokkuvõtte PDF",
  "Lisa kliendile puuduvate dokumentide raport",
  "Lisa haldurile kontrollnimekiri",
];

type AiRecommendationPanelProps = {
  recommendations?: string[];
  onAddRecommendation?: (rec: string) => void;
};

export const AiRecommendationPanel: React.FC<AiRecommendationPanelProps> = ({
  recommendations = defaultRecommendations,
  onAddRecommendation,
}) => {
  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-purple-400" />
          AI soovitused
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 p-3 hover:border-purple-400/30 transition-colors"
          >
            <span className="text-sm text-slate-300">{rec}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-purple-200 shrink-0"
              onClick={() => onAddRecommendation?.(rec)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" className="w-full mt-2 text-purple-300 border-purple-400/20 hover:bg-purple-400/10">
          <Sparkles className="h-4 w-4 mr-2" />
          Genereeri rohkem
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default AiRecommendationPanel;
