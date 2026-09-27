import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — above stop button but below modals */}
      <div className="fixed bottom-28 left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none px-5" aria-live="polite" aria-relevant="additions">
        {toasts.map(toast => (
          <ToastNotification key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastNotification: React.FC<{ toast: ToastItem; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = toast.type === 'error'
    ? 'bg-[#2A1515] border-[#570606] text-[#FFB4B4]'
    : toast.type === 'success'
    ? 'bg-[#0D1F1C] border-[#173A32] text-[#2FD19E]'
    : 'bg-[#151B2B] border-[#212E47] text-gray-200';

  return (
    <div
      role="status"
      className={`w-full max-w-md pointer-events-auto rounded-[1rem] border px-4 py-3 text-[14px] font-medium shadow-lg flex items-center justify-between gap-3 motion-safe:transition-all motion-safe:duration-200 ${bgColor} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};
