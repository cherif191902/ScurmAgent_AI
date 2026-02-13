import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  login as apiLogin,
  register as apiRegister,
} from "@/services/scrumAPI";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin(loginEmail, loginPassword);
      setLoading(false);
      if (!res.success) {
        toast({
          title: "Erreur",
          description:
            typeof res.error === "string"
              ? res.error
              : JSON.stringify(res.error),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Connecté avec succès.",
      });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Erreur",
        description: err?.message || JSON.stringify(err) || "Login failed",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre nom",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRegister(signupName, signupEmail, signupPassword);
      setLoading(false);
      if (!res.success) {
        toast({
          title: "Erreur",
          description:
            typeof res.error === "string"
              ? res.error
              : JSON.stringify(res.error),
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // After successful registration, auto-login
      const loginRes = await apiLogin(signupEmail, signupPassword);
      if (!loginRes.success) {
        toast({
          title: "Inscription réussie",
          description:
            "Compte créé mais connexion automatique a échoué. Veuillez vous connecter.",
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Inscription et connexion réussies.",
      });
      navigate("/", { replace: true });
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Erreur",
        description:
          err?.message || JSON.stringify(err) || "Registration failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen glow-bg flex flex-col">
      <header className="px-6 py-4 flex justify-end">
        <ThemeToggle />
      </header>
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">ScrumAgent</h1>
            <p className="text-muted-foreground text-sm">IA Scrum Planning</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <Tabs defaultValue="login">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="login" className="flex-1">
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    placeholder="Email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Mot de passe"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Chargement..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <Input
                    placeholder="Nom d'utilisateur"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Mot de passe"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Chargement..." : "S'inscrire"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
