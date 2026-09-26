import React, { useEffect, useState } from 'react';

const getApiUrl = (path: string) => `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}${path}`;

interface HistoryRecord {
  _id: string;
  intent: string;
  question?: string;
  response: string;
  createdAt: string;
}

interface HistoryScreenProps {
  onClose: () => void;
  getHeaders: () => Promise<Record<string, string>>;
  speak: (text: string) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onClose, getHeaders, speak }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(getApiUrl('/api/history?limit=20'), { headers });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      } else {
        setError(data.error || 'Failed to fetch history');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirmClear) {
      speak('Are you sure you want to clear your history? Tap again to confirm.');
      setConfirmClear(true);
      return;
    }

    try {
      const headers = await getHeaders();
      const res = await fetch(getApiUrl('/api/history'), { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
        speak('History cleared.');
        setConfirmClear(false);
      }
    } catch (err) {
      speak('Failed to clear history.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-brand-bg-start to-brand-bg-end flex flex-col z-50 overflow-hidden pt-10 font-sans text-brand-text">
      <div className="flex justify-between items-center px-6 mb-4 flex-shrink-0">
        <h2 className="text-4xl font-bold text-brand-text" aria-label="Interaction History">History</h2>
        <button
          onClick={onClose}
          className="bg-transparent border-2 border-brand-text text-brand-text hover:bg-gray-800 px-6 py-3 font-bold text-xl transition-colors"
          aria-label="Close history"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {loading && <p className="text-gray-400 text-xl font-bold" aria-live="polite">Loading history...</p>}
        {error && <p className="text-brand-danger text-xl font-bold" aria-live="assertive">{error}</p>}
        
        {!loading && history.length === 0 && !error && (
          <p className="text-gray-400 text-2xl font-bold mt-10 text-center">No history found.</p>
        )}

        <ul className="space-y-6 mt-4" aria-label="History list">
          {history.map((item) => (
            <li key={item._id} className="bg-transparent p-6 border-2 border-gray-700 text-brand-text">
              <p className="text-sm font-bold text-gray-500 mb-3">{new Date(item.createdAt).toLocaleString()}</p>
              {item.question && (
                <p className="font-bold text-brand-secondary text-xl mb-2" aria-label={`You asked: ${item.question}`}>Q: {item.question}</p>
              )}
              <p className="text-brand-text text-lg" aria-label={`Response: ${item.response}`}>{item.response}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 bg-brand-bg-start border-t-2 border-gray-800 flex-shrink-0 absolute bottom-0 left-0 right-0">
        <button
          onClick={handleClearHistory}
          disabled={loading || history.length === 0}
          className={`w-full p-5 font-bold text-xl transition-colors border-2 ${
            confirmClear 
              ? 'bg-brand-danger border-brand-danger text-brand-bg hover:bg-red-700' 
              : 'bg-transparent border-brand-text text-brand-text hover:bg-gray-800'
          } disabled:opacity-50`}
          aria-label={confirmClear ? "Confirm clear history" : "Clear history"}
        >
          {confirmClear ? "Confirm Clear" : "Clear History"}
        </button>
      </div>
    </div>
  );
};
