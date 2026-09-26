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
    <div className="fixed inset-0 bg-gradient-to-b from-brand-bg-start to-brand-bg-end flex flex-col items-center justify-start p-6 z-50 overflow-y-auto pt-10 font-sans text-brand-text">
      <div className="w-full max-w-md flex flex-col text-brand-text">
        <h2 className="text-4xl font-bold mb-8 text-center" aria-label="Settings">Settings</h2>

        <div className="mb-8">
          <label htmlFor="speechRate" className="block text-2xl font-bold mb-4">
            Speech Rate: {localRate.toFixed(1)}x
          </label>
          <input
            id="speechRate"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={localRate}
            onChange={(e) => setLocalRate(parseFloat(e.target.value))}
            className="w-full h-3 bg-brand-text appearance-none cursor-pointer border-2 border-brand-text"
            aria-label={`Speech Rate, currently ${localRate.toFixed(1)} times normal speed`}
          />
        </div>

        <div className="mb-8">
          <span className="block text-2xl font-bold mb-4" id="verbosityLabel">Verbosity</span>
          <div className="flex gap-4" role="group" aria-labelledby="verbosityLabel">
            <button
              onClick={() => setLocalVerbosity('short')}
              className={`flex-1 p-5 border-2 font-bold text-xl transition-colors ${localVerbosity === 'short' ? 'bg-brand-secondary border-brand-secondary text-brand-bg' : 'bg-transparent border-brand-text text-brand-text hover:bg-gray-800'}`}
              aria-pressed={localVerbosity === 'short'}
              aria-label="Short answers"
            >
              Short
            </button>
            <button
              onClick={() => setLocalVerbosity('detailed')}
              className={`flex-1 p-5 border-2 font-bold text-xl transition-colors ${localVerbosity === 'detailed' ? 'bg-brand-secondary border-brand-secondary text-brand-bg' : 'bg-transparent border-brand-text text-brand-text hover:bg-gray-800'}`}
              aria-pressed={localVerbosity === 'detailed'}
              aria-label="Detailed answers"
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border-2 border-brand-text text-brand-text hover:bg-gray-800 p-5 font-bold text-xl transition-colors"
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-primary border-2 border-brand-primary text-brand-bg hover:bg-[#c98729] p-5 font-bold text-xl transition-colors"
            aria-label="Save settings"
          >
            Save
          </button>
        </div>

        <div className="mt-12 text-lg text-gray-300 border-2 border-gray-700 p-5">
          <p className="font-bold text-brand-text mb-2">Privacy Notice</p>
          <p>
            Images are sent to Google's Gemini for analysis and are not stored by us. 
            Only text history is saved (for signed-in users only), and it can be deleted at any time.
            {isGuest && ' As a guest, your settings are not saved and no history is kept.'}
          </p>
        </div>
      </div>
    </div>
  );
};
