import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Smart Vision Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0E1525] flex flex-col items-center justify-center font-sans text-white px-6">
          <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
            <svg viewBox="0 0 512 512" className="w-16 h-16 rounded-2xl opacity-60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
              <h1 className="text-xl font-extrabold tracking-wide mb-2">Something went wrong</h1>
              <p className="text-[14px] text-gray-400 font-medium">An unexpected error occurred. Please try again.</p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-brand-cyan text-[#0E1525] p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-lg"
                aria-label="Reload the application"
              >
                Reload
              </button>
              <a
                href="/"
                className="flex-1 bg-[#1A2033] border border-[#212E47] text-gray-300 hover:text-white p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-md text-center"
                aria-label="Go to home page"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
