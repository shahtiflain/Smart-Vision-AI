let speechQueue: string[] = [];
let isSpeakingQueue = false;
let currentSpeechRate = 1.0;

export const setSpeechRate = (rate: number) => {
  currentSpeechRate = rate;
};

export const speak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = currentSpeechRate;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // Resolve anyway on error to not block flow
    
    window.speechSynthesis.speak(utterance);
  });
};

const playNextChunk = async (): Promise<void> => {
  if (speechQueue.length === 0) {
    isSpeakingQueue = false;
    return;
  }
  
  isSpeakingQueue = true;
  const chunk = speechQueue.shift();
  if (chunk) {
    await speak(chunk);
    // After one chunk finishes, play the next one
    await playNextChunk();
  } else {
    isSpeakingQueue = false;
  }
};

export const speakChunked = async (text: string): Promise<void> => {
  if (!('speechSynthesis' in window)) return;
  
  // Clean up any existing queue or speech
  stopSpeaking();
  
  // Split by sentence terminators
  const chunks = text.match(/[^.!?]+[.!?]*/g) || [text];
  
  speechQueue = chunks.map(c => c.trim()).filter(c => c.length > 0);
  
  if (!isSpeakingQueue) {
    await playNextChunk();
  }
};

export const stopSpeaking = () => {
  speechQueue = [];
  isSpeakingQueue = false;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
};
