import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GitHubCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      window.opener?.postMessage({ type: "github-auth-error", error: "No code received" }, "*");
      window.close();
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("github-auth", {
          body: { code },
        });

        if (error) throw error;

        window.opener?.postMessage(
          { type: "github-auth-success", ...data },
          "*"
        );
      } catch (err: any) {
        window.opener?.postMessage(
          { type: "github-auth-error", error: err.message },
          "*"
        );
      } finally {
        window.close();
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 glow-bg">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Connexion à GitHub en cours...</p>
    </div>
  );
};

export default GitHubCallback;
