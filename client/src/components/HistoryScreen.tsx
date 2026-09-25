import React, { useEffect, useState, useRef } from 'react';

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
      const res = await fetch('/api/history?limit=20', { headers });
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
      const res = await fetch('/api/history', { method: 'DELETE', headers });
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
    <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden pt-10">
      <div className="flex justify-between items-center px-6 mb-4 flex-shrink-0">
        <h2 className="text-3xl font-bold text-white" aria-label="Interaction History">History</h2>
        <button
          onClick={onClose}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold"
          aria-label="Close history"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        {loading && <p className="text-gray-400" aria-live="polite">Loading history...</p>}
        {error && <p className="text-red-400" aria-live="assertive">{error}</p>}
        
        {!loading && history.length === 0 && !error && (
          <p className="text-gray-500 text-lg mt-10 text-center">No history found.</p>
        )}

        <ul className="space-y-4" aria-label="History list">
          {history.map((item) => (
            <li key={item._id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-white">
              <p className="text-xs text-gray-500 mb-2">{new Date(item.createdAt).toLocaleString()}</p>
              {item.question && (
                <p className="font-semibold text-blue-300 mb-1" aria-label={`You asked: ${item.question}`}>Q: {item.question}</p>
              )}
              <p className="text-gray-300" aria-label={`Response: ${item.response}`}>{item.response}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 bg-black border-t border-gray-800 flex-shrink-0">
        <button
          onClick={handleClearHistory}
          disabled={loading || history.length === 0}
          className={`w-full p-4 rounded-xl font-bold text-xl transition-colors text-white ${
            confirmClear ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-700'
          } disabled:opacity-50`}
          aria-label={confirmClear ? "Confirm clear history" : "Clear history"}
        >
          {confirmClear ? "Confirm Clear" : "Clear History"}
        </button>
      </div>
    </div>
  );
};
