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
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-start p-6 z-50 overflow-y-auto pt-10">
      <div className="w-full max-w-md flex flex-col text-white">
        <h2 className="text-3xl font-bold mb-8" aria-label="Settings">Settings</h2>

        <div className="mb-8">
          <label htmlFor="speechRate" className="block text-xl font-semibold mb-2">
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
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label={`Speech Rate, currently ${localRate.toFixed(1)} times normal speed`}
          />
        </div>

        <div className="mb-8">
          <span className="block text-xl font-semibold mb-4" id="verbosityLabel">Verbosity</span>
          <div className="flex gap-4" role="group" aria-labelledby="verbosityLabel">
            <button
              onClick={() => setLocalVerbosity('short')}
              className={`flex-1 p-4 rounded-xl font-bold text-lg transition-colors ${localVerbosity === 'short' ? 'bg-blue-600' : 'bg-gray-800'}`}
              aria-pressed={localVerbosity === 'short'}
              aria-label="Short answers"
            >
              Short
            </button>
            <button
              onClick={() => setLocalVerbosity('detailed')}
              className={`flex-1 p-4 rounded-xl font-bold text-lg transition-colors ${localVerbosity === 'detailed' ? 'bg-blue-600' : 'bg-gray-800'}`}
              aria-pressed={localVerbosity === 'detailed'}
              aria-label="Detailed answers"
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 p-4 rounded-xl font-bold text-lg transition-colors"
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold text-lg transition-colors"
            aria-label="Save settings"
          >
            Save
          </button>
        </div>

        <div className="mt-12 text-sm text-gray-500 bg-gray-900 p-4 rounded-xl">
          <p className="font-semibold text-gray-400 mb-2">Privacy Notice</p>
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
