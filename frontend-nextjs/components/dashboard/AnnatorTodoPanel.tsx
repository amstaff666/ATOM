import React from "react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { annatorTodo } from "../../data/annatorTodo";

export const AnnatorTodoPanel: React.FC = () => {
  const total = annatorTodo.reduce((sum, section) => sum + section.items.length, 0);
  const completed = annatorTodo.reduce(
    (sum, section) => sum + section.items.filter((item) => item.done).length,
    0,
  );

  return (
    <Card className="border-cyan-500/30 bg-slate-900/80">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5 text-cyan-400" />
              Annatori tööplaan
            </CardTitle>
            <CardDescription className="mt-1">
              Ühine TODO nimekiri. Tööd tehakse järjekorras; aktiivne prioriteet on punkt 1.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{completed}/{total} valmis</Badge>
            <Badge>Prioriteet #1</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {annatorTodo.map((section) => {
            const sectionDone = section.items.filter((item) => item.done).length;
            const active = section.id === 1;

            return (
              <div
                key={section.id}
                className={`rounded-lg border p-4 ${
                  active
                    ? "border-cyan-400/50 bg-cyan-950/20"
                    : "border-slate-800 bg-slate-950/30"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                        {section.id}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100">{section.title}</h3>
                    </div>
                    {active && (
                      <p className="ml-8 mt-1 text-xs font-medium text-cyan-300">TEGEMISEL PRAEGU</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {sectionDone}/{section.items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                      )}
                      <span className={item.done ? "text-slate-500 line-through" : "text-slate-300"}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnatorTodoPanel;
