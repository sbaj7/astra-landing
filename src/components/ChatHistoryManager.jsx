import React, { useState, useCallback, useEffect } from 'react';

class ChatHistoryManager {
  constructor() {
    this.chatSessions = [];
    this.isLoading = false;
    this.errorMessage = null;
    this.listeners = new Set();
    this.chatClient = ChatClient.shared;
    
    this.loadChatHistory();
  }

  // Load Chat History from Backend
  async loadChatHistory() {
    this.isLoading = true;
    this.errorMessage = null;
    this.notifyListeners();
    
    try {
      const sessions = await this.chatClient.getChatHistory();
      this.chatSessions = sessions;
      this.isLoading = false;
      console.log(`✅ Loaded ${sessions.length} chat sessions from backend`);
    } catch (error) {
      this.errorMessage = error.message;
      this.isLoading = false;
      console.log(`❌ Failed to load chat history: ${error}`);
    }
    
    this.notifyListeners();
  }

  // Save Current Chat to Backend
  async saveCurrentChat(messages, isClinicalMode) {
    if (!messages || messages.length === 0) {
      console.log('⚠️ No messages to save');
      return;
    }
    
    const title = this.generateChatTitle(messages);
    
    try {
      await this.chatClient.saveChat(title, messages, isClinicalMode);
      console.log('✅ Chat saved successfully');
      
      // Reload chat history to get the saved chat with proper ID
      await this.loadChatHistory();
    } catch (error) {
      this.errorMessage = `Failed to save chat: ${error.message}`;
      console.log(`❌ Failed to save chat: ${error}`);
      this.notifyListeners();
    }
  }

  // Delete Chat from Backend
  async deleteChat(session) {
    try {
      await this.chatClient.deleteChat(session.id);
      this.chatSessions = this.chatSessions.filter(s => s.id !== session.id);
      console.log('✅ Chat deleted successfully');
      this.notifyListeners();
    } catch (error) {
      this.errorMessage = `Failed to delete chat: ${error.message}`;
      console.log(`❌ Failed to delete chat: ${error}`);
      this.notifyListeners();
    }
  }

  // Clear All History
  async clearAllHistory() {
    const sessionsToDelete = [...this.chatSessions];
    console.log(`🗑️ Clearing all history (${sessionsToDelete.length} chats)`);
    
    try {
      // Delete all sessions from backend
      for (const session of sessionsToDelete) {
        try {
          await this.chatClient.deleteChat(session.id);
        } catch (error) {
          console.log('Failed to delete a chat session:', error);
        }
      }
      
      this.chatSessions = [];
      console.log('✅ All chat history cleared');
      this.notifyListeners();
    } catch (error) {
      console.log('Error during bulk delete:', error);
    }
  }

  // Generate Chat Title
  generateChatTitle(messages) {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    
    if (!firstUserMessage) {
      return 'New Chat';
    }
    
    const content = firstUserMessage.content.trim();
    
    if (content.length > 50) {
      return content.substring(0, 47) + '...';
    }
    
    return content || 'New Chat';
  }

  // Clear Error
  clearError() {
    this.errorMessage = null;
    this.notifyListeners();
  }

  // Manual Refresh
  async refresh() {
    await this.loadChatHistory();
  }

  // Observable pattern
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        chatSessions: this.chatSessions,
        isLoading: this.isLoading,
        errorMessage: this.errorMessage
      });
    });
  }
}

// Chat Client class
class ChatClient {
  static shared = new ChatClient();
  
  constructor() {
    if (ChatClient.shared) {
      return ChatClient.shared;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.backendEndpoint = import.meta.env.VITE_QUICK_API_URL
      || (supabaseUrl ? `${supabaseUrl}/functions/v1/quick-api` : '');
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  get userId() {
    let stored = localStorage.getItem('user_id');
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem('user_id', stored);
    }
    return stored;
  }

  // Save Chat
  async saveChat(title, messages, isClinicalMode) {
    const request = this.makeRequest("save_chat", {
      title,
      messages: messages.map(msg => this.messageToDict(msg)),
      isClinicalMode,
      userId: this.userId
    });

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    if (response.status >= 300) {
      throw new Error('Server error');
    }

    const json = await response.json();
    
    if (!json.success) {
      throw new Error('Save failed');
    }
  }

  // Get Chat History
  async getChatHistory(limit = 50) {
    const request = this.makeRequest("get_chat_history", {
      userId: this.userId,
      limit
    });

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    if (response.status >= 300) {
      throw new Error('Server error');
    }

    const json = await response.json();
    
    if (!json.success) {
      throw new Error('Load failed');
    }

    return json.data.map(dict => this.parseChatSession(dict));
  }

  // Delete Chat
  async deleteChat(chatId) {
    const request = this.makeRequest("delete_chat", {
      chatId,
      userId: this.userId
    });

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    if (response.status >= 300) {
      throw new Error('Server error');
    }

    const json = await response.json();
    
    if (!json.success) {
      throw new Error('Delete failed');
    }
  }

  // Helper Methods
  makeRequest(action, body) {
    if (!this.backendEndpoint || !this.supabaseAnonKey) {
      throw new Error('Astra API is not configured');
    }

    const headers = {
      'Authorization': `Bearer ${this.supabaseAnonKey}`,
      'Content-Type': 'application/json'
    };

    const requestBody = { ...body, action };

    return {
      url: this.backendEndpoint,
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    };
  }

  messageToDict(message) {
    const dict = {
      role: message.role,
      content: message.content
    };

    if (message.citations && message.citations.length > 0) {
      dict.citations = message.citations.map(citation => ({
        number: citation.number,
        title: citation.title,
        url: citation.url,
        authors: citation.authors,
        host: citation.host || citation.hostname,
        displayUrl: citation.displayUrl,
        faviconUrl: citation.faviconUrl,
        snippet: citation.snippet || citation.summary,
        summary: citation.summary || citation.snippet,
        publishedAt: citation.publishedAt || citation.publicationDate,
        publicationDate: citation.publicationDate || citation.publishedAt,
        year: citation.year,
        journal: citation.journal,
        doi: citation.doi,
        score: citation.score
      }));
    }

    if (message.inlineCitations && message.inlineCitations.length > 0) {
      dict.inlineCitations = message.inlineCitations.map(inline => ({
        sourceNumber: inline.sourceNumber,
        startIndex: inline.startIndex,
        endIndex: inline.endIndex
      }));
    }

    if (message.wasInClinicalMode !== undefined) {
      dict.wasInClinicalMode = message.wasInClinicalMode;
    }

    return dict;
  }

  parseChatSession(dict) {
    const id = dict.id;
    const title = dict.title;
    const isClinicalMode = dict.is_clinical_mode;
    const createdAt = new Date(dict.created_at);
    const updatedAt = new Date(dict.updated_at);

    // Parse messages JSON
    const messagesArray = JSON.parse(dict.messages);
    const messages = messagesArray.map(messageDict => this.parseMessage(messageDict));

    return {
      id,
      title,
      messages,
      wasInClinicalMode: isClinicalMode,
      createdAt,
      updatedAt,
      timestamp: updatedAt // For compatibility
    };
  }

  parseMessage(dict) {
    const message = {
      id: Date.now() + Math.random(), // Generate ID for React
      role: dict.role,
      content: dict.content,
      timestamp: new Date()
    };

    if (dict.citations) {
      message.citations = dict.citations.map(citationDict => ({
        number: citationDict.number,
        title: citationDict.title,
        url: citationDict.url,
        authors: citationDict.authors,
        host: citationDict.host || citationDict.hostname,
        hostname: citationDict.host || citationDict.hostname,
        displayUrl: citationDict.displayUrl,
        faviconUrl: citationDict.faviconUrl,
        snippet: citationDict.snippet || citationDict.summary,
        summary: citationDict.summary || citationDict.snippet,
        publishedAt: citationDict.publishedAt || citationDict.publicationDate,
        publicationDate: citationDict.publicationDate || citationDict.publishedAt,
        year: citationDict.year,
        journal: citationDict.journal,
        doi: citationDict.doi,
        score: citationDict.score
      }));
    } else {
      message.citations = [];
    }

    if (dict.inlineCitations) {
      message.inlineCitations = dict.inlineCitations.map(inlineDict => ({
        sourceNumber: inlineDict.sourceNumber,
        startIndex: inlineDict.startIndex,
        endIndex: inlineDict.endIndex
      }));
    } else {
      message.inlineCitations = [];
    }

    if (dict.wasInClinicalMode !== undefined) {
      message.wasInClinicalMode = dict.wasInClinicalMode;
    }

    return message;
  }
}

// React hook to use ChatHistoryManager
export const useChatHistoryManager = () => {
  const [state, setState] = useState({
    chatSessions: [],
    isLoading: false,
    errorMessage: null
  });

  const managerRef = React.useRef(null);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ChatHistoryManager();
    }

    const unsubscribe = managerRef.current.subscribe(setState);
    
    // Initialize state
    setState({
      chatSessions: managerRef.current.chatSessions,
      isLoading: managerRef.current.isLoading,
      errorMessage: managerRef.current.errorMessage
    });

    return unsubscribe;
  }, []);

  const saveCurrentChat = useCallback(async (messages, isClinicalMode) => {
    await managerRef.current?.saveCurrentChat(messages, isClinicalMode);
  }, []);

  const deleteChat = useCallback(async (session) => {
    await managerRef.current?.deleteChat(session);
  }, []);

  const clearAllHistory = useCallback(async () => {
    await managerRef.current?.clearAllHistory();
  }, []);

  const clearError = useCallback(() => {
    managerRef.current?.clearError();
  }, []);

  const refresh = useCallback(async () => {
    await managerRef.current?.refresh();
  }, []);

  return {
    chatSessions: state.chatSessions,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    saveCurrentChat,
    deleteChat,
    clearAllHistory,
    clearError,
    refresh
  };
};

export default ChatHistoryManager;
