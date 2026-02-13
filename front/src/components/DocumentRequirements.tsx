import { FileCheck } from "lucide-react";

const requirements = [
  "Description du projet",
  "Objectifs",
  "Fonctionnalités principales",
  "Contraintes ou exigences",
  "Planning ou délais",
];

const DocumentRequirements = () => (
  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
    <div className="flex items-center gap-2 text-sm font-medium">
      <FileCheck className="w-4 h-4 text-primary" />
      Un cahier des charges doit contenir au moins :
    </div>
    <ul className="space-y-1 ml-6">
      {requirements.map((r) => (
        <li key={r} className="text-xs text-muted-foreground list-disc">{r}</li>
      ))}
    </ul>
  </div>
);

export default DocumentRequirements;
