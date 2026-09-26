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
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number>(0);

  useEffect(() => {
    if (!isAnalyzing && !isListening) setActiveAction(null);
  }, [isAnalyzing, isListening]);

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

  let statusText = 'Ready';
  if (cameraError) statusText = 'Error';
  else if (isListening) statusText = 'Listening...';
  else if (isAnalyzing) statusText = 'Analyzing...';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg-start to-brand-bg-end flex flex-col font-sans text-brand-text w-full max-w-md mx-auto relative h-[100dvh] overflow-hidden">
      
      {/* Decorative background shape */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,_var(--color-brand-cyan)_0%,_transparent_60%)] opacity-10 pointer-events-none" aria-hidden="true"></div>

      {/* Header */}
      <div className="flex justify-between items-center p-5 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-brand-cyan">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight text-white">
              Smart <span className="text-brand-cyan">Vision</span>
            </h1>
            <span className="text-[10px] tracking-[0.2em] text-gray-400 font-semibold uppercase">Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5 transition-colors hover:bg-white/20" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-200">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          {user ? (
            <button onClick={() => { signOut(auth!); speak('Signed out.'); }} className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-sm font-semibold flex items-center gap-2 border border-blue-500/50" aria-label="Sign out">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
              Out
            </button>
          ) : (
            <button onClick={() => { setHasChosenGuest(false); localStorage.setItem('guestMode', 'false'); }} className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 text-sm font-semibold flex items-center gap-2 border border-blue-500/50" aria-label="Login">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
              Login
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 z-10 flex flex-col gap-4">
        
        {/* Camera Card */}
        <div className="relative w-full h-56 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] bg-brand-blue-card">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-brand-red-start font-bold">
              {cameraError}
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Top Left Badge */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-xs font-semibold text-white tracking-wide">
               {!isReady ? 'Loading...' : cameraError ? 'Camera Error' : 'Camera Ready'}
            </span>
          </div>

          {/* Top Right Expand */}
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/80" aria-label="Expand camera">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>

          {/* Center Content (Viewfinder + Status) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
            <div className="sr-only" aria-live="polite" aria-atomic="true">{statusText}</div>
            {isAnalyzing || isListening ? (
               <div className="text-2xl font-bold text-white bg-black/60 px-6 py-3 rounded-full backdrop-blur-md animate-pulse border border-white/10" aria-hidden="true">
                 {statusText}
               </div>
            ) : (
               <>
                 <div className="relative w-16 h-16 flex items-center justify-center opacity-80" aria-hidden="true">
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-md"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-md"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-md"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-md"></div>
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
                 <p className="mt-4 text-[11px] text-brand-text-muted font-medium text-center leading-tight">
                   Point at anything to get started<br/>Tap a feature below to start
                 </p>
               </>
            )}
          </div>
        </div>

        {/* 3 Equal Cards Row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {/* Describe */}
          <button onClick={() => { setActiveAction('describe'); handleDescribe(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-brand-blue-card rounded-[1.25rem] p-4 flex flex-col border border-white/10 relative text-left overflow-hidden ${activeAction === 'describe' ? 'ring-2 ring-brand-cyan' : ''} disabled:opacity-50 transition-transform active:scale-95`} aria-label="Describe: Get detailed description of what you see">
            <div className="w-10 h-10 rounded-full bg-blue-400/20 text-blue-400 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="font-bold text-[13px] text-white leading-tight mb-1 tracking-wide">Describe</h3>
            <p className="text-[10px] text-brand-text-muted leading-tight pr-4">Get detailed description of what you see</p>
            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
          
          {/* Read Text */}
          <button onClick={() => { setActiveAction('read'); handleRead(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-brand-purple-card rounded-[1.25rem] p-4 flex flex-col border border-white/10 relative text-left overflow-hidden ${activeAction === 'read' ? 'ring-2 ring-purple-400' : ''} disabled:opacity-50 transition-transform active:scale-95`} aria-label="Read Text: Extract and read text from images">
            <div className="w-10 h-10 rounded-full bg-purple-400/20 text-purple-400 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm4.875 17.25a.75.75 0 000-1.5h-5.25a.75.75 0 000 1.5h5.25zm.75-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75zm0-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75zm0-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="font-bold text-[13px] text-white leading-tight mb-1 tracking-wide">Read Text</h3>
            <p className="text-[10px] text-brand-text-muted leading-tight pr-4">Extract and read text from images</p>
            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          {/* Detect Objects */}
          <button onClick={() => { setActiveAction('ahead'); handleDetectObjects(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-brand-green-card rounded-[1.25rem] p-4 flex flex-col border border-white/10 relative text-left overflow-hidden ${activeAction === 'ahead' ? 'ring-2 ring-emerald-400' : ''} disabled:opacity-50 transition-transform active:scale-95`} aria-label="Detect Objects: Identify objects around you">
            <div className="w-10 h-10 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="font-bold text-[13px] text-white leading-tight mb-1 tracking-wide">Detect Objects</h3>
            <p className="text-[10px] text-brand-text-muted leading-tight pr-4">Identify objects around you</p>
            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>

        {/* 2 Equal Cards Row */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* Ask Assistant */}
          <button onClick={() => { setActiveAction('assistant'); handleAssistant(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-gradient-to-br from-brand-amber-start to-brand-amber-end rounded-[1.25rem] p-4 flex flex-row items-center gap-3 border border-white/10 relative text-left ${activeAction === 'assistant' ? 'ring-2 ring-white' : ''} disabled:opacity-50 transition-transform active:scale-95`} aria-label="Ask Assistant: Get answers about what you see">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-black/20 text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" /></svg>
            </div>
            <div className="flex flex-col pr-6">
              <h3 className="font-bold text-[14px] text-white mb-0.5 tracking-wide">Ask Assistant</h3>
              <p className="text-[11px] text-white/80 leading-tight">Get answers about what you see</p>
            </div>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-white/80">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          {/* History */}
          <button onClick={() => setShowHistory(true)} className="bg-brand-indigo rounded-[1.25rem] p-4 flex flex-row items-center gap-3 border border-white/5 relative text-left transition-transform active:scale-95" aria-label="History: View your previous scans and results">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>
            </div>
            <div className="flex flex-col pr-6">
              <h3 className="font-bold text-[14px] text-white mb-0.5 tracking-wide">History</h3>
              <p className="text-[11px] text-brand-text-muted leading-tight">View your previous scans and results</p>
            </div>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>

      </div>

      {/* Fixed Bottom Stop Button */}
      <div className="absolute bottom-6 left-5 right-5 z-20">
        <button
          onClick={handleStop}
          className="w-full bg-gradient-to-r from-brand-red-start to-brand-red-end rounded-[1.5rem] p-4 flex items-center shadow-[0_8px_30px_rgb(220,38,38,0.3)] transition-transform active:scale-95"
          aria-label="Stop: Stop current operation"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center ml-2">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
          </div>
          <div className="flex flex-col ml-4 text-left">
            <span className="text-2xl font-extrabold text-white leading-none">Stop</span>
            <span className="text-[11px] text-white/80 mt-1 font-medium">Stop current operation</span>
          </div>
        </button>
      </div>

    </div>
  );
}

export default App;
