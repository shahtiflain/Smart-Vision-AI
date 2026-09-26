import React, { useState } from 'react';

interface SettingsScreenProps {
  onClose: () => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  verbosity: 'short' | 'detailed';
  setVerbosity: (v: 'short' | 'detailed') => void;
  speak: (text: string) => void;
  isGuest: boolean;
  saveSettings: (rate: number, verb: 'short' | 'detailed') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  speechRate,
  setSpeechRate,
  verbosity,
  setVerbosity,
  speak,
  isGuest,
  saveSettings
}) => {
  const [localRate, setLocalRate] = useState(speechRate);
  const [localVerbosity, setLocalVerbosity] = useState(verbosity);

  const handleSave = () => {
    setSpeechRate(localRate);
    setVerbosity(localVerbosity);
    saveSettings(localRate, localVerbosity);
    speak('Settings saved.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0E1525] flex flex-col font-sans text-white z-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto flex flex-col p-6 min-h-[100dvh]">
        <div className="flex items-center justify-between mb-10">
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A2033] text-gray-300 hover:text-white transition-colors" aria-label="Go back">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-extrabold tracking-wide text-white" aria-label="Settings">Settings</h2>
          <div className="w-10 h-10"></div> {/* Placeholder for centering */}
        </div>

        <div className="flex flex-col gap-8 flex-1">
          {/* Speech Rate */}
          <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-lg">
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

          {/* Verbosity */}
          <div className="bg-[#151B2B] rounded-[1.25rem] p-5 border border-[#212E47] shadow-lg">
            <span className="block font-bold text-[15px] mb-4 text-white" id="verbosityLabel">Verbosity</span>
            <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="verbosityLabel">
              <button
                onClick={() => setLocalVerbosity('short')}
                className={`p-4 rounded-[1rem] font-bold text-[14px] transition-transform active:scale-95 border ${localVerbosity === 'short' ? 'bg-brand-cyan text-[#0E1525] border-brand-cyan' : 'bg-[#1A2033] text-gray-300 border-[#212E47] hover:border-brand-cyan/50'}`}
                aria-pressed={localVerbosity === 'short'}
                aria-label="Short answers"
              >
                Short
              </button>
              <button
                onClick={() => setLocalVerbosity('detailed')}
                className={`p-4 rounded-[1rem] font-bold text-[14px] transition-transform active:scale-95 border ${localVerbosity === 'detailed' ? 'bg-brand-cyan text-[#0E1525] border-brand-cyan' : 'bg-[#1A2033] text-gray-300 border-[#212E47] hover:border-brand-cyan/50'}`}
                aria-pressed={localVerbosity === 'detailed'}
                aria-label="Detailed answers"
              >
                Detailed
              </button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-[#0D1F1C] rounded-[1.25rem] p-5 border border-[#173A32] shadow-lg mt-auto">
            <div className="flex items-center gap-2 mb-2">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#2FD19E]"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
               <p className="font-bold text-[14px] text-white tracking-wide">Privacy Notice</p>
            </div>
            <p className="text-[12px] text-gray-400 leading-relaxed font-medium">
              Images are sent to Google's Gemini for analysis and are <strong className="text-gray-300">not stored</strong> by us. 
              Only text history is saved (for signed-in users only), and it can be deleted at any time.
              {isGuest && ' As a guest, your settings are not saved and no history is kept.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 bg-[#1A2033] border border-[#212E47] text-gray-300 hover:text-white p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-md"
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-cyan text-[#0E1525] p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-lg shadow-cyan-900/20"
            aria-label="Save settings"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};
