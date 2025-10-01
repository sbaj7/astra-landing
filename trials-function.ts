// supabase/functions/trials-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);
const EMBEDDING_MODEL = "text-embedding-3-small";
serve(async (req)=>{
  try {
    const { trials } = await req.json(); // expects [{ id, text, metadata }]
    if (!Array.isArray(trials)) throw new Error("Missing or invalid trials");
    for (const trial of trials){
      const { id, text, metadata } = trial;
      const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text
        })
      });
      const data = await embeddingRes.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) throw new Error("Failed to get embedding");
      await supabase.from("trials").upsert({
        id,
        text,
        embedding,
        metadata
      });
    }
    return new Response(JSON.stringify({
      status: "ok"
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
