class SpeechRecognizer {
  constructor() {
    this.recognizer = null;
    this.transcript = "";
    this.isRecording = false;
    this.listeners = new Set();

    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      this.recognizer = new SpeechRecognition();
      this.setupRecognizer();
    }
  }

  setupRecognizer() {
    if (!this.recognizer) return;

    this.recognizer.continuous = true;
    this.recognizer.interimResults = true;
    this.recognizer.lang = 'en-US';

    this.recognizer.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Use final transcript if available, otherwise interim
      const newTranscript = finalTranscript || interimTranscript;
      if (newTranscript !== this.transcript) {
        this.transcript = newTranscript;
        this.notifyListeners();
      }
    };

    this.recognizer.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isRecording = true;
      this.notifyListeners();
    };

    this.recognizer.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.isRecording = false;
      this.notifyListeners();
    };

    this.recognizer.onerror = (event) => {
      console.error('🎤 Speech recognition error:', event.error);
      this.isRecording = false;
      this.notifyListeners();
    };
  }

  startTranscribing() {
    if (!this.recognizer) {
      console.warn('Speech recognition not available');
      return;
    }

    if (this.isRecording) {
      console.log('Already recording');
      return;
    }

    try {
      this.transcript = "";
      this.recognizer.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }

  stopTranscribing() {
    if (!this.recognizer || !this.isRecording) {
      return;
    }

    try {
      this.recognizer.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopTranscribing();
    } else {
      this.startTranscribing();
    }
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
        transcript: this.transcript,
        isRecording: this.isRecording,
        isAvailable: !!this.recognizer
      });
    });
  }

  // Getters for current state
  get isAvailable() {
    return !!this.recognizer;
  }

  get currentTranscript() {
    return this.transcript;
  }

  get recording() {
    return this.isRecording;
  }

  // Reset transcript
  clearTranscript() {
    this.transcript = "";
    this.notifyListeners();
  }
}

// React hook to use SpeechRecognizer
export const useSpeechRecognizer = () => {
  const [state, setState] = React.useState({
    transcript: "",
    isRecording: false,
    isAvailable: false
  });

  const recognizerRef = React.useRef(null);

  React.useEffect(() => {
    if (!recognizerRef.current) {
      recognizerRef.current = new SpeechRecognizer();
    }

    const unsubscribe = recognizerRef.current.subscribe(setState);
    
    // Initialize state
    setState({
      transcript: recognizerRef.current.currentTranscript,
      isRecording: recognizerRef.current.recording,
      isAvailable: recognizerRef.current.isAvailable
    });

    return unsubscribe;
  }, []);

  const startTranscribing = React.useCallback(() => {
    recognizerRef.current?.startTranscribing();
  }, []);

  const stopTranscribing = React.useCallback(() => {
    recognizerRef.current?.stopTranscribing();
  }, []);

  const toggleRecording = React.useCallback(() => {
    recognizerRef.current?.toggleRecording();
  }, []);

  const clearTranscript = React.useCallback(() => {
    recognizerRef.current?.clearTranscript();
  }, []);

  return {
    transcript: state.transcript,
    isRecording: state.isRecording,
    isAvailable: state.isAvailable,
    startTranscribing,
    stopTranscribing,
    toggleRecording,
    clearTranscript
  };
};

export default SpeechRecognizer;