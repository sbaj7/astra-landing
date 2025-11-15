class PerplexityClient {
  static shared = new PerplexityClient();
  
  constructor() {
    if (PerplexityClient.shared) {
      return PerplexityClient.shared;
    }
    this.backendEndpoint = "https://shwitfgtpfszjjoczbxp.supabase.co/functions/v1/quick-api";
    this.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod2l0Zmd0cGZzempqb2N6YnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjY5ODksImV4cCI6MjA2NTg0Mjk4OX0.b8CBToFGkvPUcxwxJL4ZnFIe4tanZigHdGp9BKzLBM8";
    this.liveStream = null;
  }

  static StreamConfig = class {
    constructor(query, isClinical, isReason = false, isWrite = false) {
      this.query = query;
      this.isClinical = isClinical;
      this.isReason = isReason;
      this.isWrite = isWrite;
    }

    get currentMode() {
      if (this.isReason) return "reason";
      if (this.isWrite) return "write";
      return "search";
    }
  };

  parseInlineCitations(text, citations) {
    const inlineCitations = [];
    const regex = /\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const number = parseInt(match[1]);
      const citation = citations.find(c => c.number === number);
      
      if (citation) {
        inlineCitations.push({
          sourceNumber: number,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return inlineCitations;
  }

  async streamingAnswer(cfg, onUpdate, onComplete) {
    // Cancel any existing stream
    if (this.liveStream) {
      this.liveStream.cancel();
      this.liveStream = null;
    }

    const request = this.makeRequest(cfg, true);

    console.log(`🚀 Sending ${cfg.currentMode} query: ${cfg.query}`);
    console.log(`📡 Request URL: ${request.url}`);
    console.log(`📋 Request headers:`, request.headers);
    
    if (request.body) {
      console.log(`📦 Request body: ${request.body}`);
    }

    // Only collect citations for search mode
    const shouldCollectCitations = cfg.currentMode === "search";
    
    this.liveStream = new SSEStream(
      request,
      shouldCollectCitations,
      (txt) => onUpdate(txt),
      (result) => {
        onComplete(result);
        this.liveStream = null;
      }
    );
  }

  async answer(cfg, onComplete) {
    const request = this.makeRequest(cfg, false);
    
    console.log(`🚀 Sending non-streaming ${cfg.currentMode} query: ${cfg.query}`);
    
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (response.status >= 300) {
        const errorText = await response.text();
        console.log(`❌ Server error: ${errorText}`);
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();
      console.log(`📄 Response JSON keys:`, Object.keys(json));

      // Try multiple possible response formats
      let content = null;
      
      if (json.choices?.[0]?.message?.content) {
        content = json.choices[0].message.content;
      } else if (json.content) {
        content = json.content;
      } else if (json.text) {
        content = json.text;
      }
      
      if (!content) {
        console.log(`❌ Could not extract content from response:`, json);
        throw new Error("Could not parse response");
      }

      onComplete({ success: true, data: content });
    } catch (error) {
      console.log(`❌ Request failed:`, error);
      onComplete({ success: false, error });
    }
  }

  makeRequest(cfg, stream) {
    const headers = {
      'Authorization': `Bearer ${this.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'apikey': this.supabaseAnonKey
    };
    
    if (stream) {
      headers['Accept'] = 'text/event-stream';
    }

    const body = JSON.stringify({
      query: cfg.query,
      isClinical: cfg.isClinical,
      isReason: cfg.isReason,
      isWrite: cfg.isWrite,
      mode: cfg.currentMode,
      stream: stream
    });

    return {
      url: this.backendEndpoint,
      method: 'POST',
      headers: headers,
      body: body
    };
  }

  cancelStreaming() {
    if (this.liveStream) {
      this.liveStream.cancel();
      this.liveStream = null;
    }
  }
}

export default PerplexityClient;