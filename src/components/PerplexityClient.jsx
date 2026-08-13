import SSEStream from './SSEStream';

class PerplexityClient {
  static shared = new PerplexityClient();
  
  constructor() {
    if (PerplexityClient.shared) {
      return PerplexityClient.shared;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.backendEndpoint = import.meta.env.VITE_QUICK_API_URL
      || (supabaseUrl ? `${supabaseUrl}/functions/v1/quick-api` : '');
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
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
    
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      if (response.status >= 300) {
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();

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
        throw new Error("Could not parse response");
      }

      onComplete({ success: true, data: content });
    } catch (error) {
      onComplete({ success: false, error });
    }
  }

  makeRequest(cfg, stream) {
    if (!this.backendEndpoint || !this.supabaseAnonKey) {
      throw new Error('Astra API is not configured');
    }

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
