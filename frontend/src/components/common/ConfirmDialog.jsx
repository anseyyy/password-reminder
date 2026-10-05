'use client';

import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action? This cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  variant = 'danger',
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onClose} size="small">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626] shadow-2xs">
          <Trash2 size={22} strokeWidth={2} />
        </div>

        <h3 className="mt-4 text-[17px] font-semibold text-[#182028]">
          {title}
        </h3>

        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#8F999F]">
          {message}
        </p>

        <div className="mt-6 flex w-full items-center justify-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-[11px] border border-[#E9EDEF] bg-white py-2.5 text-xs font-semibold text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] disabled:opacity-50"
          >
            {cancelText}
          </button>

          <Button
            type="button"
            variant={variant}
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 min-h-[40px] text-xs gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
