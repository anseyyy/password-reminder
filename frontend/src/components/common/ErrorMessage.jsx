'use client';

import React from 'react';
import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  message,
  onRetry,
  variant = 'alert', // 'alert' | 'banner' | 'card'
  className = '',
}) {
  if (!message) return null;

  if (variant === 'card') {
    return (
      <div className={`flex flex-col items-center justify-center rounded-[16px] border border-[#FCA5A5] bg-[#FFF1F1] p-6 text-center text-[#C24141] shadow-2xs ${className}`}>
        <XCircle size={32} className="text-[#EF4444]" />
        <h3 className="mt-2 text-sm font-semibold">Something went wrong</h3>
        <p className="mt-1 max-w-md text-xs text-[#991B1B]">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#EF4444] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#DC2626]"
          >
            <RefreshCw size={12} />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-[10px] border border-[#FCA5A5] bg-[#FFF1F1] px-3.5 py-2.5 text-xs text-[#C24141] ${className}`}
    >
      <AlertCircle size={15} className="shrink-0 text-[#EF4444]" />
      <span className="flex-1 leading-snug">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 cursor-pointer font-semibold underline hover:text-[#991B1B]"
        >
          Retry
        </button>
      )}
    </div>
  );
}
