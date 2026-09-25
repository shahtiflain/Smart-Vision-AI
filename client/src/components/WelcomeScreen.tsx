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
        setError('Authentication failed. ' + (err.message || ''));
        speak('Authentication failed.');
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
          setError('Authentication failed. ' + (redirectErr.message || ''));
          speak('Authentication failed.');
          setIsLoading(false);
        }
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
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-50 overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold text-white mb-2" aria-label="Welcome to Smart Vision Assistant">Smart Vision</h1>
        <p className="text-xl text-gray-400 mb-10">Your AI-powered visual assistant</p>
        
        {error && (
          <div aria-live="assertive" className="bg-red-900/50 text-red-200 p-4 rounded-xl mb-6 w-full text-left font-medium">
            {error}
          </div>
        )}

        <div className="w-full space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xl font-bold p-5 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-3"
            aria-label="Continue with Google"
          >
            {isLoading ? 'Waiting...' : 'Continue with Google'}
          </button>
          
          <button
            onClick={handleGuest}
            disabled={isLoading}
            className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 text-white text-xl font-bold p-5 rounded-2xl shadow-lg transition-colors"
            aria-label="Continue as Guest"
          >
            Continue as Guest
          </button>
        </div>
        
        <div className="mt-12 text-sm text-gray-500 max-w-sm" aria-label="Privacy Notice">
          Privacy Notice: Camera frames are sent securely to Google Gemini for analysis and are never stored. No images are saved by this app.
        </div>
      </div>
    </div>
  );
};
