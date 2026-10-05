'use client';

import React from 'react';
import { Settings, User, Mail, Shield, Calendar, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/utils/date.utils';
import Button from '@/components/common/Button';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const displayName = user?.name || 'Account User';
  const displayEmail = user?.email || '—';
  const role = user?.role || 'Administrator';
  const memberSince = user?.createdAt ? formatDate(user.createdAt) : '—';

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 pb-12">
      {/* Header Card */}
      <div className="flex items-center gap-3 rounded-[20px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_14px_rgba(20,30,40,0.035)] sm:p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EFF9F4] text-[#168F5A]">
          <Settings size={19} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
            Settings & Account
          </h1>
          <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
            Manage your RemindPro administrator profile and application preferences
          </p>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EFF9F4] text-[#168F5A]">
              <User size={16} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-[#182028]">
                Administrator Profile
              </h2>
              <p className="text-[12px] text-[#8F999F]">
                Verified account information from the live backend
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF9F4] px-2.5 py-1 text-xs font-semibold text-[#168F5A]">
            <CheckCircle2 size={13} />
            Active Session
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-4">
            <div className="flex items-center gap-2 text-[#8F999F]">
              <User size={14} />
              <span className="text-xs">Full Name</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-[#182028]">{displayName}</p>
          </div>

          <div className="rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-4">
            <div className="flex items-center gap-2 text-[#8F999F]">
              <Mail size={14} />
              <span className="text-xs">Email Address</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-[#182028]">{displayEmail}</p>
          </div>

          <div className="rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-4">
            <div className="flex items-center gap-2 text-[#8F999F]">
              <Shield size={14} />
              <span className="text-xs">Role & Permissions</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold capitalize text-[#182028]">{role}</p>
          </div>

          <div className="rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-4">
            <div className="flex items-center gap-2 text-[#8F999F]">
              <Calendar size={14} />
              <span className="text-xs">Account Created</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-[#182028]">{memberSince}</p>
          </div>
        </div>
      </div>

      {/* Security & Session Actions */}
      <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
        <h2 className="text-[16px] font-semibold text-[#182028]">
          Session Security
        </h2>
        <p className="mt-0.5 text-xs text-[#8F999F]">
          Sign out of this session or manage local authentication tokens
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-[#F0F3F5] pt-4">
          <p className="text-xs text-[#5A6570]">
            Signing out will remove your Bearer token and return to the login screen.
          </p>

          <Button
            type="button"
            variant="danger"
            onClick={logout}
            className="text-xs gap-1.5 min-h-[38px]"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
