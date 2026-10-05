'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ArrowRight, Loader2 } from 'lucide-react';

export default function CalendarOverview({ events = [], loading = false }) {
  const router = useRouter();

  const badgeColors = {
    domain: 'bg-[#EFF9F4] text-[#168F5A]',
    hosting: 'bg-[#EFF6FF] text-[#3B82F6]',
    reminder: 'bg-[#F5F3FF] text-[#8B5CF6]',
    event: 'bg-[#FFF8E9] text-[#B7791F]',
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9F4] text-[#168F5A]">
            <CalendarDays size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-semibold text-[#182028]">
            Upcoming Schedule
          </h2>
        </div>

        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs font-medium text-[#18A968] transition-colors hover:text-[#15945b] !no-underline"
        >
          <span>Calendar</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Events List with Date Blocks */}
      <div className="my-3.5 flex flex-col gap-2.5">
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#18A968]" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E9EDEF] bg-[#FAFBFB] p-6 text-center">
            <CalendarDays size={20} className="text-[#8F999F]" />
            <p className="mt-2 text-xs font-semibold text-[#182028]">
              No schedule entries
            </p>
            <p className="mt-0.5 text-[11px] text-[#8F999F]">
              Your domain and hosting renewals will appear here automatically.
            </p>
          </div>
        ) : (
          events.slice(0, 3).map((e) => {
            const dateObj = new Date(e.expiryDate || e.startDate);
            const monthStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
              : '—';
            const dayStr = !isNaN(dateObj.getTime()) ? dateObj.getDate() : '—';
            const typeKey = (e.type || 'domain').toLowerCase();

            return (
              <div
                key={e.id}
                onClick={() => router.push(e.expiryDate ? `/calendar/${e.expiryDate}` : '/calendar')}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-2.5 transition-all hover:border-[#E2E8F0] hover:bg-white hover:shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Date Block */}
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[#E9EDEF] bg-white text-center shadow-2xs group-hover:border-[#18A968]/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#168F5A]">
                      {monthStr}
                    </span>
                    <span className="text-sm font-bold leading-none text-[#182028]">
                      {dayStr}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#182028] group-hover:text-[#168F5A] transition-colors">
                      {e.title}
                    </p>
                    <p className="text-[11px] text-[#8F999F]">
                      {e.client} • {e.status || 'Active'}
                    </p>
                  </div>
                </div>

                <span
                  className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium capitalize ${
                    badgeColors[typeKey] || 'bg-[#F5F6F8] text-[#718096]'
                  }`}
                >
                  {e.type}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-[#F0F3F5] pt-3 text-right">
        <span className="text-xs text-[#8F999F]">Synchronized with live backend</span>
      </div>
    </div>
  );
}
