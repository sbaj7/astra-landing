// Message.js - Message model with all properties from Swift version

class Message {
  constructor({
    role,
    content,
    citations = [],
    inlineCitations = [],
    title = null,
    wasInClinicalMode = null,
    wasInReasonMode = null,
    wasInWriteMode = null
  }) {
    this.id = crypto.randomUUID(); // Generate UUID like Swift
    this.role = role; // "user" or "assistant"
    this.content = content;
    this.citations = citations;
    this.inlineCitations = inlineCitations;
    this.title = title;
    this.wasInClinicalMode = wasInClinicalMode; // For legacy support
    this.wasInReasonMode = wasInReasonMode;     // For reasoning mode
    this.wasInWriteMode = wasInWriteMode;       // For write mode
    this.timestamp = new Date(); // Add timestamp for React compatibility
  }

  // Helper computed property to get the current mode
  get currentMode() {
    if (this.wasInReasonMode === true) return "reason";
    if (this.wasInWriteMode === true) return "write";
    return "search";
  }

  // Equality check based on ID
  equals(other) {
    return other && this.id === other.id;
  }

  // Convert to plain object for JSON serialization
  toJSON() {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      citations: this.citations,
      inlineCitations: this.inlineCitations,
      title: this.title,
      wasInClinicalMode: this.wasInClinicalMode,
      wasInReasonMode: this.wasInReasonMode,
      wasInWriteMode: this.wasInWriteMode,
      timestamp: this.timestamp.toISOString()
    };
  }

  // Create from plain object (for deserialization)
  static fromJSON(obj) {
    const message = new Message({
      role: obj.role,
      content: obj.content,
      citations: obj.citations || [],
      inlineCitations: obj.inlineCitations || [],
      title: obj.title,
      wasInClinicalMode: obj.wasInClinicalMode,
      wasInReasonMode: obj.wasInReasonMode,
      wasInWriteMode: obj.wasInWriteMode
    });
    
    // Restore ID and timestamp if available
    if (obj.id) message.id = obj.id;
    if (obj.timestamp) message.timestamp = new Date(obj.timestamp);
    
    return message;
  }

  // Create a copy with updated properties
  copy(updates = {}) {
    return new Message({
      role: updates.role ?? this.role,
      content: updates.content ?? this.content,
      citations: updates.citations ?? this.citations,
      inlineCitations: updates.inlineCitations ?? this.inlineCitations,
      title: updates.title ?? this.title,
      wasInClinicalMode: updates.wasInClinicalMode ?? this.wasInClinicalMode,
      wasInReasonMode: updates.wasInReasonMode ?? this.wasInReasonMode,
      wasInWriteMode: updates.wasInWriteMode ?? this.wasInWriteMode
    });
  }
}

// Citation and InlineCitation models (matching the Swift versions)
class Citation {
  constructor(number, title, url, authors) {
    this.id = crypto.randomUUID();
    this.number = number;
    this.title = title;
    this.url = url;
    this.authors = authors;
  }

  equals(other) {
    return other && this.id === other.id;
  }

  toJSON() {
    return {
      id: this.id,
      number: this.number,
      title: this.title,
      url: this.url,
      authors: this.authors
    };
  }

  static fromJSON(obj) {
    const citation = new Citation(obj.number, obj.title, obj.url, obj.authors);
    if (obj.id) citation.id = obj.id;
    return citation;
  }
}

class InlineCitation {
  constructor(sourceNumber, startIndex, endIndex) {
    this.id = crypto.randomUUID();
    this.sourceNumber = sourceNumber;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  equals(other) {
    return other && this.id === other.id;
  }

  toJSON() {
    return {
      id: this.id,
      sourceNumber: this.sourceNumber,
      startIndex: this.startIndex,
      endIndex: this.endIndex
    };
  }

  static fromJSON(obj) {
    const inline = new InlineCitation(obj.sourceNumber, obj.startIndex, obj.endIndex);
    if (obj.id) inline.id = obj.id;
    return inline;
  }
}

// React hook for working with messages
export const useMessage = (initialMessage = null) => {
  const [message, setMessage] = React.useState(initialMessage);

  const updateMessage = React.useCallback((updates) => {
    setMessage(prevMessage => {
      if (!prevMessage) return null;
      return prevMessage.copy(updates);
    });
  }, []);

  const createMessage = React.useCallback((messageData) => {
    const newMessage = new Message(messageData);
    setMessage(newMessage);
    return newMessage;
  }, []);

  const clearMessage = React.useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    updateMessage,
    createMessage,
    clearMessage,
    setMessage
  };
};

// Utility functions for message handling
export const messageUtils = {
  // Create a user message
  createUserMessage: (content, mode = 'search') => {
    return new Message({
      role: 'user',
      content,
      wasInReasonMode: mode === 'reason',
      wasInWriteMode: mode === 'write',
      wasInClinicalMode: false // Legacy support
    });
  },

  // Create an assistant message
  createAssistantMessage: (content, citations = [], inlineCitations = []) => {
    return new Message({
      role: 'assistant',
      content,
      citations,
      inlineCitations
    });
  },

  // Filter messages by role
  filterByRole: (messages, role) => {
    return messages.filter(msg => msg.role === role);
  },

  // Get messages by mode
  filterByMode: (messages, mode) => {
    return messages.filter(msg => {
      switch (mode) {
        case 'reason':
          return msg.wasInReasonMode === true;
        case 'write':
          return msg.wasInWriteMode === true;
        case 'search':
        default:
          return !msg.wasInReasonMode && !msg.wasInWriteMode;
      }
    });
  },

  // Convert messages array to JSON
  messagesToJSON: (messages) => {
    return messages.map(msg => msg.toJSON());
  },

  // Convert JSON array to messages
  messagesFromJSON: (jsonArray) => {
    return jsonArray.map(obj => Message.fromJSON(obj));
  }
};

export { Message, Citation, InlineCitation };
export default Message;