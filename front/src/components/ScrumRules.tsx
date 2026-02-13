import { Users, CalendarDays, ListOrdered, BarChart3, Info } from "lucide-react";

const rules = [
  { icon: Users, label: "Taille de l'équipe", desc: "3 à 9 développeurs maximum" },
  { icon: CalendarDays, label: "Sprint", desc: "Durée fixe de 1 à 4 semaines. Même durée pour tous les sprints." },
  { icon: ListOrdered, label: "Priorisation", desc: "MoSCoW (Must, Should, Could, Won't) par défaut" },
  { icon: BarChart3, label: "Estimation", desc: "Story Points (1, 2, 3, 5, 8, 13) par défaut" },
];

const ScrumRules = () => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
    <div className="flex items-center gap-2 text-primary">
      <Info className="w-5 h-5" />
      <h3 className="font-semibold text-sm">Règles Scrum à respecter</h3>
    </div>
    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.label} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <r.icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ScrumRules;
