import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface ImagePayload {
  data: string;   // base64 data URL: "data:image/jpeg;base64,..."
  type: string;   // MIME type
}

interface VisionRequest {
  query: string;
  images: ImagePayload[];
  mode: "search" | "reason" | "write" | "standard";
}

const MODE_DEFAULT_PROMPTS: Record<string, string> = {
  search: "Please analyze this medical image and provide relevant clinical information with evidence-based references.",
  reason: "Please analyze this medical image and provide clinical reasoning, including differential diagnoses and next steps.",
  write: "Please analyze this medical image and generate appropriate clinical documentation.",
  standard: "Please analyze this image and describe what you see."
};

const MEDICAL_SYSTEM_PROMPT = `You are a medical AI assistant helping healthcare professionals analyze medical images.
Provide evidence-based analysis while noting that AI analysis should supplement, not replace, clinical judgment.
Be specific about what you observe but appropriately cautious about definitive diagnoses.`;

function getEffectiveQuery(query: string, mode: string): string {
  if (query.trim().length > 0) {
    return query;
  }
  return MODE_DEFAULT_PROMPTS[mode] || MODE_DEFAULT_PROMPTS.standard;
}

interface MessageContent {
  type: string;
  text?: string;
  image_url?: {
    url: string;
    detail: string;
  };
}

function buildMessages(request: VisionRequest, systemPrompt: string) {
  const content: MessageContent[] = [];

  // Add text query
  const effectiveQuery = getEffectiveQuery(request.query || "", request.mode || "standard");
  content.push({ type: "text", text: effectiveQuery });

  // Add images
  for (const image of request.images) {
    content.push({
      type: "image_url",
      image_url: {
        url: image.data,  // Already includes "data:image/jpeg;base64,..."
        detail: "auto"    // Let OpenAI decide based on image size
      }
    });
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content }
  ];
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function handleOpenAIError(status: number, errorText: string) {
  let userMessage = "Image analysis failed. Please try again.";

  if (status === 429) {
    userMessage = "Too many requests. Please wait a moment and try again.";
  } else if (status === 400 && errorText.toLowerCase().includes("image")) {
    userMessage = "Image could not be processed. Please try a different image format.";
  } else if (status === 413 || errorText.toLowerCase().includes("too large")) {
    userMessage = "Image is too large. Please use a smaller image.";
  }

  return errorResponse(userMessage, status >= 500 ? 502 : status);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[vision-api] OPENAI_API_KEY not configured");
      return errorResponse("Service configuration error", 500);
    }

    // Parse request body
    let body: VisionRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { query, images, mode } = body;

    // Validate request - at least one image required
    if (!images || !Array.isArray(images) || images.length === 0) {
      return errorResponse("At least one image is required", 400);
    }

    // Build messages for OpenAI
    const messages = buildMessages(
      { query: query || "", images, mode: mode || "standard" },
      MEDICAL_SYSTEM_PROMPT
    );

    // Make OpenAI request with streaming
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        max_tokens: 4096
      })
    });

    // Handle OpenAI errors
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("[vision-api] OpenAI error:", openaiResponse.status, errorText);
      return handleOpenAIError(openaiResponse.status, errorText);
    }

    // Forward streaming response directly
    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error) {
    console.error("[vision-api] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
