class Citation {
  constructor(number, title, url, authors) {
    this.number = number;
    this.title = title;
    this.url = url;
    this.authors = authors;
  }
}

class SSEStream {
  constructor(request, shouldCollectCitations, onText, onDone) {
    this.buffer = "";
    this.onText = onText;
    this.onDone = onDone;
    this.shouldCollectCitations = shouldCollectCitations;
    this.isCompleted = false;
    this.httpStatusCode = 200;
    this.collectedCitations = [];
    this.hasReceivedContent = false;
    this.abortController = new AbortController();

    this.startStream(request);
  }

  async startStream(request) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: this.abortController.signal
      });

      this.httpStatusCode = response.status;
      console.log(`📡 HTTP Status: ${response.status}`);
      
      if (response.status >= 300) {
        console.log(`⚠️ HTTP Error Status: ${response.status}`);
        const errorText = await response.text();
        this.handleErrorResponse(errorText);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🔚 Stream completed');
          this.handleStreamComplete();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log(`📥 Received chunk: ${chunk.substring(0, 100)}...`);

        // Handle error responses
        if (this.httpStatusCode >= 300 && chunk.includes('"error"') && !chunk.startsWith('data:')) {
          this.handleErrorResponse(chunk);
          return;
        }

        this.buffer += chunk;
        this.processBuffer();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log(`❌ Stream error:`, error);
        this.completeWithError(error);
      }
    }
  }

  handleErrorResponse(string) {
    console.log(`❌ Handling error response: ${string}`);
    try {
      const json = JSON.parse(string);
      const message = json.error?.message || 'Unknown error';
      this.completeWithError(new Error(message));
    } catch {
      this.completeWithError(new Error('Bad server response'));
    }
  }

  processBuffer() {
    const lines = this.buffer.split(/\r?\n/);
    const endsWithNewline = this.buffer.endsWith('\n') || this.buffer.endsWith('\r\n');

    if (endsWithNewline) {
      lines.forEach(line => {
        if (line.trim()) {
          this.processLine(line);
        }
      });
      this.buffer = "";
    } else if (lines.length > 1) {
      lines.slice(0, -1).forEach(line => {
        if (line.trim()) {
          this.processLine(line);
        }
      });
      this.buffer = lines[lines.length - 1] || "";
    }
  }

  processLine(line) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) {
      console.log(`🔍 Skipping non-data line: ${trimmed.substring(0, 50)}`);
      return;
    }

    const payload = trimmed.substring(5).trim();
    console.log(`🔄 Processing payload: ${payload.substring(0, 100)}...`);

    // ONLY complete on explicit [DONE] marker
    if (payload === '[DONE]') {
      console.log('✅ Received [DONE] marker, completing stream');
      this.completeStream();
      return;
    }

    if (!payload) {
      console.log('⚠️ Empty payload, continuing...');
      return;
    }

    try {
      const json = JSON.parse(payload);

      // Handle Tavily citations properly
      if (this.shouldCollectCitations && this.collectedCitations.length === 0) {
        // Try structured citations first (from Tavily via backend)
        if (json.citations && Array.isArray(json.citations)) {
          console.log(`📚 Processing ${json.citations.length} structured Tavily citations`);
          this.collectedCitations = json.citations.map(citationDict => {
            if (typeof citationDict === 'object' && citationDict.number && citationDict.title && citationDict.url) {
              const authors = citationDict.authors || new URL(citationDict.url).hostname || 'Unknown';
              return new Citation(citationDict.number, citationDict.title, citationDict.url, authors);
            }
            return null;
          }).filter(Boolean);
          console.log(`✅ Collected ${this.collectedCitations.length} structured citations`);
        }
        // Fallback to simple URL array
        else if (Array.isArray(json.citations)) {
          console.log(`📚 Processing ${json.citations.length} URL citations (fallback)`);
          this.collectedCitations = json.citations.map((urlString, i) => {
            try {
              const url = new URL(urlString);
              return new Citation(i + 1, this.extractTitle(url), urlString, url.hostname || 'Unknown');
            } catch {
              return null;
            }
          }).filter(Boolean);
          console.log(`✅ Collected ${this.collectedCitations.length} URL citations`);
        }
      }

      // Extract streaming content
      let content = null;
      
      if (json.choices?.[0]?.delta?.content) {
        content = json.choices[0].delta.content;
        console.log(`📝 Extracted delta content: ${content.substring(0, 50)}...`);
      } else if (json.choices?.[0]?.message?.content) {
        content = json.choices[0].message.content;
        console.log(`📝 Extracted message content: ${content.substring(0, 50)}...`);
      } else if (json.content) {
        content = json.content;
        console.log(`📝 Extracted direct content: ${content.substring(0, 50)}...`);
      } else if (json.text) {
        content = json.text;
        console.log(`📝 Extracted text content: ${content.substring(0, 50)}...`);
      }

      // Send content if found
      if (content && content.length > 0) {
        this.hasReceivedContent = true;
        this.onText(content);
      } else {
        console.log(`⚠️ No content found in JSON:`, json);
      }

    } catch (error) {
      console.log(`❌ JSON parsing error:`, error);
    }
  }

  completeStream() {
    if (this.isCompleted) {
      console.log('⚠️ Stream already completed, ignoring');
      return;
    }
    console.log(`🎯 Completing stream with ${this.collectedCitations.length} citations`);
    this.isCompleted = true;
    this.onDone({ success: true, data: this.collectedCitations });
  }

  completeWithError(error) {
    if (this.isCompleted) {
      console.log('⚠️ Stream already completed, ignoring error');
      return;
    }
    console.log(`❌ Completing stream with error:`, error);
    this.isCompleted = true;
    this.onDone({ success: false, error });
  }

  handleStreamComplete() {
    console.log('🔚 Stream task completed');
    
    // Process any remaining buffer
    if (this.buffer.trim()) {
      console.log(`🧹 Processing remaining buffer: ${this.buffer.substring(0, 100)}...`);
      const lines = this.buffer.split(/\r?\n/);
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          this.processLine(line);
        }
      });
    }

    // Only complete if not already completed
    if (!this.isCompleted) {
      if (this.hasReceivedContent) {
        console.log('✅ Task completed normally with content, completing stream');
        this.completeStream();
      } else {
        console.log('⚠️ Task completed but no content received');
        this.completeWithError(new Error('No content received'));
      }
    }
  }

  extractTitle(url) {
    const hostname = url.hostname?.toLowerCase() || '';
    
    if (hostname.includes('pubmed')) {
      return 'PubMed';
    } else if (hostname.includes('pmc')) {
      return 'PMC Article';
    } else if (hostname.includes('dynamed')) {
      return 'DynaMed';
    } else if (hostname.includes('heart.org')) {
      return 'American Heart Association';
    } else if (hostname.includes('wikipedia')) {
      return 'Wikipedia';
    }
    return url.hostname || 'External Link';
  }

  cancel() {
    console.log('🛑 Cancelling stream');
    this.abortController.abort();
    this.isCompleted = true;
  }
}

export default SSEStream;