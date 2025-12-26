import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.prompt !== "string") {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model = typeof body.model === "string" ? body.model : "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: body.prompt }] }],
    });

    const resolveValue = async (value: unknown): Promise<string | null> => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "function") {
        return resolveValue(value());
      }
      if ((value as Promise<string>)?.then) {
        const awaited = await value;
        return resolveValue(awaited);
      }
      return null;
    };

    const directText =
      (await resolveValue(response?.text)) ||
      (await resolveValue(response?.response?.text));

    let text = directText ?? "";
    if (!text) {
      const candidates = response?.response?.candidates ?? [];
      const fallback = Array.isArray(candidates)
        ? candidates
            .map((candidate: any) =>
              (candidate?.content?.parts || [])
                .map((part: any) => part?.text ?? "")
                .join("")
            )
            .join("\n")
            .trim()
        : "";
      text = fallback;
    }
    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini Edge Error:", error);
    return new Response(JSON.stringify({ error: "Gemini request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
