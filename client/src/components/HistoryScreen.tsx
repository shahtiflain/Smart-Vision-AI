import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

const getApiUrl = (path: string) => `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}${path}`;

interface HistoryRecord {
  _id: string;
  intent: string;
  question?: string;
  response: string;
  createdAt: string;
}

interface HistoryScreenProps {
  getHeaders: () => Promise<Record<string, string>>;
  speak: (text: string) => void;
}

const SkeletonCard: React.FC = () => (
  <li className="bg-[#151B2B] p-5 rounded-[1.25rem] border border-[#212E47]" aria-hidden="true">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-4 h-4 rounded-full bg-[#1A2033] skeleton-pulse" />
      <div className="h-3 w-28 rounded bg-[#1A2033] skeleton-pulse" />
    </div>
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-[#1A2033] skeleton-pulse" />
      <div className="h-3 w-4/5 rounded bg-[#1A2033] skeleton-pulse" />
      <div className="h-3 w-3/5 rounded bg-[#1A2033] skeleton-pulse" />
    </div>
  </li>
);

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ getHeaders, speak }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    document.title = 'Scene History — Smart Vision';
  }, []);

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
        showToast('History cleared', 'success');
        setConfirmClear(false);
      }
    } catch (err) {
      speak('Failed to clear history.');
      showToast('Failed to clear history', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1525] flex flex-col font-sans text-white">
      <div className="w-full max-w-md mx-auto flex flex-col h-[100dvh] relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 flex-shrink-0">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A2033] text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-cyan" aria-label="Go back">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-extrabold tracking-wide text-white">History</h1>
          <div className="w-10 h-10" /> {/* Spacer for centering */}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-5 pb-[100px]">
          {/* Skeleton Loading */}
          {loading && (
            <ul className="space-y-4" aria-label="Loading history" role="status">
              <span className="sr-only">Loading history entries</span>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </ul>
          )}

          {/* Error */}
          {error && (
            <div className="bg-[#2A1515] text-[#FFB4B4] border border-[#570606] p-4 rounded-[1.25rem] w-full text-center font-medium text-[13px]" aria-live="assertive">
              {error}
            </div>
          )}
          
          {/* Empty State */}
          {!loading && history.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-12 h-12 text-gray-600 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" /></svg>
              <div className="text-center">
                <p className="text-[16px] font-bold text-gray-400 mb-1">No history yet</p>
                <p className="text-[13px] text-gray-500 font-medium">Your scene descriptions and OCR results will appear here.</p>
              </div>
            </div>
          )}

          {/* History List */}
          {!loading && history.length > 0 && (
            <ul className="space-y-4" aria-label="Scene history entries">
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
          )}
        </div>

        {/* Footer Fixed Action */}
        <div className="absolute bottom-6 left-5 right-5 z-10 flex-shrink-0 bg-[#0E1525]">
          <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-[#0E1525] to-transparent pointer-events-none"></div>
          <button
            onClick={handleClearHistory}
            disabled={loading || history.length === 0}
            className={`w-full p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 border focus:outline-none focus:ring-2 focus:ring-brand-cyan ${
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
