import React, { useRef, useState, useEffect } from 'react';
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

const checkConnectivity = async (): Promise<boolean> => {
  try {
    // Ping a static asset that shouldn't be blocked by CORS or rate limits
    const res = await fetch('/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' });
    return res.ok || res.status === 404; // As long as we get a response, we're online
  } catch (e) {
    return false;
  }
};

const CameraView = React.memo(({ videoRef, cameraError, hasTorch, torchOn, toggleTorch }: { videoRef: any, cameraError: string | null, hasTorch: boolean, torchOn: boolean, toggleTorch: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden border border-[#212E47] bg-black flex-shrink-0 shadow-lg transform-gpu ${isFullscreen ? 'h-screen rounded-none z-[100]' : 'h-56 rounded-[1.25rem]'}`}>
      {cameraError ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-500 font-bold z-10">
          {cameraError}
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
      )}
      {/* Clean Camera UI - Flash and Maximize ONLY */}
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        {hasTorch && (
          <button onClick={toggleTorch} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${torchOn ? 'bg-brand-cyan text-black border-brand-cyan' : 'bg-black/80 text-white border-white/20 active:bg-black'}`} aria-label={torchOn ? 'Turn off camera flashlight' : 'Turn on camera flashlight'} aria-pressed={torchOn}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.96 1.765a.75.75 0 01.996.67l.84 9.065h4.454a.75.75 0 01.554 1.25l-10.5 11.25a.75.75 0 01-1.32-.82l2.368-8.24h-4.6a.75.75 0 01-.652-1.125l7.5-11.25a.75.75 0 011.02-.125l.34.225z" clipRule="evenodd" /></svg>
          </button>
        )}
        <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-black/80 flex items-center justify-center border border-white/20 text-white active:bg-black transition-colors" aria-label={isFullscreen ? 'Minimize camera view' : 'Expand camera view'}>
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          )}
        </button>
      </div>
    </div>
  );
});

function App() {
  const { videoRef, error: cameraError, isReady, captureFrame, hasTorch, torchOn, toggleTorch } = useCamera();
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
  const [isOffline, setIsOffline] = useState(false);

  // We rely on actual fetch failures rather than navigator.onLine
  const markOnline = () => setIsOffline(false);
  const markOffline = () => setIsOffline(true);

  useEffect(() => {
    applySpeechRate(speechRate);
  }, [speechRate]);

  // Ensure the offline flag starts cleared when the app first mounts
  useEffect(() => {
    markOnline();
  }, []);

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

    const handleCatchError = async (err: any) => {
      if (err.name === 'AbortError') {
        // user stopped the request
        markOnline();
        speak('Stopped.');
      } else if (err.code === 'rate_limited') {
        // rate‑limit is a valid server response – keep the app online
        markOnline();
        speak(err.message);
        if (err.retryAfterSeconds) {
          setRateLimitUntil(Date.now() + err.retryAfterSeconds * 1000);
          setTimeout(() => setRateLimitUntil(0), err.retryAfterSeconds * 1000);
        }
      } else if (err.code === 'daily_cap_reached') {
        // daily cap is also a server response
        markOnline();
        speak(err.message);
        setRateLimitUntil(Date.now() + 24 * 60 * 60 * 1000);
      } else if (err.message && err.message.includes('Failed to fetch')) {
        // fetch threw a network error. Let's verify if we're actually offline.
        const isActuallyOnline = await checkConnectivity();
        if (isActuallyOnline) {
          // We have internet, so this is likely a CORS block, a proxy issue, or a crashed backend
          markOnline();
          speak('Server connection failed. Please check the backend service.');
        } else {
          // genuine network-level failure → offline
          markOffline();
          speak('No internet connection. Vision features require an internet connection.');
        }
      } else {
        // any other error (e.g., parsing) – treat as online
        markOnline();
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
      markOnline();

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
      markOnline();

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
      markOnline();

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
      markOnline();

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
    <div className="min-h-screen bg-[#0E1525] flex flex-col font-sans text-white w-full max-w-md mx-auto relative h-[100dvh] overflow-hidden">
      
      {/* Decorative background shape */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,_var(--color-brand-cyan)_0%,_transparent_60%)] opacity-5 pointer-events-none" aria-hidden="true"></div>

      {/* Header */}
      <div className="flex justify-between items-center p-5 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan flex items-center justify-center text-[#0E1525]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[17px] font-bold leading-none text-white tracking-wide">
              Smart Vision
            </h1>
            <span className="text-[11px] text-gray-400 font-medium italic mt-1">Tactile Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-gray-300 hover:text-white bg-[#1A2033]" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </button>
          {user ? (
            <button onClick={() => { signOut(auth!); speak('Signed out.'); }} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-brand-cyan bg-[#1A2033]" aria-label="Sign out">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
            </button>
          ) : (
            <button onClick={() => { setHasChosenGuest(false); localStorage.setItem('guestMode', 'false'); }} className="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border border-brand-cyan/50 text-brand-cyan bg-[#1A2033]" aria-label="Login">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
              Login
            </button>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div 
          className="mx-5 mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm font-medium flex items-center gap-3 z-20 relative"
          role="alert" 
          aria-live="polite"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 00-12.728 0M15.536 8.464a5 5 0 010 7.072M12 12v.01M3 3l18 18" /></svg>
          You're offline. Vision features need an internet connection.
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-[140px] z-10 flex flex-col gap-4 relative">
        
        {/* Real Live Camera (Memoized for Performance) */}
        <CameraView videoRef={videoRef} cameraError={cameraError} hasTorch={hasTorch} torchOn={torchOn} toggleTorch={toggleTorch} />



        {/* PRIMARY ACTION: Describe surroundings */}
        <button
          onClick={() => { setActiveAction('describe'); handleDescribe(); }}
          disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()}
          className={`w-full bg-gradient-to-r from-[#F7A615] to-[#E58C08] rounded-[1.25rem] p-5 flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 min-h-[96px] ${activeAction === 'describe' ? 'ring-4 ring-white ring-opacity-50' : ''}`}
          aria-label="Describe surroundings: Tap to describe what is around you"
        >
          <div className="w-14 h-14 bg-black/10 rounded-full flex items-center justify-center text-[#5C3400] shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex flex-col ml-4 text-left">
            <span className="text-[19px] font-extrabold text-[#381F00] leading-tight tracking-wide">Describe surroundings</span>
            <span className="text-[13px] text-[#7A4500] font-bold mt-1">Tap to describe what is around you</span>
          </div>
          <div className="ml-auto w-12 h-12 rounded-full bg-black/10 flex items-center justify-center text-[#5C3400]">
             <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>
          </div>
        </button>

        {/* 2 Equal Cards Row - Describe / Read Text */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button onClick={() => { setActiveAction('describe'); handleDescribe(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-[#141A28] rounded-[1.25rem] p-4 flex flex-col border border-[#212E47] relative text-left transition-transform active:scale-95 disabled:opacity-50 min-h-[104px] ${activeAction === 'describe' ? 'ring-2 ring-brand-cyan' : ''}`} aria-label="Describe: Get scene overview">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-full bg-[#1A263D] text-[#3FB6E8] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="font-bold text-[15px] text-white">Describe</h3>
            </div>
            <p className="text-[12px] text-gray-400 leading-tight pr-4 mt-1 font-medium">Get scene overview</p>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#1F273B] flex items-center justify-center text-white/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
          
          <button onClick={() => { setActiveAction('read'); handleRead(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-[#1A162B] rounded-[1.25rem] p-4 flex flex-col border border-[#2B2344] relative text-left transition-transform active:scale-95 disabled:opacity-50 min-h-[104px] ${activeAction === 'read' ? 'ring-2 ring-purple-400' : ''}`} aria-label="Read Text: Read signs & labels">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-full bg-[#271E40] text-[#B084E8] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm4.875 17.25a.75.75 0 000-1.5h-5.25a.75.75 0 000 1.5h5.25zm.75-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75zm0-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75zm0-3a.75.75 0 00-.75-.75h-6a.75.75 0 000 1.5h6a.75.75 0 00.75-.75z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="font-bold text-[15px] text-white">Read Text</h3>
            </div>
            <p className="text-[12px] text-gray-400 leading-tight pr-4 mt-1 font-medium">Read signs & labels</p>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#271E40] flex items-center justify-center text-white/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>

        {/* 2 Equal Cards Row - Detect Objects / Ask Assistant */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button onClick={() => { setActiveAction('ahead'); handleDetectObjects(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-[#0D1F1C] rounded-[1.25rem] p-4 flex flex-col border border-[#173A32] relative text-left transition-transform active:scale-95 disabled:opacity-50 min-h-[104px] ${activeAction === 'ahead' ? 'ring-2 ring-emerald-400' : ''}`} aria-label="Detect Objects: Identify items around">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-full bg-[#133029] text-[#2FD19E] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="font-bold text-[15px] text-white">Detect Objects</h3>
            </div>
            <p className="text-[12px] text-gray-400 leading-tight pr-4 mt-1 font-medium">Identify items around</p>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#133029] flex items-center justify-center text-white/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
          
          <button onClick={() => { setActiveAction('assistant'); handleAssistant(); }} disabled={isAnalyzing || isListening || !isReady || rateLimitUntil > Date.now()} className={`bg-[#201D17] rounded-[1.25rem] p-4 flex flex-col border border-[#3D3528] relative text-left transition-transform active:scale-95 disabled:opacity-50 min-h-[104px] ${activeAction === 'assistant' ? 'ring-2 ring-amber-400' : ''}`} aria-label="Ask Assistant: Ask questions on scene">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-full bg-[#383124] text-[#E8AE3F] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="font-bold text-[15px] text-white">Ask Assistant</h3>
            </div>
            <p className="text-[12px] text-gray-400 leading-tight pr-4 mt-1 font-medium">Ask questions on scene</p>
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#383124] flex items-center justify-center text-white/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>

        {/* Scene History Card */}
        <button onClick={() => setShowHistory(true)} className="w-full bg-[#1A1C24] rounded-[1.25rem] p-5 flex items-center border border-[#2A2E3D] relative text-left transition-transform active:scale-95" aria-label="Scene History: Review past descriptions and OCR text">
          <div className="w-11 h-11 rounded-full bg-[#2A2E3D] flex items-center justify-center text-gray-300 mr-4 shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-[16px] text-white mb-0.5">Scene History</h3>
            <p className="text-[13px] text-gray-400 font-medium">Review past descriptions & OCR text</p>
          </div>
          <div className="ml-auto w-6 h-6 rounded-full bg-[#2A2E3D] flex items-center justify-center text-white/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </div>
        </button>


      </div>

      {/* Fixed Bottom Stop Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-md px-5 pb-6 pt-4 pointer-events-auto bg-gradient-to-t from-[#0E1525] via-[#0E1525] to-transparent">
          <button
            onClick={handleStop}
            className="w-full bg-gradient-to-r from-[#FFB4B4] to-[#FF8C8C] rounded-[1.5rem] p-4 flex items-center justify-center shadow-xl shadow-red-900/30 transition-transform active:scale-95 motion-safe:transition-transform border-2 border-transparent focus:border-white"
            aria-label="Stop: Stop current operation"
          >
            <div className="w-10 h-10 rounded-[10px] bg-[#661313] flex items-center justify-center mr-4 shrink-0 shadow-sm">
               <div className="w-4 h-4 border-[3px] border-white rounded-[4px]"></div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[22px] font-extrabold text-[#570606] leading-none tracking-wide">STOP</span>
              <span className="text-[12px] text-[#781B1B] mt-1 font-bold">Stop current operation</span>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}

export default App;
