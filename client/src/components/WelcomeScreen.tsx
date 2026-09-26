import React, { useState, useEffect } from 'react';
import { auth } from '../utils/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

interface WelcomeScreenProps {
  onGuest: () => void;
  speak: (text: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGuest, speak }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    
    setIsLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          speak('Signed in with Google successfully.');
        }
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('Redirect Sign-In Error:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
          setError('Authentication failed. ' + (err.message || ''));
          speak('Authentication failed.');
        }
        setIsLoading(false);
      });
  }, [speak]);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('Firebase is not configured. Please check your .env file.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      speak('Signed in with Google successfully.');
      // When successful, App.tsx's onAuthStateChanged will hide this screen automatically
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        try {
          speak('Popup blocked, redirecting to sign in.');
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error('Redirect Error:', redirectErr);
          if (redirectErr.code !== 'auth/popup-closed-by-user') {
            setError('Authentication failed. ' + (redirectErr.message || ''));
            speak('Authentication failed.');
          }
          setIsLoading(false);
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User just closed the popup, do nothing
        setIsLoading(false);
      } else {
        console.error('Google Sign-In Error:', err);
        setError('Authentication failed. ' + (err.message || ''));
        speak('Authentication failed.');
        setIsLoading(false);
      }
    }
  };

  const handleGuest = () => {
    speak('Continuing as guest.');
    onGuest();
  };

  return (
    <div className="fixed inset-0 bg-[#0E1525] flex flex-col font-sans text-white z-50 overflow-y-auto">
      {/* Decorative background shape */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,_var(--color-brand-cyan)_0%,_transparent_60%)] opacity-5 pointer-events-none" aria-hidden="true"></div>

      <div className="w-full max-w-md mx-auto flex flex-col p-6 min-h-[100dvh] justify-center items-center z-10 relative">
        <div className="w-20 h-20 rounded-[1.5rem] bg-brand-cyan flex items-center justify-center text-[#0E1525] mb-8 shadow-[0_8px_30px_rgb(63,182,232,0.3)]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        </div>
        
        <h1 className="text-[28px] font-extrabold tracking-wide mb-2 text-white" aria-label="Welcome to Smart Vision Assistant">Smart Vision</h1>
        <p className="text-[14px] text-gray-400 font-medium mb-12">Tactile Assistant</p>
        
        {error && (
          <div aria-live="assertive" className="bg-[#2A1515] text-[#FFB4B4] border border-[#570606] p-4 rounded-[1.25rem] mb-8 w-full text-left font-medium text-[13px]">
            {error}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-[#0E1525] hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 text-[16px] font-extrabold p-5 rounded-[1.25rem] transition-transform active:scale-95 flex items-center justify-center gap-3 shadow-lg"
            aria-label="Continue with Google"
          >
            {isLoading ? 'Waiting...' : 'Continue with Google'}
          </button>
          
          <button
            onClick={handleGuest}
            disabled={isLoading}
            className="w-full bg-[#1A2033] border border-[#212E47] text-gray-300 hover:text-white active:bg-[#212E47] disabled:opacity-50 text-[16px] font-extrabold p-5 rounded-[1.25rem] transition-transform active:scale-95 shadow-md"
            aria-label="Continue as Guest"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
