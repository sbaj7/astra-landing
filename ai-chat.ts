// supabase/functions/quick-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept'
};
const trustedDomains = [
  "ncbi.nlm.nih.gov",
  "nejm.org",
  "thelancet.com",
  "jamanetwork.com",
  "bmj.com",
  "cochranelibrary.com",
  "annals.org",
  "sciencedirect.com",
  "ahajournals.org",
  "go.drugbank.com"
];
// Initialize Supabase client for chat storage
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Your exact SYSTEM_AP_RULES from apGenerator
const SYSTEM_AP_RULES = `
You are a senior physician.
TASK: Write the **Assessment & Plan** section only.
STRICT FORMAT
1. "## Assessment" header on line 1
2. One–two sentences summarising primary Dx ± key secondary concerns
3. "## Plan" header
4. For each problem:
   • **Problem Name** – brief justification
   • Each action starts with "– " on a new line (en‑dash + space)
   • No semicolons; no "should / will / the patient to" wording
   • Use present tense, active voice
   • Trials or landmark studies in parentheses when citing evidence, cite ≥ 3 landmark RCTs
   • Finish with monitoring / follow‑up items
ORDER
• Primary Dx first → important comorbidities → preventative care / monitoring last.
EXAMPLES (do not copy verbatim, adapt to case):
...
-- end --
`;
function getResearchRole() {
  return "Do not answer non-medical questions. You are an academic research assistant for physicians. Use extensive high-quality, peer-reviewed evidence—preferably from top-tier journals (e.g., NEJM, JAMA, Lancet, BMJ, Circulation, etc.)—to answer medical questions at a professional level. Prioritize structured, in-depth explanations and always cite your sources clearly.";
}
// Your exact validation function
function isValidAP(markdown) {
  const hasAssessment = markdown.startsWith("## Assessment");
  const hasPlan = markdown.includes("## Plan");
  const hasBullets = /\n– /.test(markdown);
  return hasAssessment && hasPlan && hasBullets;
}
// Chat storage functions
async function saveChat(chatData) {
  try {
    const { data, error } = await supabase.from('chat_sessions').insert([
      chatData
    ]).select().single();
    if (error) {
      console.error('Error saving chat:', error);
      return {
        success: false,
        error
      };
    }
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error in saveChat:', error);
    return {
      success: false,
      error
    };
  }
}
async function getChatHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).order('created_at', {
      ascending: false
    }).limit(limit);
    if (error) {
      console.error('Error getting chat history:', error);
      return {
        success: false,
        error
      };
    }
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    return {
      success: false,
      error
    };
  }
}
async function deleteChat(chatId, userId) {
  try {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', chatId).eq('user_id', userId);
    if (error) {
      console.error('Error deleting chat:', error);
      return {
        success: false,
        error
      };
    }
    return {
      success: true
    };
  } catch (error) {
    console.error('Error in deleteChat:', error);
    return {
      success: false,
      error
    };
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { action } = body;
    // Handle chat storage operations
    if (action === 'save_chat') {
      const { title, messages, isClinicalMode, userId } = body;
      const chatData = {
        user_id: userId || 'anonymous',
        title,
        messages: JSON.stringify(messages),
        is_clinical_mode: isClinicalMode,
        created_at: new Date().toISOString()
      };
      const result = await saveChat(chatData);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (action === 'get_chat_history') {
      const { userId, limit } = body;
      const result = await getChatHistory(userId || 'anonymous', limit);
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (action === 'delete_chat') {
      const { chatId, userId } = body;
      const result = await deleteChat(chatId, userId || 'anonymous');
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Original chat completion logic
    const { query, isClinical, stream } = body;
    if (!query) {
      return new Response(JSON.stringify({
        error: 'Query is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let apiUrl;
    let apiKey;
    let requestBody;
    if (isClinical) {
      // OpenAI for clinical - EXACTLY as you specified
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      apiKey = Deno.env.get('OPENAI_API_KEY');
      requestBody = {
        model: "gpt-4-1",
        stream: stream || false,
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: SYSTEM_AP_RULES
          },
          {
            role: "user",
            content: query
          }
        ]
      };
    } else {
      // Perplexity for research - unchanged
      apiUrl = 'https://api.perplexity.ai/chat/completions';
      apiKey = Deno.env.get('PERPLEXITY_API_KEY');
      requestBody = {
        model: "sonar-pro",
        stream: stream || false,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: getResearchRole()
          },
          {
            role: "user",
            content: query
          }
        ],
        search_domain_filter: trustedDomains
      };
    }
    console.log(`🚀 Sending ${isClinical ? 'OpenAI' : 'Perplexity'} query: ${query}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    if (stream) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      const data = await response.json();
      // Your exact retry logic for clinical validation
      if (isClinical && data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content.trim();
        if (!isValidAP(content)) {
          const retryBody = {
            ...requestBody,
            messages: [
              ...requestBody.messages,
              {
                role: "user",
                content: "Fix format only"
              }
            ],
            stream: false
          };
          const retryResp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(retryBody)
          });
          const retryData = await retryResp.json();
          if (retryData.choices?.[0]?.message?.content) {
            data.choices[0].message.content = retryData.choices[0].message.content.trim();
          }
        }
      }
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
