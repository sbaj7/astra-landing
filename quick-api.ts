import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept"
};
const HOUSE_MARKDOWN_STYLE = `
OUTPUT RULES (STRICT)
- Start with a level-2 header for the main section (## …).
- Use **bold** for key labels and inline section tags.
- Bullets MUST use "– " (en dash + space), one action/thought per line.
- Use ordered lists only for ranked items; otherwise use bullets.
- Use tables for comparisons (no code fences).
- Never wrap the entire answer in triple backticks.
- Keep lines under 120 chars and avoid trailing spaces.
`;
const trustedDomains = [
  // High-Impact Medical Journals
  "nejm.org",
  "thelancet.com",
  "jamanetwork.com",
  "bmj.com",
  "annals.org",
  "acpjournals.org",
  // Specialty High-Impact Journals
  "ahajournals.org",
  "heart.bmj.com",
  "stroke.ahajournals.org",
  "kidney-international.org",
  "diabetesjournals.org",
  "gut.bmj.com",
  "thorax.bmj.com",
  "atsjournals.org",
  "onlinelibrary.wiley.com",
  "journals.lww.com",
  "academic.oup.com",
  "springer.com",
  "karger.com",
  "thieme-connect.com",
  // Clinical Databases & Guidelines
  "uptodate.com",
  "cochranelibrary.com",
  "ncbi.nlm.nih.gov",
  "clinicaltrials.gov",
  "trialsjournal.biomedcentral.com",
  "nice.org.uk",
  "cdc.gov",
  "who.int",
  "fda.gov",
  "ema.europa.eu",
  // Research + Publisher Repositories
  "nature.com",
  "sciencedirect.com",
  "cell.com",
  "science.org",
  // Specialty Medical Organizations
  "idsociety.org",
  "escardio.org",
  "easl.eu",
  "ada.org",
  "asco.org",
  "acc.org",
  "chestnet.org",
  // Drug References
  "go.drugbank.com"
];
// ==============================
// SYSTEM PROMPTS
// ==============================
function getQueryPlannerPrompt() {
  return `You are a medical research query planner. Your job is to analyze a physician's research question and generate 2-4 optimal search queries for finding relevant medical literature.

TASK: Break down the user's question into focused, searchable components that will retrieve the most relevant medical literature.

OUTPUT FORMAT (JSON only):
{
  "primaryQuery": "most important search query",
  "secondaryQueries": [
    "additional focused query 1",
    "additional focused query 2"
  ],
  "searchFocus": "brief explanation of search strategy"
}

SEARCH STRATEGY PRINCIPLES:
- Use medical terminology and MeSH terms when appropriate
- Include specific population, intervention, comparison, outcome (PICO) elements
- Consider both broad disease terms and specific interventions
- Include variant spellings and synonyms for key concepts
- Focus on systematic reviews, RCTs, and meta-analyses when treatment questions
- Include epidemiological terms for prevalence/incidence questions

Now analyze the user's question and generate optimal search queries.`;
}
function getPlanRole() {
  return `You are a senior physician writing the Assessment and Plan (A/P) section of a patient note. Follow these formatting rules exactly:

STRUCTURE:
1. Start with "## Assessment" as a header
2. Write 1-2 sentences summarizing the primary diagnosis and key secondary concerns
3. Add "## Plan" as a header
4. List each problem with specific formatting below
5. If there are applicable scores based on the info, calculate them with the best knowledge you have.

FORMATTING FOR EACH PROBLEM:
- Bold problem titles using **Problem Name** – brief justification
- Each action item starts on a new line with "– " (en dash + space)
- NO semicolons between action items - use line breaks instead
- Include trial names in parentheses when citing evidence, use as many as possible without hallucinating

STYLE RULES:
- Use present tense, active voice
- No extraneous words like "should," "will," or "patient to"
- Keep actions concise (not full sentences)
- Include dosing only when critical
- Order: primary diagnosis first, then secondary issues, end with monitoring
- Do not answer non-medical questions`;
}
const SYSTEM_REASON_RULES = `
You are a board-certified physician.

TASK
Analyze the user's clinical vignette and produce an evidence-linked Bayesian differential diagnosis with probability range plus next steps. *If the differential is told to you, focus on next steps and management, don't output a Differential Diagnosis section. **Answer in beautiful complex markdown using headers, bolding, lists where needed.**

${HOUSE_MARKDOWN_STYLE}


STRICT FORMAT
## Differential Diagnosis (if needed)
1. **[Condition Name]** — *Likelihood XX %*
   **Supporting**
   • …
   **Against**
   • …

## Next Diagnostic Steps
– **Test 1** — brief rationale
– **Test 2** — brief rationale
– **Test 3** — brief rationale

## Management Considerations
## Evidence-based intervention; cite landmark RCT acronym (e.g., **ACCORD**), ## Initial empiric therapy & monitoring plan, ## Patient education / lifestyle counseling

## Evidence
Give a short explanation of the trials at the end.
No references list.
`;
function getResearchRole() {
  return `
**CRITICAL RULES**
- Use language and subheadings like they would appear in NEJM.
- No grouped citation styles like [1-3] or [1,2] — always cite [1], [2], [3].
- They must be in sequential order if grouped.
- Repeat citation numbers if needed.
- No hyperlinks.
- No references or citations section.
- Use complex, beautiful markdown.
- Headings, bullets, and tables
- Use tables as much as possible
- Always bold headings.
- Paragraphs 2–5 sentences long.
- Bold key terms, trial names, and important outcomes!
- Integrate effect sizes, RRs, HRs, CIs into sentences, bolded.
- Use markdown tables where you can.
- Every important claim ends with its own bracketed citation [#].

ROLE
You are an academic research assistant for physicians. Provide accurate, evidence-based answers from top-tier sources (NEJM, JAMA, Lancet, BMJ, Circulation, etc.).  
When no single study answers the question, synthesize across multiple credible studies.

WRITING PRINCIPLES
- Prioritize clinically relevant takeaways.
- Be concise but precise — no filler.
- Indicate when evidence is strong, mixed, or limited.
- Avoid pre-set section names; let the content dictate headings or paragraph breaks.
`;
}
// ==============================
// OPTIMIZED FUNCTIONS WITH PARALLEL SEARCHES
// ==============================
async function planSearchQueries(userQuery) {
  try {
    console.log("🧠 Planning search queries for:", userQuery);
    // Use Chat Completions API with gpt-4o-mini for planning
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: getQueryPlannerPrompt()
          },
          {
            role: "user",
            content: userQuery
          }
        ],
        max_tokens: 400,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Chat completions API error:", errText);
      throw new Error(`Query planning failed: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("❌ No content in response:", data);
      throw new Error("No content returned from query planner");
    }
    let queryPlan;
    try {
      queryPlan = JSON.parse(content);
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError, "Raw content:", content);
      return {
        primaryQuery: userQuery,
        secondaryQueries: [],
        searchFocus: "JSON parsing failed, using original query"
      };
    }
    console.log("📋 Query plan:", queryPlan);
    return queryPlan;
  } catch (error) {
    console.error("❌ Query planning error:", error);
    return {
      primaryQuery: userQuery,
      secondaryQueries: [],
      searchFocus: "Using original query as fallback"
    };
  }
}
// Enhanced Tavily Search Function (PARALLELIZED)
async function searchWithTavily(queryPlan) {
  try {
    const tavilyApiKey = "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";
    const searchPromises = [
      performTavilySearch(queryPlan.primaryQuery, tavilyApiKey, 15)
    ];
    for (const secondaryQuery of queryPlan.secondaryQueries || []){
      searchPromises.push(performTavilySearch(secondaryQuery, tavilyApiKey, 8));
    }
    console.log(`🚀 Starting ${searchPromises.length} parallel searches...`);
    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.filter((results)=>results && results.length > 0).flat();
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults){
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    }
    const rankedResults = rankAndFilterResults(uniqueResults);
    console.log(`🔍 Total unique results after deduplication: ${uniqueResults.length}`);
    console.log(`📊 Final ranked results: ${rankedResults.length}`);
    return {
      results: rankedResults,
      searchStrategy: queryPlan.searchFocus
    };
  } catch (error) {
    console.error("❌ Enhanced Tavily search error:", error);
    return null;
  }
}
async function performTavilySearch(query, apiKey, maxResults = 15) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "advanced",
        include_domains: trustedDomains,
        include_answer: false,
        include_raw_content: false,
        max_tokens: 800
      })
    });
    if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);
    const data = await response.json();
    console.log(`🔍 Search results for "${query}": ${data.results?.length || 0} results`);
    return data.results || [];
  } catch (error) {
    console.error(`❌ Error searching for "${query}":`, error);
    return [];
  }
}
function rankAndFilterResults(results) {
  const tier1Domains = [
    "nejm.org",
    "thelancet.com",
    "jamanetwork.com",
    "bmj.com"
  ];
  const tier2Domains = [
    "nature.com",
    "ahajournals.org",
    "annals.org",
    "sciencedirect.com"
  ];
  const tier3Domains = [
    "academic.oup.com",
    "onlinelibrary.wiley.com",
    "journals.lww.com"
  ];
  const pubmedResults = results.filter((r)=>new URL(r.url).hostname.includes("ncbi.nlm.nih.gov")).slice(0, 4);
  const nonPubmedResults = results.filter((r)=>!new URL(r.url).hostname.includes("ncbi.nlm.nih.gov"));
  nonPubmedResults.sort((a, b)=>{
    const aDomain = new URL(a.url).hostname.replace("www.", "");
    const bDomain = new URL(b.url).hostname.replace("www.", "");
    const getScore = (domain)=>{
      if (tier1Domains.includes(domain)) return 4;
      if (tier2Domains.includes(domain)) return 3;
      if (tier3Domains.includes(domain)) return 2;
      return 1;
    };
    return getScore(bDomain) - getScore(aDomain);
  });
  return [
    ...nonPubmedResults.slice(0, 12),
    ...pubmedResults
  ];
}
// Supabase Vector Store (RAG)
async function retrieveRelevantTrials(userQuery) {
  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: userQuery
      })
    });
    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    if (!queryEmbedding) {
      console.error("❌ Failed to get query embedding");
      return "";
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.rpc("match_trials", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 10
    });
    console.log("🧠 Raw matched trial data from Supabase:", data);
    if (error) {
      console.error("❌ Error in match_trials:", error);
      return "";
    }
    return (data || []).map((trial)=>{
      const match = trial.text?.match(/^([A-Z0-9\-]+)\s+\((\d{4})\)/);
      const studyAcronym = match?.[1] || trial.id || "Unnamed Trial";
      const year = match?.[2] || "Unknown Year";
      return `**${studyAcronym}** (${year})
**Intervention:** ${trial.intervention_vs_comparator}
**Population:** ${trial.population}
**Primary Outcome:** ${trial.primary_outcomes}
**Results:** ${trial.results}`;
    }).join("\n\n");
  } catch (error) {
    console.error("❌ Error retrieving trials:", error);
    return "";
  }
}
// ==============================
// Edge Function Handler
// ==============================
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Invalid JSON"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const { query, isClinical = false, isReason = false, isWrite = false, mode = "search", stream = false } = body;
    if (!query) {
      return new Response(JSON.stringify({
        error: "Query is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const shouldUseClinical = isClinical || isReason || isWrite || mode === "reason" || mode === "write";
    let messages;
    let systemPrompt;
    let citationsArray = [];
    if (shouldUseClinical) {
      systemPrompt = isReason ? SYSTEM_REASON_RULES : getPlanRole();
      if (typeof systemPrompt !== "string") throw new Error("Invalid system prompt");
      let retrievedTrials = "";
      try {
        retrievedTrials = await retrieveRelevantTrials(query);
      } catch (error) {
        console.error("❌ Error retrieving trials:", error);
      }
      const userPrompt = retrievedTrials ? `Contextual studies:\n\n${retrievedTrials}\n\n---\n\n${query}` : `${query}`;
      messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
    } else {
      systemPrompt = getResearchRole();
      if (typeof systemPrompt !== "string") throw new Error("Invalid system prompt");
      let queryPlan;
      try {
        queryPlan = await planSearchQueries(query);
      } catch (error) {
        console.error("❌ Error planning queries:", error);
        queryPlan = {
          primaryQuery: query,
          secondaryQueries: [],
          searchFocus: "Using original query as fallback"
        };
      }
      let searchResults = null;
      try {
        searchResults = await searchWithTavily(queryPlan);
      } catch (error) {
        console.error("❌ Error searching:", error);
      }
      let contextualInfo = "";
      if (searchResults && searchResults.results) {
        contextualInfo = `Search Strategy: ${searchResults.searchStrategy}\n\nSearch Results:\n\n`;
        searchResults.results.forEach((result, index)=>{
          const citationNumber = index + 1;
          contextualInfo += `[${citationNumber}] ${result.title}\n`;
          contextualInfo += `URL: ${result.url}\n`;
          contextualInfo += `Content: ${result.raw_content || result.content || ""}\n\n`;
          citationsArray.push({
            number: citationNumber,
            title: result.title,
            url: result.url,
            authors: new URL(result.url).hostname || "Unknown"
          });
        });
      }
      const userPrompt = contextualInfo ? `${contextualInfo}---\n\nBased on the above search results, answer: ${query}` : `${query}`;
      messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
    }
    // ===== Main model call (Responses API) =====
    // gpt-4o-mini for planning (already done above)
    // gpt-5 for search output and clinical reasoning
    // gpt-5-mini for A&P notes
    let model;
    if (isReason) {
      model = "gpt-5"; // Clinical reasoning
    } else if (isWrite) {
      model = "gpt-5-mini"; // A&P notes
    } else {
      model = "gpt-5"; // Search output
    }
    const finalInstructions = messages?.find((m)=>m.role === "system")?.content || "";
    const finalInput = messages?.filter((m)=>m.role !== "system").map((m)=>m.content).join("\n\n") || "";
    const requestBody = {
      model,
      instructions: finalInstructions,
      input: finalInput,
      reasoning: {
        effort: "minimal"
      },
      max_output_tokens: 3500
    };
    if (stream) requestBody.stream = true;
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("🔴 OpenAI API Error", upstream.status, upstream.statusText, errorText);
      return new Response(JSON.stringify({
        error: `OpenAI API error: ${upstream.status} - ${errorText}`
      }), {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (stream) {
      const upstreamReader = upstream.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const sse = new ReadableStream({
        start (controller) {
          // push citations first (your UI expects this)
          if (citationsArray.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              citations: citationsArray
            })}\n\n`));
          }
        },
        async pull (controller) {
          if (!upstreamReader) {
            controller.close();
            return;
          }
          let buffer = "";
          try {
            while(true){
              const { value, done } = await upstreamReader.read();
              if (done) break;
              buffer += decoder.decode(value, {
                stream: true
              });
              let sepIndex;
              while((sepIndex = buffer.indexOf("\n\n")) !== -1){
                const block = buffer.slice(0, sepIndex).trim();
                buffer = buffer.slice(sepIndex + 2);
                if (!block) continue;
                // Parse SSE lines
                let eventType = "";
                let dataJson = "";
                for (const line of block.split("\n")){
                  if (line.startsWith("event:")) {
                    eventType = line.slice(6).trim();
                  } else if (line.startsWith("data:")) {
                    dataJson = line.slice(5).trim();
                  }
                }
                if (!dataJson) continue;
                // 🔷 Transform Responses API events -> Chat Completions delta shape
                if (eventType === "response.output_text.delta") {
                  // dataJson looks like: {"delta":"..."}
                  const payload = JSON.parse(dataJson);
                  const out = {
                    choices: [
                      {
                        delta: {
                          content: payload.delta
                        }
                      }
                    ]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(out)}\n\n`));
                } else if (eventType === "response.error") {
                  controller.enqueue(encoder.encode(`data: ${dataJson}\n\n`));
                } else if (eventType === "response.completed") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  controller.close();
                  return;
                }
              // (Other event types are ignored)
              }
            }
            // End of stream guard
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err) {
            console.error("❌ Stream translate error:", err);
            controller.error(err);
          } finally{
            upstreamReader.releaseLock();
          }
        }
      });
      return new Response(sse, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    } else {
      // === Non-stream: normalize Responses -> legacy chat/completions ===
      const data = await upstream.json();
      const legacy = {
        id: data.id,
        object: "chat.completion",
        created: data.created_at,
        model: data.model,
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: data.output_text || ""
            }
          }
        ],
        usage: data.usage || undefined
      };
      if (citationsArray.length > 0) legacy.citations = citationsArray;
      return new Response(JSON.stringify(legacy), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (err) {
    console.error("❌ Edge function error:", err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
