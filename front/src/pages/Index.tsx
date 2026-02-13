import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Users,
  Zap,
  FileText,
  Plus,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { authFetch } from "@/services/scrumAPI";
import type { TeamMember, ScrumResult } from "@/types/scrum";
import ResultsView from "@/components/ResultsView";
import ThemeToggle from "@/components/ThemeToggle";
import ScrumRules from "@/components/ScrumRules";
import DocumentRequirements from "@/components/DocumentRequirements";
import { spec } from "node:test/reporters";

const SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Java",
  "DevOps",
  "UI/UX",
  "Backend",
  "Frontend",
  "Base de données",
  "API REST",
  "Tests",
  "Sécurité",
  "Mobile",
  "Cloud",
  "Docker",
  "CI/CD",
];

const SPRINT_LABELS: Record<number, string> = {
  1: "1 sem.",
  2: "2 sem.",
  3: "3 sem.",
  4: "4 sem.",
};

const Index = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | "loading" | "results">(1);
  const [documentContent, setDocumentContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", name: "", skills: [] },
    { id: "2", name: "", skills: [] },
    { id: "3", name: "", skills: [] },
  ]);
  const [sprintDuration, setSprintDuration] = useState(2);
  const [results, setResults] = useState<ScrumResult | null>(null);
  const [enhancedSpec, setEnhancedSpec] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState<Record<string, string>>({});
  const [skipAnalysis, setSkipAnalysis] = useState(false);
  const isStep1Valid = documentContent.trim().length >= 50;
  const validMembers = teamMembers.filter(
    (m) => m.name.trim() && m.skills.length > 0,
  );
  console.log(skipAnalysis);
  const isStep2Valid =
    validMembers.length >= 3 &&
    teamMembers.length >= 3 &&
    teamMembers.length <= 9;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setDocumentContent(text);
    toast({ title: "Fichier chargé", description: file.name });
  };

  const addMember = () => {
    if (teamMembers.length >= 9) {
      toast({
        title: "Maximum atteint",
        description: "9 membres maximum",
        variant: "destructive",
      });
      return;
    }
    setTeamMembers((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", skills: [] },
    ]);
  };

  const removeMember = (id: string) => {
    if (teamMembers.length <= 3) {
      toast({
        title: "Minimum requis",
        description: "3 membres minimum",
        variant: "destructive",
      });
      return;
    }
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMemberName = (id: string, name: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m)),
    );
  };

  const addSkill = (memberId: string, skill: string) => {
    if (!skill.trim()) return;
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId && !m.skills.includes(skill)
          ? { ...m, skills: [...m.skills, skill] }
          : m,
      ),
    );
    setNewSkill((prev) => ({ ...prev, [memberId]: "" }));
  };

  const removeSkill = (memberId: string, skill: string) => {
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, skills: m.skills.filter((s) => s !== skill) }
          : m,
      ),
    );
  };

  const handleAnalyze = async () => {
    setStep("loading");
    try {
      const payload = {
        documentContent,
        teamMembers: validMembers,
        sprintDuration,
        skipAnalysis,
      };
      const res = await authFetch("/api/scrum/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResults(res.plan || res);
      setStep("results");
      console.log("Analysis results:", res);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: err?.error || err?.message || "Échec de l'analyse",
        variant: "destructive",
      });
      setStep(3);
    }
  };
  const handleReanalyze = async (skip: boolean = false) => {
    setStep("loading");
    try {
      const payload = {
        documentContent: enhancedSpec,
        teamMembers: validMembers,
        sprintDuration,
        skipAnalysis: skip,
      };

      const res = await authFetch("/api/scrum/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResults(res.plan || res);
      setStep("results");
      console.log("Analysis results:", res);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: err?.error || err?.message || "Échec de l'analyse",
        variant: "destructive",
      });
      setEnhancedSpec("");

      setStep(3);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  const handlefix = async (selectedFixes: any[], originalDocument: string) => {
    if (!selectedFixes || selectedFixes.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Sélectionnez au moins une proposition.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = {
        fixes: selectedFixes,
        originalDocument,
      };
      const res = await authFetch("/api/scrum/fix", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("Fix response:", res);
      if (res?.spec_enhanced) setEnhancedSpec(res.spec_enhanced);
      toast({
        title: "Envoi réussi",
        description:
          res?.message || "Les propositions ont été envoyées au backend.",
      });
      console.log(res);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description:
          err?.error ||
          err?.message ||
          "Échec lors de l'envoi des corrections.",
        variant: "destructive",
      });
    }
  };
  if (step === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 glow-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
        <p className="text-lg text-muted-foreground">
          L'IA analyse votre cahier des charges...
        </p>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "60%" }}
          transition={{ duration: 15 }}
          className="h-1 bg-primary/30 rounded-full max-w-md"
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 15 }}
          />
        </motion.div>
      </div>
    );
  }

  if (step === "results" && results) {
    return (
      <ResultsView
        results={results}
        onBack={() => setStep(1)}
        handlefix={handlefix}
        oldDocument={documentContent}
        enhancedSpec={enhancedSpec}
        reanalyze={handleReanalyze}
      />
    );
  }

  return (
    <div className="min-h-screen glow-bg">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">ScrumAgent</h1>
              <p className="text-xs text-muted-foreground">IA Scrum Planning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="container mx-auto px-6 pt-6 max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : typeof step === "number" && s < step
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${typeof step === "number" && s < step ? "bg-primary/40" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-6 pb-10 max-w-5xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: Document */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="text-center lg:text-left space-y-2">
                  <h2 className="text-2xl font-bold">Cahier des charges</h2>
                  <p className="text-sm text-muted-foreground">
                    Uploadez ou saisissez manuellement votre cahier des charges.
                  </p>
                </div>

                <DocumentRequirements />

                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Document</h3>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {fileName ||
                        "Cliquez pour uploader un fichier (.txt, .md)"}
                    </span>
                    <input
                      type="file"
                      accept=".txt,.md,.text"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      ou collez le contenu
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <Textarea
                    placeholder="Collez le contenu de votre cahier des charges ici..."
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    rows={8}
                    className="bg-muted/50 border-border resize-none font-mono text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      id="skipAnalysis"
                      type="checkbox"
                      checked={skipAnalysis}
                      onChange={(e) => setSkipAnalysis(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="skipAnalysis"
                      className="text-sm text-muted-foreground"
                    >
                      Ignorer l'analyse
                    </label>
                  </div>
                  {documentContent.length > 0 &&
                    documentContent.length < 50 && (
                      <p className="text-xs text-destructive">
                        Le contenu doit contenir au moins 50 caractères.
                      </p>
                    )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="glow-border"
                  >
                    Suivant <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <ScrumRules />
              </div>
            </motion.div>
          )}

          {/* STEP 2: Team */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  Configuration de l'équipe
                </h2>
                <p className="text-sm text-muted-foreground">
                  De 3 à 9 membres. Ajoutez un nom et des compétences à chaque
                  membre.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">
                      Équipe ({teamMembers.length}/9)
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addMember}
                    disabled={teamMembers.length >= 9}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>

                <AnimatePresence>
                  {teamMembers.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <Input
                          placeholder="Nom du membre"
                          value={member.name}
                          onChange={(e) =>
                            updateMemberName(member.id, e.target.value)
                          }
                          className="flex-1 bg-background/50"
                        />
                        {teamMembers.length > 3 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMember(member.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Compétences
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {member.skills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive/20 transition-colors"
                              onClick={() => removeSkill(member.id, skill)}
                            >
                              {skill} <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajouter une compétence..."
                            value={newSkill[member.id] || ""}
                            onChange={(e) =>
                              setNewSkill((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSkill(member.id, newSkill[member.id] || "");
                              }
                            }}
                            className="flex-1 bg-background/50 text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SKILL_SUGGESTIONS.filter(
                            (s) => !member.skills.includes(s),
                          )
                            .slice(0, 8)
                            .map((skill) => (
                              <button
                                key={skill}
                                onClick={() => addSkill(member.id, skill)}
                                className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                              >
                                + {skill}
                              </button>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!isStep2Valid && (
                  <p className="text-xs text-destructive">
                    Au moins 3 membres avec nom et compétences sont requis.
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  className="glow-border"
                >
                  Suivant <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Sprint Duration + Generate */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Durée du Sprint</h2>
                <p className="text-sm text-muted-foreground">
                  Fixe pour tout le projet (optionnel, 2 semaines par défaut)
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Durée du Sprint</p>
                    <p className="text-sm text-muted-foreground">
                      Fixe pour tout le projet • Actuellement :{" "}
                      <span className="text-primary font-semibold">
                        {sprintDuration} semaine{sprintDuration > 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 px-2">
                  <Slider
                    value={[sprintDuration]}
                    onValueChange={(v) => setSprintDuration(v[0])}
                    min={1}
                    max={4}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {[1, 2, 3, 4].map((v) => (
                      <span
                        key={v}
                        className={
                          sprintDuration === v
                            ? "text-primary font-semibold"
                            : ""
                        }
                      >
                        {SPRINT_LABELS[v]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <Button
                  size="lg"
                  onClick={handleAnalyze}
                  className="px-8 py-6 text-base font-semibold glow-border"
                >
                  <Zap className="w-5 h-5 mr-2" /> Générer le plan
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
