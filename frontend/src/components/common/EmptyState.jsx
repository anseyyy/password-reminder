'use client';

import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'Get started by creating your first entry.',
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[18px] border border-[#E9EDEF] bg-white p-10 text-center shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-14 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF9F4] text-[#168F5A] shadow-2xs">
        <Icon size={26} strokeWidth={1.8} />
      </div>

      <h3 className="mt-4 text-[17px] font-semibold text-[#182028]">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-[13px] text-[#8F999F]">
        {description}
      </p>

      {actionText && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-[40px] text-xs gap-1.5"
        >
          <Plus size={15} />
          <span>{actionText}</span>
        </Button>
      )}
    </div>
  );
}
