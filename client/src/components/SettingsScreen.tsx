import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

interface SettingsScreenProps {
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  verbosity: 'short' | 'detailed';
  setVerbosity: (v: 'short' | 'detailed') => void;
  speak: (text: string) => void;
  saveSettings: (rate: number, verb: 'short' | 'detailed') => void;
  user: any;
  onSignOut: () => void;
  onLogin: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  speechRate,
  setSpeechRate,
  verbosity,
  setVerbosity,
  speak,
  saveSettings,
  user,
  onSignOut,
  onLogin
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [localRate, setLocalRate] = useState(speechRate);
  const [localVerbosity, setLocalVerbosity] = useState(verbosity);

  useEffect(() => {
    document.title = 'Settings — Smart Vision';
  }, []);

  const handleSave = () => {
    setSpeechRate(localRate);
    setVerbosity(localVerbosity);
    saveSettings(localRate, localVerbosity);
    speak('Settings saved.');
    showToast('Settings saved', 'success');
  };

  return (
    <div className="min-h-screen bg-[#0E1525] flex flex-col font-sans text-white">
      <div className="w-full max-w-md mx-auto flex flex-col p-5 min-h-[100dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A2033] text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-cyan" aria-label="Go back">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-extrabold tracking-wide text-white">Settings</h1>
          <div className="w-10 h-10" /> {/* Spacer for centering */}
        </div>

        <div className="flex flex-col gap-6 flex-1">

          {/* Voice & Audio Section */}
          <section aria-labelledby="voiceAudioHeading">
            <h2 id="voiceAudioHeading" className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Voice &amp; Audio</h2>
            
            {/* Speech Rate */}
            <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-md">
              <label htmlFor="speechRate" className="flex items-center justify-between font-bold text-[15px] mb-4 text-white">
                <span>Speech Rate</span>
                <span className="text-brand-cyan">{localRate.toFixed(1)}x</span>
              </label>
              <div className="relative flex items-center h-8">
                <input
                  id="speechRate"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={localRate}
                  onChange={(e) => setLocalRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#0E1525] rounded-full appearance-none cursor-pointer border border-[#212E47] accent-brand-cyan"
                  aria-label={`Speech Rate, currently ${localRate.toFixed(1)} times normal speed`}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 font-semibold mt-2 px-1">
                 <span>Slower</span>
                 <span>Faster</span>
              </div>
            </div>
          </section>

          {/* Accessibility Section */}
          <section aria-labelledby="accessibilityHeading">
            <h2 id="accessibilityHeading" className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Accessibility</h2>
            
            {/* Verbosity */}
            <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-md">
              <span className="block font-bold text-[15px] mb-4 text-white" id="verbosityLabel">Response Detail</span>
              <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="verbosityLabel">
                <button
                  onClick={() => setLocalVerbosity('short')}
                  className={`p-4 rounded-[1rem] font-bold text-[14px] transition-transform active:scale-95 border focus:outline-none focus:ring-2 focus:ring-brand-cyan ${localVerbosity === 'short' ? 'bg-brand-cyan text-[#0E1525] border-brand-cyan' : 'bg-[#1A2033] text-gray-300 border-[#212E47] hover:border-brand-cyan/50'}`}
                  aria-pressed={localVerbosity === 'short'}
                  aria-label="Short answers"
                >
                  Short
                </button>
                <button
                  onClick={() => setLocalVerbosity('detailed')}
                  className={`p-4 rounded-[1rem] font-bold text-[14px] transition-transform active:scale-95 border focus:outline-none focus:ring-2 focus:ring-brand-cyan ${localVerbosity === 'detailed' ? 'bg-brand-cyan text-[#0E1525] border-brand-cyan' : 'bg-[#1A2033] text-gray-300 border-[#212E47] hover:border-brand-cyan/50'}`}
                  aria-pressed={localVerbosity === 'detailed'}
                  aria-label="Detailed answers"
                >
                  Detailed
                </button>
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section aria-labelledby="accountHeading">
            <h2 id="accountHeading" className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Account</h2>
            <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-md">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan shrink-0">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-white truncate">{user.displayName || 'Signed in'}</p>
                      <p className="text-[12px] text-gray-500 font-medium truncate">{user.email || ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 rounded-[1rem] text-[13px] font-bold border border-[#212E47] text-gray-300 hover:text-white bg-[#1A2033] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    aria-label="Sign out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-white">Guest Mode</p>
                    <p className="text-[12px] text-gray-500 font-medium">Sign in to save history and preferences</p>
                  </div>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 rounded-[1rem] text-[13px] font-bold border border-brand-cyan/50 text-brand-cyan bg-[#1A2033] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    aria-label="Login"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Application Section */}
          <section aria-labelledby="applicationHeading">
            <h2 id="applicationHeading" className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Application</h2>
            <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-md">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 512 512" className="w-8 h-8 rounded-lg shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect width="512" height="512" rx="112" fill="#0B0F14"/>
                  <g>
                    <path d="M64 256 C 130 150, 382 150, 448 256 C 382 362, 130 362, 64 256 Z" fill="none" stroke="#06B6D4" strokeWidth="26" strokeLinejoin="round"/>
                    <circle cx="256" cy="256" r="86" fill="#06B6D4"/>
                    <circle cx="256" cy="256" r="86" fill="none" stroke="#0B0F14" strokeWidth="6"/>
                    <circle cx="256" cy="256" r="38" fill="#0B0F14"/>
                    <circle cx="284" cy="228" r="16" fill="#F8FAFC" opacity="0.9"/>
                  </g>
                </svg>
                <div>
                  <p className="text-[14px] font-bold text-white">Smart Vision</p>
                  <p className="text-[12px] text-gray-500 font-medium">AI Vision Assistant</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-[#1A2033] border border-[#212E47] text-gray-300 hover:text-white p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            aria-label="Cancel and go back"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-cyan text-[#0E1525] p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-lg shadow-cyan-900/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Save settings"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};
