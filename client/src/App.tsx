import { useRef, useState, useEffect } from 'react';
import { useCamera } from './hooks/useCamera';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { speak, speakChunked, stopSpeaking } from './utils/speech';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { auth } from './utils/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { setSpeechRate as applySpeechRate } from './utils/speech';
import './App.css';

const getApiUrl = (path: string) => `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}${path}`;

function App() {
  const { videoRef, error: cameraError, isReady, captureFrame } = useCamera();
  const { listen, abortListen } = useSpeechRecognition();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [hasChosenGuest, setHasChosenGuest] = useState(() => localStorage.getItem('guestMode') === 'true');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [verbosity, setVerbosity] = useState<'short' | 'detailed'>('short');

  useEffect(() => {
    applySpeechRate(speechRate);
  }, [speechRate]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch preferences when user signs in
    getHeaders().then(headers => {
      fetch(getApiUrl('/api/preferences'), { headers })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.preferences) {
            setSpeechRate(data.preferences.speechRate);
            setVerbosity(data.preferences.verbosity);
          }
        })
        .catch(err => console.error('Failed to fetch preferences:', err));
    });
  }, [user]);

  const saveSettings = async (rate: number, verb: 'short' | 'detailed') => {
    if (!user) return; // Guests change locally
    try {
      const headers = await getHeaders();
      await fetch(getApiUrl('/api/preferences'), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ speechRate: rate, verbosity: verb })
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Show welcome screen if no user is signed in and they haven't explicitly clicked "Guest"
  const showWelcome = !user && !hasChosenGuest;

    const handleErrorResponse = async (response: Response) => {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.error || 'Server error occurred.');
      if (errorData.code) (err as any).code = errorData.code;
      if (errorData.retryAfterSeconds) (err as any).retryAfterSeconds = errorData.retryAfterSeconds;
      throw err;
    };

    const handleCatchError = (err: any) => {
      if (err.name === 'AbortError') {
        speak('Stopped.');
      } else if (err.code === 'rate_limited') {
        speak(err.message);
        if (err.retryAfterSeconds) {
          setRateLimitUntil(Date.now() + err.retryAfterSeconds * 1000);
          setTimeout(() => setRateLimitUntil(0), err.retryAfterSeconds * 1000);
        }
      } else if (err.code === 'daily_cap_reached') {
        speak(err.message);
        setRateLimitUntil(Date.now() + 24 * 60 * 60 * 1000);
      } else if (err.message && err.message.includes('Failed to fetch')) {
        speak('Network failure. Could not reach the server.');
      } else {
        speak(err.message || 'An error occurred.');
      }
    };

  const getHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleDescribe = async () => {
    if (cameraError) {
      speak(cameraError);
      return;
    }

    const frameData = captureFrame();
    if (!frameData) {
      speak('Could not capture image from camera.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();
    speak('Analyzing');

    try {
      const headers = await getHeaders();
      const response = await fetch(getApiUrl('/api/vision/analyze'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: frameData, verbosity }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      const data = await response.json();
      if (data.success && data.response) {
        speak(data.response);
      } else {
        throw new Error(data.error || 'Unexpected error from server.');
      }
    } catch (err: any) {
      handleCatchError(err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleAssistant = async () => {
    if (cameraError) {
      speak(cameraError);
      return;
    }

    const frameData = captureFrame();
    if (!frameData) {
      speak('Could not capture image from camera.');
      return;
    }

    await speak('Listening');
    
    setIsListening(true);
    let transcript = '';
    
    try {
      transcript = await listen();
    } catch (err: any) {
      setIsListening(false);
      if (err.message === 'not-supported') {
        speak('Voice input is not supported in this browser, please use the Describe button.');
      } else if (err.message === 'not-allowed') {
        speak('Microphone permission denied.');
      } else if (err.message === 'no-speech') {
        speak("I didn't catch that, please try again.");
      } else {
        speak('Speech recognition error.');
      }
      return;
    }

    setIsListening(false);
    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();

    try {
      const headers = await getHeaders();
      const response = await fetch(getApiUrl('/api/assistant/query'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: frameData, question: transcript, verbosity }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      const data = await response.json();
      if (data.success && data.response) {
        if (data.intent === 'read_text') {
          speakChunked(data.response);
        } else {
          speak(data.response);
        }
      } else {
        throw new Error(data.error || 'Unexpected error from server.');
      }
    } catch (err: any) {
      handleCatchError(err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleRead = async () => {
    if (cameraError) {
      speak(cameraError);
      return;
    }

    const frameData = captureFrame(1600);
    if (!frameData) {
      speak('Could not capture image from camera.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();
    speak('Reading');

    try {
      const headers = await getHeaders();
      const response = await fetch(getApiUrl('/api/ocr/read'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: frameData, verbosity }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      const data = await response.json();
      if (data.success && data.response) {
        speakChunked(data.response);
      } else {
        throw new Error(data.error || 'Unexpected error from server.');
      }
    } catch (err: any) {
      handleCatchError(err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleDetectObjects = async () => {
    if (cameraError) {
      speak(cameraError);
      return;
    }

    const frameData = captureFrame();
    if (!frameData) {
      speak('Could not capture image from camera.');
      return;
    }

    setIsAnalyzing(true);
    abortControllerRef.current = new AbortController();
    speak('Looking');

    try {
      const headers = await getHeaders();
      const response = await fetch(getApiUrl('/api/detection/objects'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: frameData, verbosity }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        await handleErrorResponse(response);
      }

      const data = await response.json();
      if (data.success && data.response) {
        speak(data.response);
      } else {
        throw new Error(data.error || 'Unexpected error from server.');
      }
    } catch (err: any) {
      handleCatchError(err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    stopSpeaking();
    abortListen();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (showWelcome) {
    return <WelcomeScreen onGuest={() => {
      setHasChosenGuest(true);
      localStorage.setItem('guestMode', 'true');
    }} speak={speak} />;
  }

  if (showSettings) {
    return (
      <SettingsScreen 
        onClose={() => setShowSettings(false)}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        verbosity={verbosity}
        setVerbosity={setVerbosity}
        speak={speak}
        isGuest={!user}
        saveSettings={saveSettings}
      />
    );
  }

  if (showHistory) {
    return (
      <HistoryScreen
        onClose={() => setShowHistory(false)}
        getHeaders={getHeaders}
        speak={speak}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans text-white max-w-md mx-auto relative h-[100dvh] overflow-hidden">
      
      {/* App Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-4">
        
        {/* Header with Auth */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-100">Smart Vision</h1>
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="View history"
              >
                History
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="Settings"
              >
                ⚙️
              </button>
              <button 
                onClick={() => {
                  signOut(auth!);
                  speak('Signed out.');
                }}
                className="bg-red-900/80 hover:bg-red-800 p-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="Sign out"
              >
                Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="Settings"
              >
                ⚙️
              </button>
              <button 
                onClick={() => {
                  setHasChosenGuest(false);
                  localStorage.setItem('guestMode', 'false');
                }}
                className="bg-gray-800 hover:bg-gray-700 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                aria-label="Back to Login"
              >
                Login
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 w-full bg-gray-900 rounded-2xl overflow-hidden relative border-2 border-gray-800 mb-6 flex items-center justify-center min-h-[40vh]">
          {cameraError ? (
            <div className="text-rose-400 p-6 text-center text-xl font-semibold">
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex flex-col gap-4 mb-2 flex-shrink-0">
          <button
            onClick={handleAssistant}
            disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()}
            className="w-full h-24 sm:h-32 bg-indigo-600 active:bg-indigo-700 disabled:bg-indigo-900 disabled:opacity-50 text-white text-3xl font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center"
            aria-label="Ask assistant"
          >
            {isListening ? 'Listening...' : 'Assistant'}
          </button>

          <div className="grid grid-cols-3 gap-3 w-full">
            <button
              onClick={handleDescribe}
              disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()}
              className="w-full h-20 bg-blue-600 active:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl shadow-lg transition-colors flex items-center justify-center"
              aria-label="Describe surroundings"
            >
              {isAnalyzing && !isListening ? '...' : 'Describe'}
            </button>
            <button
              onClick={handleDetectObjects}
              disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()}
              className="w-full h-20 bg-yellow-600 active:bg-yellow-700 disabled:bg-yellow-900 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl shadow-lg transition-colors flex items-center justify-center"
              aria-label="What's ahead"
            >
              {isAnalyzing && !isListening ? '...' : "Ahead"}
            </button>
            <button
              onClick={handleRead}
              disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()}
              className="w-full h-20 bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-900 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl shadow-lg transition-colors flex items-center justify-center"
              aria-label="Read text from your surroundings"
            >
              {isAnalyzing && !isListening ? '...' : 'Read'}
            </button>
          </div>

          <button
            onClick={handleStop}
            className="w-full h-16 sm:h-20 bg-red-600 active:bg-red-700 text-white text-2xl font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center"
            aria-label="Stop speaking and cancel"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
