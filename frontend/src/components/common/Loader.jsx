'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({
  size = 'medium',
  label = 'Loading...',
  fullScreen = false,
  className = '',
}) {
  const sizeMap = {
    small: { icon: 16, text: 'text-xs', wrap: 'p-2' },
    medium: { icon: 24, text: 'text-sm', wrap: 'p-4' },
    large: { icon: 36, text: 'text-base', wrap: 'p-8' },
  };

  const { icon, text, wrap } = sizeMap[size] || sizeMap.medium;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-2 text-[#7C878E] ${wrap} ${className}`}>
      <Loader2 size={icon} className="animate-spin text-[#18A968]" />
      {label && <span className={`font-medium ${text}`}>{label}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}
