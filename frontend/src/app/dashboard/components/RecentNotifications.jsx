'use client';

import React from 'react';
import Link from 'next/link';
import { Megaphone, ArrowRight, Shield, Globe, Server, KeyRound, Bell, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/date.utils';

export default function RecentNotifications({ notifications = [], loading = false }) {
  const getIconData = (type) => {
    switch (type) {
      case 'domain':
        return { icon: Globe, color: 'text-[#168F5A] bg-[#EFF9F4]' };
      case 'hosting':
        return { icon: Server, color: 'text-[#3B82F6] bg-[#EFF6FF]' };
      case 'credential':
        return { icon: KeyRound, color: 'text-[#7E22CE] bg-[#FAF5FF]' };
      default:
        return { icon: Bell, color: 'text-[#B7791F] bg-[#FFF8E9]' };
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]">
            <Megaphone size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-semibold text-[#182028]">
            Activity & Alerts
          </h2>
        </div>

        <Link
          href="/notifications"
          className="flex items-center gap-1 text-xs font-medium text-[#18A968] transition-colors hover:text-[#15945b] !no-underline"
        >
          <span>Logs</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Notifications list */}
      <div className="my-3.5 flex flex-col gap-2.5">
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#18A968]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E9EDEF] bg-[#FAFBFB] p-6 text-center">
            <Megaphone size={20} className="text-[#8F999F]" />
            <p className="mt-2 text-xs font-semibold text-[#182028]">
              No recent notifications
            </p>
            <p className="mt-0.5 text-[11px] text-[#8F999F]">
              System events and renewal logs will show here.
            </p>
          </div>
        ) : (
          notifications.slice(0, 3).map((n) => {
            const { icon: Icon, color } = getIconData(n.type);

            return (
              <div
                key={n._id}
                className="flex items-center justify-between rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 transition-colors hover:border-[#E2E8F0] hover:bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon size={15} strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#182028]">
                      {n.title}
                    </p>
                    <p className="truncate text-[11px] text-[#8F999F]">
                      {n.message}
                    </p>
                  </div>
                </div>

                <span className="ml-2 shrink-0 text-[10.5px] font-medium text-[#8F999F]">
                  {formatDate(n.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto border-t border-[#F0F3F5] pt-3 text-right">
        <span className="text-xs text-[#168F5A] font-medium">
          {notifications.filter((n) => !n.read).length} unread alerts
        </span>
      </div>
    </div>
  );
}
