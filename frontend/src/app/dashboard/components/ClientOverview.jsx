'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Users, ArrowRight, UserCheck, UserPlus, UserX, Loader2 } from 'lucide-react';

export default function ClientOverview({
  clients = [],
  domains = [],
  hosting = [],
  credentials = [],
  loading = false,
}) {
  const { totalClients, activeClients, newClients, inactiveClients, activePercentage } =
    useMemo(() => {
      const total = clients.length;
      if (total === 0) {
        return {
          totalClients: 0,
          activeClients: 0,
          newClients: 0,
          inactiveClients: 0,
          activePercentage: 0,
        };
      }

      // Find client IDs that have active domains, hosting or credentials
      const activeClientIds = new Set();

      domains.forEach((d) => {
        const cId = typeof d.client === 'object' ? d.client?._id : d.client;
        if (cId) activeClientIds.add(cId.toString());
      });

      hosting.forEach((h) => {
        const cId = typeof h.client === 'object' ? h.client?._id : h.client;
        if (cId) activeClientIds.add(cId.toString());
      });

      credentials.forEach((c) => {
        const cId = typeof c.client === 'object' ? c.client?._id : c.client;
        if (cId) activeClientIds.add(cId.toString());
      });

      const activeCount = clients.filter((c) =>
        activeClientIds.has(c._id.toString())
      ).length;

      // New clients in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newCount = clients.filter((c) => {
        if (!c.createdAt) return false;
        return new Date(c.createdAt) >= thirtyDaysAgo;
      }).length;

      const inactiveCount = Math.max(0, total - activeCount);
      const percentage = Math.round((activeCount / total) * 100);

      return {
        totalClients: total,
        activeClients: activeCount,
        newClients: newCount,
        inactiveClients: inactiveCount,
        activePercentage: percentage,
      };
    }, [clients, domains, hosting, credentials]);

  // SVG Circular progress gauge calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (activePercentage / 100) * circumference;

  return (
    <div className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9F4] text-[#168F5A]">
            <Users size={15} strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-semibold text-[#182028]">
            Client Portfolio
          </h2>
        </div>

        <Link
          href="/clients"
          className="flex items-center gap-1 text-xs font-medium text-[#18A968] transition-colors hover:text-[#15945b] !no-underline"
        >
          <span>Manage</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Main content: Donut Chart + Stats */}
      <div className="my-4 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-center">
        {/* Circular Progress Gauge */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-[#F0F3F5]"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-[#18A968] transition-all duration-1000 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center value */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-[#18A968]" />
            ) : (
              <>
                <span className="text-xl font-bold tracking-tight text-[#182028]">
                  {activePercentage}%
                </span>
                <span className="text-[10px] font-medium text-[#8F999F]">
                  Active Rate
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid w-full flex-1 grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9F4] text-[#168F5A]">
              <UserCheck size={14} />
            </span>
            <div>
              <p className="text-[10.5px] text-[#8F999F]">Active</p>
              <p className="text-sm font-semibold text-[#182028]">{activeClients}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#3B82F6]">
              <UserPlus size={14} />
            </span>
            <div>
              <p className="text-[10.5px] text-[#8F999F]">New (30d)</p>
              <p className="text-sm font-semibold text-[#182028]">+{newClients}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#EF4444]">
              <UserX size={14} />
            </span>
            <div>
              <p className="text-[10.5px] text-[#8F999F]">Inactive</p>
              <p className="text-sm font-semibold text-[#182028]">{inactiveClients}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F6F8] text-[#64748B]">
              <Users size={14} />
            </span>
            <div>
              <p className="text-[10.5px] text-[#8F999F]">Total Clients</p>
              <p className="text-sm font-semibold text-[#182028]">{totalClients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-auto border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-[11.5px] text-[#8F999F]">
        <span>Portfolio distribution</span>
        <span className="font-semibold text-[#168F5A]">
          {totalClients > 0 ? `${activeClients} of ${totalClients} actively assigned` : 'No clients yet'}
        </span>
      </div>
    </div>
  );
}
