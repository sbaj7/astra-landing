import React, { useState, useCallback } from 'react';

// Minimal fix - remove problematic dispatch
class ChatStreamManager {
  constructor() {
    this.markdownText = "";
    this.isStreaming = false;
    this.isEnabled = false;
    this.listeners = new Set();
  }

  enable() {
    this.isEnabled = true;
    this.isStreaming = true;
    this.notifyListeners();
  }

  append(text) {
    if (!text || text.length === 0 || !this.isEnabled) {
      return;
    }
    
    // FIXED: Direct append without dispatch - SSEStream already calls this on main queue
    this.markdownText += text;
    this.notifyListeners();
  }

  // Get all content
  getAllContent() {
    return this.markdownText;
  }

  reset() {
    this.isEnabled = false;
    this.markdownText = "";
    this.isStreaming = false;
    this.notifyListeners();
  }

  // Observable pattern for React components
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        markdownText: this.markdownText,
        isStreaming: this.isStreaming
      });
    });
  }
}

// React hook to use ChatStreamManager
export const useChatStreamManager = () => {
  const [state, setState] = useState({
    markdownText: "",
    isStreaming: false
  });

  const managerRef = React.useRef(null);

  React.useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new ChatStreamManager();
    }

    const unsubscribe = managerRef.current.subscribe(setState);
    
    // Initialize state
    setState({
      markdownText: manager