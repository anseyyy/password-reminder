'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, type = 'success', duration = 4000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, duration) => addToast({ message: msg, type: 'success', duration }),
    error: (msg, duration) => addToast({ message: msg, type: 'error', duration }),
    warning: (msg, duration) => addToast({ message: msg, type: 'warning', duration }),
    info: (msg, duration) => addToast({ message: msg, type: 'info', duration }),
  };

  const icons = {
    success: <CheckCircle2 size={16} className="shrink-0 text-[#18A968]" />,
    error: <AlertCircle size={16} className="shrink-0 text-[#EF4444]" />,
    warning: <AlertTriangle size={16} className="shrink-0 text-[#EAB308]" />,
    info: <Info size={16} className="shrink-0 text-[#3B82F6]" />,
  };

  const borders = {
    success: 'border-[#d2eedf] bg-white text-[#182028]',
    error: 'border-[#fecaca] bg-white text-[#182028]',
    warning: 'border-[#fef08a] bg-white text-[#182028]',
    info: 'border-[#bfdbfe] bg-white text-[#182028]',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Fixed Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-[12px] border p-3.5 shadow-[0_8px_24px_rgba(20,30,40,0.08)] backdrop-blur-xs transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              borders[t.type] || borders.info
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icons[t.type] || icons.info}
              <p className="text-xs font-medium leading-relaxed text-[#202830]">
                {t.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="cursor-pointer rounded-md p-1 text-[#8F999F] transition hover:bg-[#F5F6F8] hover:text-[#182028]"
              aria-label="Close notification"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
