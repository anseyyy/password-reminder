'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ArrowRight, Globe, Server, Clock, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/date.utils';

export default function RecentReminders({ renewals = [], loading = false }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9F4] text-[#168F5A]">
            <Bell size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-semibold text-[#182028]">
            Upcoming Renewals
          </h2>
        </div>

        <Link
          href="/reminders"
          className="flex items-center gap-1 text-xs font-medium text-[#18A968] transition-colors hover:text-[#15945b] !no-underline"
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* List */}
      <div className="my-3.5 flex flex-col gap-2.5">
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#18A968]" />
          </div>
        ) : renewals.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E9EDEF] bg-[#FAFBFB] p-6 text-center">
            <Bell size={20} className="text-[#8F999F]" />
            <p className="mt-2 text-xs font-semibold text-[#182028]">
              No upcoming renewals
            </p>
            <p className="mt-0.5 text-[11px] text-[#8F999F]">
              Add domains and hosting records to automatically track upcoming renewals.
            </p>
          </div>
        ) : (
          renewals.slice(0, 3).map((r) => {
            const isDomain = r.type === 'domain';
            const isExpired = r.daysLeft !== null && r.daysLeft < 0;
            const isToday = r.daysLeft === 0;
            const isUrgent = r.daysLeft !== null && r.daysLeft > 0 && r.daysLeft <= 7;

            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 transition-colors hover:border-[#E2E8F0] hover:bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isDomain
                        ? 'bg-[#EFF9F4] text-[#168F5A]'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isDomain ? <Globe size={15} /> : <Server size={15} />}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#182028]">
                      {r.title}
                    </p>
                    <p className="truncate text-[11px] text-[#8F999F]">
                      {r.client} • <span className="capitalize text-[#64748B]">{r.type}</span>
                    </p>
                  </div>
                </div>

                <div className="ml-2 flex flex-col items-end shrink-0">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      <ShieldAlert size={10} />
                      Expired {Math.abs(r.daysLeft)}d ago
                    </span>
                  ) : isToday ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">
                      <AlertTriangle size={10} />
                      Expires Today!
                    </span>
                  ) : isUrgent ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      <Clock size={10} />
                      {r.daysLeft}d left
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#C8EAD9] bg-[#EFF9F4] px-2 py-0.5 text-[10px] font-medium text-[#168F5A]">
                      {r.daysLeft}d left
                    </span>
                  )}
                  <span className="mt-1 text-[10px] text-[#98A0A3]">
                    {formatDate(r.expiryDate)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary line */}
      <div className="mt-auto border-t border-[#F0F3F5] pt-3 text-center text-xs text-[#8F999F]">
        <span>{renewals.length} total upcoming renewals tracked</span>
      </div>
    </div>
  );
}
