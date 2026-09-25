import { useRef, useCallback } from 'react';

// Extend Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<any>(null);

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognitionRef.current = recognition;
    return recognition;
  };

  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recognition = initRecognition();
      if (!recognition) {
        reject(new Error('not-supported'));
        return;
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(event.error)); // 'not-allowed', 'no-speech', etc.
      };

      recognition.onend = () => {
        // If it ended without a result or error firing (sometimes happens), reject with no-speech
        // But since we can't easily tell if it resolved already without state, 
        // we'll rely on onresult/onerror resolving/rejecting first.
      };

      try {
        recognition.start();
      } catch (err) {
        // If it's already started or fails to start
        reject(err);
      }
    });
  }, []);

  const abortListen = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
  }, []);

  return { listen, abortListen };
}
