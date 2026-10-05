'use client';

import React from 'react';
import { Calendar, Plus, Filter, Download } from 'lucide-react';

export default function DashboardHeader({
  title = 'Overview',
  subtitle = 'Track your domain renewals, hosting expiries, and client reminders.',
  onNewReminder,
}) {
  const currentDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-1 text-[13px] text-[#8F999F]">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date pill */}
        <div className="flex h-9 items-center gap-2 rounded-xl border border-[#E9EDEF] bg-white px-3 text-xs font-medium text-[#68727C] shadow-[0_1px_4px_rgba(20,30,40,0.02)]">
          <Calendar size={14} className="text-[#98A0A3]" />
          <span>{currentDate}</span>
        </div>

        {/* Filter button */}
        <button
          type="button"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[#E9EDEF] bg-white px-3 text-xs font-medium text-[#68727C] shadow-[0_1px_4px_rgba(20,30,40,0.02)] transition-colors hover:border-[#D3D9DE] hover:text-[#182028]"
        >
          <Filter size={13} className="text-[#98A0A3]" />
          <span>Filter</span>
        </button>

        {/* Action button */}
        <button
          type="button"
          onClick={onNewReminder}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-[#18A968] px-3.5 text-xs font-medium text-white shadow-xs transition-all hover:bg-[#15945b] active:scale-[0.99]"
        >
          <Plus size={15} strokeWidth={2.2} />
          <span>New Reminder</span>
        </button>
      </div>
    </div>
  );
}
