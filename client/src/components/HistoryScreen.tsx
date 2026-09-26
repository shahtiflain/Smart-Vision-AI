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
    <div className="fixed inset-0 bg-[#0E1525] flex flex-col font-sans text-white z-50 overflow-hidden">
      <div className="w-full max-w-md mx-auto flex flex-col h-full relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 flex-shrink-0">
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A2033] text-gray-300 hover:text-white transition-colors" aria-label="Go back">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-extrabold tracking-wide text-white" aria-label="Interaction History">History</h2>
          <div className="w-10 h-10"></div> {/* Spacer for centering */}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-6 pb-[120px]">
          {loading && (
            <div className="flex justify-center mt-10">
              <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin" aria-live="polite" aria-label="Loading history"></div>
            </div>
          )}
          {error && (
            <div className="bg-[#2A1515] text-[#FFB4B4] border border-[#570606] p-4 rounded-[1.25rem] w-full text-center font-medium text-[13px]" aria-live="assertive">
              {error}
            </div>
          )}
          
          {!loading && history.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-500 gap-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              <p className="text-[15px] font-medium text-center">No history found.</p>
            </div>
          )}

          <ul className="space-y-4" aria-label="History list">
            {history.map((item) => (
              <li key={item._id} className="bg-[#151B2B] p-5 rounded-[1.25rem] border border-[#212E47] shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-500"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>
                  <p className="text-[12px] font-bold text-gray-500 tracking-wide">{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                {item.question && (
                  <div className="mb-3">
                    <p className="font-bold text-brand-cyan text-[14px] mb-1" aria-label={`You asked: ${item.question}`}>Q: {item.question}</p>
                  </div>
                )}
                <p className="text-gray-200 text-[14px] leading-relaxed font-medium" aria-label={`Response: ${item.response}`}>{item.response}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Fixed Action */}
        <div className="absolute bottom-6 left-6 right-6 z-10 flex-shrink-0 bg-[#0E1525]">
          <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-[#0E1525] to-transparent pointer-events-none"></div>
          <button
            onClick={handleClearHistory}
            disabled={loading || history.length === 0}
            className={`w-full p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 border ${
              confirmClear 
                ? 'bg-[#661313] text-[#FFB4B4] border-[#8C1B1B] hover:bg-[#781B1B]' 
                : 'bg-[#1A2033] border-[#212E47] text-gray-300 hover:text-white'
            } disabled:opacity-50 disabled:active:scale-100`}
            aria-label={confirmClear ? "Confirm clear history" : "Clear history"}
          >
            {confirmClear && (
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" /></svg>
            )}
            {confirmClear ? "Confirm Clear" : "Clear History"}
          </button>
        </div>

      </div>
    </div>
  );
};
