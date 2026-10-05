'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'medium',
  className = '',
}) {
  const isVisible = open !== undefined ? open : isOpen;

  // Handle escape key and body scroll locking
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const sizeClasses = {
    small: 'max-w-[420px]',
    medium: 'max-w-[500px]',
    large: 'max-w-[640px]',
    xlarge: 'max-w-[800px]',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 flex w-full flex-col rounded-[20px] border border-[#E9EDEF] bg-white p-6 shadow-[0_12px_40px_rgba(20,30,40,0.12)] transition-all animate-in zoom-in-95 duration-150 sm:p-7 max-h-[90vh] overflow-hidden ${
          sizeClasses[size] || sizeClasses.medium
        } ${className}`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-start justify-between border-b border-[#F0F3F5] pb-4 shrink-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-[18px] font-semibold text-[#182028]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[#8F999F]">{description}</p>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#F5F6F8] hover:text-[#182028]"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[#F0F3F5] pt-4 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
