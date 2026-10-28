/**
 * Live Speech-to-Text Recognition Service for Google Meet / Zoom style captions.
 * Uses Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 */

// Extend window definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface SpeechListenerOptions {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  lang?: string;
}

export class LiveSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private options: SpeechListenerOptions | null = null;

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start(options: SpeechListenerOptions): boolean {
    if (!this.recognition) return false;

    this.options = options;
    this.shouldKeepListening = true;
    this.recognition.lang = options.lang || 'en-US';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const trimmed = transcript.trim();
          if (trimmed.length > 0 && this.options) {
            this.options.onFinal(trimmed);
          }
        } else {
          interim += transcript;
        }
      }
      if (interim.length > 0 && this.options?.onInterim) {
        this.options.onInterim(interim);
      }
    };

    this.recognition.onerror = (event: any) => {
      // Don't crash on 'no-speech' or 'aborted' - just log
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition warning:', event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if user still has speech captions active
      if (this.shouldKeepListening) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch {
          // Handled on next cycle
        }
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      return false;
    }
  }

  public stop(): void {
    this.shouldKeepListening = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
      this.isListening = false;
    }
  }
}

export const speechRecognizer = new LiveSpeechRecognizer();
