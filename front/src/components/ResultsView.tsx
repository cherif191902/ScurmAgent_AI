import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  LayoutList,
  CalendarDays,
  CheckCircle2,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Github,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/services/scrumAPI";
import { supabase } from "@/integrations/supabase/client";
import type { ScrumResult } from "@/types/scrum";
import ThemeToggle from "@/components/ThemeToggle";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

interface Props {
  results: ScrumResult;
  onBack: () => void;
  handlefix: (
    selectedFixes: any[],
    oldDocument: string,
  ) => void | Promise<void>;
  oldDocument: string;
  enhancedSpec?: string | null;
  reanalyze: () => void | Promise<void>;
}

const ResultsView = ({
  results,
  onBack,
  handlefix,
  oldDocument,
  enhancedSpec,
  reanalyze,
}: Props) => {
  const { toast } = useToast();
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [expandedSprint, setExpandedSprint] = useState<number | null>(0);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("scrumagent-project");
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [boardResult, setBoardResult] = useState<{
    repoUrl: string;
    projectUrl: string;
  } | null>(null);
  const [showGithubPanel, setShowGithubPanel] = useState(false);
  const [selectedFixes, setSelectedFixes] = useState<Record<string, boolean>>(
    {},
  );
  const handleGithubConnect = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-auth?action=client-id`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
      );
      const { clientId } = await res.json();

      if (!clientId) {
        toast({
          title: "Erreur",
          description: "GitHub Client ID non configuré",
          variant: "destructive",
        });
        return;
      }

      const redirectUri = `${window.location.origin}/github-callback`;
      const scope = "repo,project";
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

      window.open(authUrl, "github-auth", "width=600,height=700,popup=yes");

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "github-auth-success") {
          setGithubToken(event.data.access_token);
          setGithubUser(event.data.username);
          toast({
            title: "GitHub connecté",
            description: `Connecté en tant que ${event.data.username}`,
          });
        } else if (event.data?.type === "github-auth-error") {
          toast({
            title: "Erreur GitHub",
            description: event.data.error,
            variant: "destructive",
          });
        }
        window.removeEventListener("message", handleMessage);
      };

      window.addEventListener("message", handleMessage);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateBoard = async () => {
    if (!githubToken || !repoName.trim()) return;
    setIsCreatingBoard(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "github-create-board",
        {
          body: {
            accessToken: githubToken,
            repoName: repoName.trim(),
            scrumResult: results,
          },
        },
      );
      console.log("GitHub Board Creation Result:", { data, error });
      if (error) throw error;
      setBoardResult({ repoUrl: data.repoUrl, projectUrl: data.projectUrl });
      toast({
        title: "Board créé !",
        description: `${data.issuesCreated} issues créées sur GitHub`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const toggleFix = (id: string) => {
    setSelectedFixes((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const selectedList = (() => {
    if (!results?.spec_fix_suggestions?.suggestions) return [] as any[];
    const list: any[] = [];
    results.spec_fix_suggestions.suggestions.forEach(
      (s: any, sIndex: number) => {
        s.fixes?.forEach((f: any) => {
          const key = `${sIndex}-${f.id}`;
          if (selectedFixes[key])
            list.push({ ...f, parentMessage: s.message, _key: key });
        });
      },
    );
    return list;
  })();
  console.log("Selected Fixes:", selectedList);
  return results?.spec_validation?.ok ? (
    <div className="min-h-screen glow-bg">
      <header className="border-b border-border/50 px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold gradient-text">ScrumAgent</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <LayoutList className="w-4 h-4" />{" "}
                {results.estimated_backlog.length} US
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />{" "}
                {results.sprint_backlogs.length} Sprints
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />{" "}
                {results.product_backlog[0].stories.length} Tâches
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* GitHub Integration Panel */}
        <div className="mb-6">
          {!showGithubPanel && !boardResult && (
            <Button
              onClick={() => setShowGithubPanel(true)}
              className="w-full sm:w-auto gap-2 bg-[hsl(0,0%,13%)] hover:bg-[hsl(0,0%,20%)] text-white dark:bg-[hsl(0,0%,90%)] dark:text-[hsl(0,0%,13%)] dark:hover:bg-[hsl(0,0%,80%)]"
              size="lg"
            >
              <Github className="w-5 h-5" />
              Créer un GitHub Project Board
            </Button>
          )}

          {showGithubPanel && !boardResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold">GitHub Project Board</h3>
                    <p className="text-sm text-muted-foreground">
                      Créez automatiquement un repo, des issues et un Project V2
                    </p>
                  </div>
                </div>
                {githubUser && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {githubUser}
                  </Badge>
                )}
              </div>

              {!githubToken ? (
                <Button
                  onClick={handleGithubConnect}
                  variant="outline"
                  className="gap-2"
                >
                  <Github className="w-4 h-4" />
                  Se connecter à GitHub
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Nom du repository
                    </label>
                    <Input
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="mon-projet-scrum"
                      className="max-w-sm bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Un nouveau repo sera créé sous github.com/{githubUser}/
                      {repoName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateBoard}
                      disabled={isCreatingBoard || !repoName.trim()}
                      className="gap-2"
                    >
                      {isCreatingBoard ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <Github className="w-4 h-4" />
                          Créer le board
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowGithubPanel(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {boardResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-success/30 bg-success/5 p-6 space-y-3"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold">
                  GitHub Board créé avec succès !
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={boardResult.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Github className="w-4 h-4" />
                    Voir le Repository
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
                <a
                  href={boardResult.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <LayoutList className="w-4 h-4" />
                    Voir le Project Board
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </div>

        <Tabs defaultValue="sprints">
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="backlog">Product Backlog</TabsTrigger>
            <TabsTrigger value="sprints">Sprints</TabsTrigger>
          </TabsList>

          {/* Backlog */}
          <TabsContent value="backlog">
            <div className="space-y-3">
              {results.product_backlog[0].stories.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-border bg-card p-4 flex items-start gap-4"
                >
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {story.id}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold">{story.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {story.description}
                    </p>
                    {story.acceptance_criteria.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Critères d'acceptation
                        </p>
                        {story.acceptance_criteria.map((c, j) => (
                          <p
                            key={j}
                            className="text-xs text-muted-foreground flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-success shrink-0" />
                            {c}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Sprints */}
          <TabsContent value="sprints">
            <div className="space-y-4">
              {results.sprint_backlogs.map((sprint, i) => (
                <motion.div
                  key={sprint.sprint}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() =>
                      setExpandedSprint(expandedSprint === i ? null : i)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                        {sprint.sprint}
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          Sprint {sprint.sprint}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {sprint.goal}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {sprint.items.length} tâches
                      </Badge>
                      {expandedSprint === i ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedSprint === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">
                          User Stories:
                        </p>
                        {sprint.items.map((storyId) => {
                          const task = results.product_backlog[0].stories.find(
                            (s) => s.id === storyId,
                          );
                          if (!task) return null;

                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                              <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                                {task.id}
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {task.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.as_a} — {task.i_want}
                                </p>
                              </div>

                              <Badge variant="secondary" className="text-xs">
                                {task.required_skills?.length} skills
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  ) : (
    <main className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-2">
          Suggestions de correction du cahier des charges
        </h3>

        {results?.spec_fix_suggestions?.ok ? (
          <div className="space-y-4">
            {selectedList.length > 0 && (
              <div className="mb-4 p-3 rounded-md bg-muted/10 border border-border/50">
                <p className="font-semibold">
                  Propositions sélectionnées ({selectedList.length})
                </p>
                <ul className="mt-2 list-disc ml-5 text-sm text-muted-foreground">
                  {selectedList.map((it: any) => (
                    <li key={it.id}>
                      <span className="font-medium">{it.title}</span>
                      {it.parentMessage && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {it.parentMessage}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {results.spec_fix_suggestions.suggestions.map(
              (s: any, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-border/50 bg-muted/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{s.message}</p>
                      {s.evidence && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.evidence}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {s.severity}
                    </Badge>
                  </div>
                  {s.fixes?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold mb-2">
                        Propositions :
                      </p>
                      <div className="space-y-2">
                        {s.fixes.map((f: any) => {
                          const key = `${i}-${f.id}`;
                          return (
                            <div
                              key={key}
                              className="p-3 rounded-md bg-muted/20 border border-border/30 flex items-start gap-3"
                            >
                              <input
                                type="checkbox"
                                aria-label={`Select suggestion ${key}`}
                                className="mt-1 w-4 h-4"
                                checked={!!selectedFixes[key]}
                                onChange={() => toggleFix(key)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{f.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {f.paragraph}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-xs mt-2 text-muted-foreground">
                    Code: {s.error_code}
                  </p>
                </div>
              ),
            )}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlefix(selectedList, oldDocument)}
                disabled={selectedList.length === 0}
              >
                Fix sélectionnés ({selectedList.length})
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune suggestion disponible.
          </p>
        )}
        {enhancedSpec && (
          <div className="mt-6 p-4 rounded-lg border border-border/40 bg-muted/10">
            <h4 className="font-semibold mb-2">Spec améliorée</h4>
            <div className="flex items-start gap-4">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground flex-1">
                {enhancedSpec}
              </pre>
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isReanalyzing}
                  onClick={reanalyze}
                >
                  Réanalyser avec la spec améliorée
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ResultsView;
