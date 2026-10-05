'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Server, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { getUrgencyColor } from '@/app/calendar/components/Calender';

export default function ExpiringNext({ items = [], loading = false }) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
            <Clock size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-semibold text-[#182028]">
            Expiring Next
          </h2>
        </div>

        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs font-medium text-[#18A968] transition-colors hover:text-[#15945b] !no-underline"
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Items list */}
      <div className="my-3.5 flex flex-col gap-2.5">
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#18A968]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E9EDEF] bg-[#FAFBFB] p-6 text-center">
            <Clock size={20} className="text-[#8F999F]" />
            <p className="mt-2 text-xs font-semibold text-[#182028]">
              No upcoming expiries
            </p>
            <p className="mt-0.5 text-[11px] text-[#8F999F]">
              All domains and hostings are currently up to date.
            </p>
          </div>
        ) : (
          items.slice(0, 4).map((item) => {
            const urgency = getUrgencyColor(item.urgency);

            return (
              <div
                key={item.id}
                onClick={() => router.push(item.expiryDate ? `/calendar/${item.expiryDate}` : '/calendar')}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 transition-all hover:border-[#E2E8F0] hover:bg-white hover:shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#68727C] shadow-2xs group-hover:border group-hover:border-[#18A968]/30">
                    {item.type === 'domain' ? (
                      <Globe size={15} strokeWidth={1.8} className="text-[#168F5A]" />
                    ) : (
                      <Server size={15} strokeWidth={1.8} className="text-[#3B82F6]" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#182028] group-hover:text-[#168F5A] transition-colors">
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-[#8F999F]">
                      {item.client}
                    </p>
                  </div>
                </div>

                {/* Status pill */}
                <span
                  className={`ml-2 shrink-0 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${urgency.bg} ${urgency.text} ${urgency.border}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${urgency.dot}`} />
                  {item.status}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-auto flex items-center justify-between border-t border-[#F0F3F5] pt-3 text-[11.5px] text-[#8F999F]">
        <span>Automated alert tracking</span>
        <span className="font-semibold text-[#168F5A]">{items.length} monitored</span>
      </div>
    </div>
  );
}
