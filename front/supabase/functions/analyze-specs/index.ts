import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentContent, teamMembers, sprintDuration = 2 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const teamDescription = teamMembers
      .map((m: { name: string; skills: string[] }) => `- ${m.name}: ${m.skills.join(", ")}`)
      .join("\n");

    const systemPrompt = `Tu es un expert Scrum Master et Product Owner. Tu analyses des cahiers des charges et tu génères des artefacts Scrum complets.

Tu dois TOUJOURS répondre en JSON valide avec exactement cette structure:
{
  "productBacklog": [
    {
      "id": "US-001",
      "title": "Titre de la user story",
      "description": "En tant que ... je veux ... afin de ...",
      "priority": "high" | "medium" | "low",
      "storyPoints": number,
      "acceptanceCriteria": ["critère 1", "critère 2"]
    }
  ],
  "sprints": [
    {
      "sprintNumber": 1,
      "goal": "Objectif du sprint",
      "duration": "2 semaines",
      "userStories": ["US-001", "US-002"],
      "tasks": [
        {
          "id": "T-001",
          "userStoryId": "US-001",
          "title": "Titre de la tâche",
          "description": "Description de la tâche",
          "assignedTo": "Nom du membre",
          "estimatedHours": number,
          "requiredSkills": ["skill1"]
        }
      ]
    }
  ],
  "summary": {
    "totalUserStories": number,
    "totalSprints": number,
    "totalTasks": number,
    "sprintDuration": "2 semaines"
  }
}

Équipe disponible:
${teamDescription}

Règles:
- Assigne les tâches selon les compétences de chaque membre
- Répartis la charge de travail équitablement
- Chaque sprint dure ${sprintDuration} semaine(s)
- Utilise des story points (1, 2, 3, 5, 8, 13)
- Génère entre 3 et 8 sprints selon la complexité
- Priorisation MoSCoW (Must, Should, Could, Won't)
- IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans markdown, sans backticks, sans texte avant ou après`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Voici le cahier des charges à analyser:\n\n${documentContent}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur lors de l'analyse" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Clean potential markdown wrapping
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erreur de format dans la réponse IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
