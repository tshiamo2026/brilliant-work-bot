// AI Workplace Productivity Assistant - unified AI endpoint
// Handles: email, summary, planner, research, chat
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Feature = "email" | "summary" | "planner" | "research" | "chat";

const SYSTEM_PROMPTS: Record<Feature, string> = {
  email: `You are an expert business communication assistant. Generate a clear, well-structured email based on the user's request.
- Adapt strictly to the requested tone and audience.
- Include a strong subject line, a concise greeting, body with clear paragraphs, and a professional sign-off.
- Be concise. No filler. No emojis unless the tone is casual.
- Output in plain Markdown with this structure exactly:

**Subject:** <subject line>

<email body>

---
*AI-generated content may require human review.*`,

  summary: `You are an expert meeting notes summarizer. Given raw meeting notes or a transcript, produce a structured summary.
Output strictly in Markdown using these sections:

### Executive Summary
A 2-3 sentence overview.

### Key Discussion Points
- bullet list

### Decisions Made
- bullet list (write "None recorded" if none)

### Action Items
| Owner | Action | Deadline |
|---|---|---|

### Open Questions / Risks
- bullet list

---
*AI-generated content may require human review.*`,

  planner: `You are an AI task planner and prioritization expert. Given a list of tasks or goals, produce a prioritized, scheduled plan.
Use the Eisenhower matrix (urgency × importance) and time-blocking principles.
Output strictly in Markdown:

### Prioritized Plan
| # | Task | Priority | Estimated Time | Suggested Slot |
|---|---|---|---|---|

Priority must be one of: P1 (urgent+important), P2 (important), P3 (urgent), P4 (later).

### Recommended Schedule (Today)
- **Morning (9–12):** ...
- **Afternoon (1–5):** ...

### Notes & Rationale
Brief reasoning for the prioritization.

---
*AI-generated content may require human review.*`,

  research: `You are an AI research assistant. Given a topic or question, produce a structured, insight-rich briefing.
Be specific, factual, and balanced. Do not fabricate sources.
Output strictly in Markdown:

### Topic
Restated in one sentence.

### Key Insights
1. ...
2. ...
3. ...

### Background & Context
A short paragraph.

### Opportunities
- ...

### Risks / Considerations
- ...

### Suggested Next Steps
- ...

---
*AI-generated content may require human review. Verify facts independently.*`,

  chat: `You are a helpful, professional AI workplace productivity assistant. Help the user with work tasks: drafting, planning, summarizing, brainstorming, and answering questions. Be concise, accurate, and friendly. Format answers in Markdown when useful. Remind the user to review AI output when stakes are high.`,
};

function buildUserPrompt(feature: Feature, payload: any): string {
  switch (feature) {
    case "email":
      return `Write an email with the following details.
Tone: ${payload.tone || "professional"}
Audience: ${payload.audience || "general business contact"}
Purpose / Key points:
${payload.prompt || ""}`;
    case "summary":
      return `Summarize these meeting notes:\n\n${payload.prompt || ""}`;
    case "planner":
      return `Plan and prioritize these tasks/goals:\n\n${payload.prompt || ""}`;
    case "research":
      return `Research the following topic and produce a briefing:\n\n${payload.prompt || ""}`;
    case "chat":
      return payload.prompt || "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const feature = body.feature as Feature;
    const messages = body.messages as Array<{ role: string; content: string }> | undefined;

    if (!feature || !SYSTEM_PROMPTS[feature]) {
      return new Response(JSON.stringify({ error: "Invalid feature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let chatMessages: Array<{ role: string; content: string }>;
    if (feature === "chat" && Array.isArray(messages)) {
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPTS.chat },
        ...messages,
      ];
    } else {
      chatMessages = [
        { role: "system", content: SYSTEM_PROMPTS[feature] },
        { role: "user", content: buildUserPrompt(feature, body) },
      ];
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: chatMessages,
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Cloud → Settings → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
