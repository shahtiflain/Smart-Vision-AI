import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Page Not Found — Smart Vision';
  }, []);

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
          <p className="text-[48px] font-extrabold tracking-wide text-brand-cyan mb-2">404</p>
          <h1 className="text-xl font-extrabold tracking-wide mb-2">Page not found</h1>
          <p className="text-[14px] text-gray-400 font-medium">The page you're looking for doesn't exist.</p>
        </div>

        <Link
          to="/"
          className="w-full bg-brand-cyan text-[#0E1525] p-4 rounded-[1.25rem] font-extrabold text-[15px] transition-transform active:scale-95 shadow-lg text-center"
          aria-label="Return to Smart Vision home page"
        >
          Return to Smart Vision
        </Link>
      </div>
    </div>
  );
};
