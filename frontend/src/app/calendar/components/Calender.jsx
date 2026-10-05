'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  Server,
  Clock,
  ArrowRight,
  RefreshCw,
  CalendarSync,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  RotateCcw,
  Unlink,
} from 'lucide-react';
import calendarApi from '@/api/calendar.api';
import domainsApi from '@/api/domains.api';
import hostingApi from '@/api/hosting.api';
import remindersApi from '@/api/reminders.api';
import { useToast } from '@/components/common/ToastProvider';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { getExpiryStatus, formatDate } from '@/utils/date.utils';

export const getUrgencyColor = (urgency) => {
  switch (urgency) {
    case 'today':
      return {
        bg: 'bg-[#FFF1F1]',
        text: 'text-[#C24141]',
        border: 'border-[#FCA5A5]',
        dot: 'bg-[#EF4444]',
        label: 'Expires Today',
      };
    case 'tomorrow':
    case '1day':
      return {
        bg: 'bg-[#FFF1E8]',
        text: 'text-[#C2410C]',
        border: 'border-[#FDBA74]',
        dot: 'bg-[#F97316]',
        label: '1 Day Left',
      };
    case 'urgent':
    case 'warning':
      return {
        bg: 'bg-[#FFF8E9]',
        text: 'text-[#B7791F]',
        border: 'border-[#FDE047]',
        dot: 'bg-[#EAB308]',
        label: '3–7 Days',
      };
    case 'upcoming':
      return {
        bg: 'bg-[#EFF9F4]',
        text: 'text-[#168F5A]',
        border: 'border-[#A7F3D0]',
        dot: 'bg-[#18A968]',
        label: 'Upcoming',
      };
    case 'renewed':
      return {
        bg: 'bg-[#EFF9F4]',
        text: 'text-[#168F5A]',
        border: 'border-[#A7F3D0]',
        dot: 'bg-[#18A968]',
        label: 'Renewed',
      };
    case 'expired':
      return {
        bg: 'bg-[#F5F5F5]',
        text: 'text-[#8F999F]',
        border: 'border-[#E5E7EB]',
        dot: 'bg-[#9CA3AF]',
        label: 'Expired',
      };
    default:
      return {
        bg: 'bg-[#F8FAF9]',
        text: 'text-[#68727C]',
        border: 'border-[#E9EDEF]',
        dot: 'bg-[#94A3B8]',
        label: 'Normal',
      };
  }
};

export default function Calender() {
  const router = useRouter();
  const toast = useToast();
  const today = useMemo(() => new Date(), []);

  // Current viewed month state
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);

  // Sync Modal & Settings State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // Fetch normalized calendar data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch normalized backend events
      const res = await calendarApi.getNormalizedEvents();
      if (res?.success && Array.isArray(res.data)) {
        setRawEvents(res.data);
      } else {
        // Fallback to individual module fetch
        const [domainsRes, hostingRes] = await Promise.all([
          domainsApi.getAll().catch(() => ({ success: false, data: [] })),
          hostingApi.getAll().catch(() => ({ success: false, data: [] })),
        ]);

        const aggregated = [];
        if (domainsRes?.success && Array.isArray(domainsRes.data)) {
          domainsRes.data.forEach((d) => {
            if (!d.expiryDate) return;
            const expKey = new Date(d.expiryDate).toISOString().split('T')[0];
            const st = getExpiryStatus(d.expiryDate);
            aggregated.push({
              id: `domain-${d._id}`,
              sourceType: 'domain',
              sourceId: d._id,
              type: 'domain',
              title: d.domainName,
              client: d.client?.name || 'Direct Client',
              description: d.registrar ? `Registrar: ${d.registrar}` : 'Domain Asset',
              expiryDate: expKey,
              date: expKey,
              status: st.statusLabel,
              urgency: st.urgency,
              autoRenew: Boolean(d.autoRenew),
            });
          });
        }
        if (hostingRes?.success && Array.isArray(hostingRes.data)) {
          hostingRes.data.forEach((h) => {
            if (!h.expiryDate) return;
            const expKey = new Date(h.expiryDate).toISOString().split('T')[0];
            const st = getExpiryStatus(h.expiryDate);
            aggregated.push({
              id: `hosting-${h._id}`,
              sourceType: 'hosting',
              sourceId: h._id,
              type: 'hosting',
              title: h.hostingName,
              client: h.client?.name || 'Direct Client',
              description: h.provider ? `Provider: ${h.provider}` : 'Web Hosting',
              expiryDate: expKey,
              date: expKey,
              status: st.statusLabel,
              urgency: st.urgency,
              autoRenew: Boolean(h.autoRenew),
            });
          });
        }
        setRawEvents(aggregated);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load calendar events.');
      toast.error('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Feed action state
  const [feedActionLoading, setFeedActionLoading] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Check for OAuth redirect return query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');

    if (oauthSuccess === 'google') {
      toast.success('Google Calendar connected successfully.');
      setIsSyncModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthSuccess === 'microsoft') {
      toast.success('Microsoft Outlook connected successfully.');
      setIsSyncModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      toast.error(decodeURIComponent(oauthError));
      setIsSyncModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Load sync settings when modal opens
  const handleOpenSyncModal = async () => {
    setIsSyncModalOpen(true);
    setSyncLoading(true);
    try {
      const res = await calendarApi.getSyncSettings();
      if (res?.success && res.data) {
        setSyncSettings(res.data);
      }
    } catch {
      // Non-fatal, default UI will render
    } finally {
      setSyncLoading(false);
    }
  };

  // Google Calendar Handlers
  const handleConnectGoogle = async () => {
    setFeedActionLoading('connect_google');
    try {
      const res = await calendarApi.getGoogleAuthUrl();
      if (res?.success && res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to initiate Google authorization.');
      setFeedActionLoading(null);
    }
  };

  const handleSyncGoogle = async () => {
    setFeedActionLoading('sync_google');
    try {
      const res = await calendarApi.syncGoogle();
      if (res?.success) {
        toast.success(`Google Calendar synced (${res.data?.created || 0} created, ${res.data?.updated || 0} updated).`);
        // Refresh settings
        const fresh = await calendarApi.getSyncSettings();
        if (fresh?.success && fresh.data) setSyncSettings(fresh.data);
      }
    } catch (err) {
      const msg = err?.message || 'Failed to sync Google Calendar.';
      toast.error(msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('reconnect')) {
        setSyncSettings((prev) => ({
          ...prev,
          google: { ...prev?.google, connected: false, lastSyncStatus: 'expired' },
        }));
      }
    } finally {
      setFeedActionLoading(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    setFeedActionLoading('disconnect_google');
    try {
      await calendarApi.disconnectGoogle();
      setSyncSettings((prev) => ({
        ...prev,
        google: {
          ...prev?.google,
          connected: false,
          email: '',
          lastSyncStatus: 'idle',
        },
      }));
      toast.info('Google Calendar disconnected.');
    } catch (err) {
      toast.error(err?.message || 'Failed to disconnect Google Calendar.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Microsoft Outlook Handlers
  const handleConnectMicrosoft = async () => {
    setFeedActionLoading('connect_microsoft');
    try {
      const res = await calendarApi.getMicrosoftAuthUrl();
      if (res?.success && res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to initiate Microsoft authorization.');
      setFeedActionLoading(null);
    }
  };

  const handleSyncMicrosoft = async () => {
    setFeedActionLoading('sync_microsoft');
    try {
      const res = await calendarApi.syncMicrosoft();
      if (res?.success) {
        toast.success(`Microsoft Outlook synced (${res.data?.created || 0} created, ${res.data?.updated || 0} updated).`);
        const fresh = await calendarApi.getSyncSettings();
        if (fresh?.success && fresh.data) setSyncSettings(fresh.data);
      }
    } catch (err) {
      const msg = err?.message || 'Failed to sync Microsoft Outlook.';
      toast.error(msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('reconnect')) {
        setSyncSettings((prev) => ({
          ...prev,
          microsoft: { ...prev?.microsoft, connected: false, lastSyncStatus: 'expired' },
        }));
      }
    } finally {
      setFeedActionLoading(null);
    }
  };

  const handleDisconnectMicrosoft = async () => {
    setFeedActionLoading('disconnect_microsoft');
    try {
      await calendarApi.disconnectMicrosoft();
      setSyncSettings((prev) => ({
        ...prev,
        microsoft: {
          ...prev?.microsoft,
          connected: false,
          email: '',
          lastSyncStatus: 'idle',
        },
      }));
      toast.info('Microsoft Outlook disconnected.');
    } catch (err) {
      toast.error(err?.message || 'Failed to disconnect Microsoft Outlook.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Global Sync Handlers
  const handleSyncAll = async () => {
    setFeedActionLoading('sync_all');
    try {
      await calendarApi.syncAll();
      toast.success('Connected calendars synchronized successfully.');
      const fresh = await calendarApi.getSyncSettings();
      if (fresh?.success && fresh.data) setSyncSettings(fresh.data);
    } catch (err) {
      toast.error(err?.message || 'Failed to run full calendar sync.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Generate Apple Calendar subscription
  const handleGenerateFeed = async () => {
    setFeedActionLoading('generate');
    try {
      const res = await calendarApi.generateAppleFeed();
      if (res?.success && res.data) {
        setSyncSettings((prev) => ({
          ...prev,
          apple: {
            ...prev?.apple,
            ...res.data,
          },
        }));
        toast.success('Apple Calendar subscription feed generated.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to generate subscription URL.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Regenerate Apple Calendar subscription token
  const handleRegenerateFeed = async () => {
    setFeedActionLoading('regenerate');
    try {
      const res = await calendarApi.regenerateAppleFeed();
      if (res?.success && res.data) {
        setSyncSettings((prev) => ({
          ...prev,
          apple: {
            ...prev?.apple,
            ...res.data,
          },
        }));
        toast.success('Subscription URL regenerated. Previous URL invalidated.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to regenerate subscription URL.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Disable Apple Calendar subscription feed
  const handleDisableFeed = async () => {
    setFeedActionLoading('disable');
    try {
      const res = await calendarApi.disableAppleFeed();
      if (res?.success) {
        setSyncSettings((prev) => ({
          ...prev,
          apple: {
            ...prev?.apple,
            subscriptionEnabled: false,
          },
        }));
        toast.info('Apple Calendar subscription disabled.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to disable subscription.');
    } finally {
      setFeedActionLoading(null);
    }
  };

  // Copy subscription URL to clipboard
  const handleCopyFeedUrl = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success('Calendar subscription URL copied.');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      toast.success('Calendar subscription URL copied.');
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = {};
    rawEvents.forEach((event) => {
      const key = event.date || event.expiryDate;
      if (!key) return;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(event);
    });
    return map;
  }, [rawEvents]);

  // Calendar grid items
  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }
    return cells;
  }, [firstDayIndex, daysInMonth]);

  const formatDateKey = (day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleMonthSelect = (e) => {
    const [selectedYear, selectedMonth] = e.target.value.split('-');
    if (selectedYear && selectedMonth) {
      setCurrentDate(new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10) - 1, 1));
    }
  };

  const handleDateClick = (dateKey, dayEvents) => {
    if (dayEvents && dayEvents.length > 0) {
      router.push(`/calendar/${dateKey}`);
    }
  };

  // Chronological list of upcoming expiries (upcoming first, then past)
  const upcomingExpiries = useMemo(() => {
    return [...rawEvents].sort((a, b) => {
      const dateA = new Date(a.date || a.expiryDate).getTime();
      const dateB = new Date(b.date || b.expiryDate).getTime();
      return dateA - dateB;
    });
  }, [rawEvents]);

  return (
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-12">
      {/* 1. COMBINED CALENDAR CARD */}
      <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-3.5 shadow-[0_2px_14px_rgba(20,30,40,0.035)] sm:p-6">
        {/* Header inside the card */}
        <div className="flex flex-col gap-3.5 border-b border-[#F0F3F5] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EFF9F4] text-[#168F5A] sm:h-10 sm:w-10 sm:rounded-[12px]">
              <CalendarDays size={18} strokeWidth={2} className="sm:h-5 sm:w-5" />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold tracking-[-0.3px] text-[#182028] sm:text-[20px]">
                Calendar
              </h1>
              <p className="text-[11px] text-[#8F999F] sm:text-[12.5px]">
                Manage expiry dates, renewals and upcoming schedules
              </p>
            </div>
          </div>

          {/* Controls: Refresh, Sync Calendar, Today & Month Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh calendar data"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] border border-[#E9EDEF] bg-[#FAFBFB] text-[#7C878E] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A] sm:h-9 sm:w-9 sm:rounded-[11px]"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#168F5A]' : ''} />
            </button>

            <button
              type="button"
              onClick={handleOpenSyncModal}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#C8EAD9] bg-[#EFF9F4] px-2.5 py-1.5 text-xs font-semibold text-[#168F5A] transition hover:bg-[#18A968] hover:text-white sm:rounded-[11px] sm:px-3"
            >
              <CalendarSync size={13} />
              <span className="hidden xs:inline">Sync Calendar</span>
              <span className="xs:hidden">Sync</span>
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="cursor-pointer rounded-[10px] border border-[#E9EDEF] bg-[#FAFBFB] px-2.5 py-1.5 text-xs font-semibold text-[#182028] transition-all hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A] sm:rounded-[11px] sm:px-3.5"
            >
              Today
            </button>

            <div className="flex items-center rounded-[10px] border border-[#E9EDEF] bg-[#FAFBFB] p-0.5 sm:rounded-[11px] sm:p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#7C878E] transition hover:bg-white hover:text-[#168F5A]"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="relative px-2 sm:px-2.5">
                <span className="text-xs font-semibold text-[#182028] sm:text-[13px]">
                  {monthName}
                </span>
                <input
                  type="month"
                  value={`${year}-${String(month + 1).padStart(2, '0')}`}
                  onChange={handleMonthSelect}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  title="Select month and year"
                />
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#7C878E] transition hover:bg-white hover:text-[#168F5A]"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center sm:min-h-[360px]">
            <Loader text="Loading live calendar schedule..." />
          </div>
        ) : error ? (
          <div className="my-6">
            <ErrorMessage message={error} onRetry={fetchData} variant="card" />
          </div>
        ) : (
          <>
            {/* Days of week header */}
            <div className="mb-2 mt-4 grid grid-cols-7 gap-1 text-center sm:gap-2.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="text-[10px] font-semibold uppercase tracking-[0.4px] text-[#9BA4AB] sm:text-[11px] sm:tracking-[0.6px]"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date cells grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
              {calendarCells.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[52px] rounded-[10px] bg-[#FAFBFB]/50 sm:min-h-[84px] sm:rounded-[13px]"
                    />
                  );
                }

                const dateKey = formatDateKey(day);
                const dayEvents = eventsByDate[dateKey] || [];
                const hasEvents = dayEvents.length > 0;
                const isCurrentDay = isToday(day);

                const hasTodayUrgency = dayEvents.some((e) => e.urgency === 'today');
                const hasUrgent = dayEvents.some(
                  (e) => e.urgency === 'urgent' || e.urgency === 'tomorrow' || e.urgency === '1day'
                );
                const hasWarning = dayEvents.some((e) => e.urgency === 'warning');

                let cellBg = 'bg-white hover:border-[#D3D9DE] hover:bg-[#FAFBFB]';
                let cellBorder = 'border-[#E9EDEF]';

                if (isCurrentDay) {
                  cellBg = 'bg-[#EFF9F4]';
                  cellBorder = 'border-[#18A968] ring-1 ring-[#18A968]/30';
                } else if (hasTodayUrgency) {
                  cellBg = dayEvents.length > 1 ? 'border-[#fecaca] bg-[#fff1f1]' : 'border-[#fee2e2] bg-[#fff7f7]';
                  cellBorder = 'border-[#FCA5A5]';
                } else if (hasUrgent) {
                  cellBg = 'bg-[#FFF8E9]';
                  cellBorder = 'border-[#FDE047]';
                } else if (hasWarning) {
                  cellBg = 'bg-[#FFFBF2]';
                  cellBorder = 'border-[#FEF08A]';
                } else if (hasEvents) {
                  cellBg = 'bg-[#F2FAF6]';
                  cellBorder = 'border-[#A7F3D0]';
                }

                return (
                  <div
                    key={dateKey}
                    onClick={() => handleDateClick(dateKey, dayEvents)}
                    className={`
                      group relative flex min-h-[52px] flex-col justify-between rounded-[10px] border p-1 transition-all duration-150 sm:min-h-[84px] sm:rounded-[13px] sm:p-2.5
                      ${cellBg}
                      ${cellBorder}
                      ${hasEvents ? 'cursor-pointer hover:scale-[1.01] hover:shadow-xs' : 'cursor-default'}
                    `}
                  >
                    {/* Top row: Date Number + Today tag */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`
                          flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold sm:h-6 sm:w-6 sm:text-[12px]
                          ${
                            isCurrentDay
                              ? 'bg-[#18A968] text-white shadow-2xs'
                              : hasTodayUrgency
                              ? 'text-[#C24141] font-bold'
                              : 'text-[#182028]'
                          }
                        `}
                      >
                        {day}
                      </span>

                      {isCurrentDay && (
                        <span className="hidden rounded-full bg-[#168F5A]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#168F5A] sm:inline-block">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Bottom row: Expiry badge indicator */}
                    {hasEvents ? (
                      <div className="mt-0.5 flex items-center justify-center sm:justify-start">
                        {/* Desktop full badge */}
                        <span
                          className={`
                            hidden sm:inline-flex items-center gap-1.5 rounded-[7px] px-1.5 py-0.5 text-[10.5px] font-medium text-white
                            ${
                              hasTodayUrgency
                                ? 'bg-[#ef4444]'
                                : hasUrgent
                                ? 'bg-[#f97316]'
                                : hasWarning
                                ? 'bg-[#eab308]'
                                : 'bg-[#18A968]'
                            }
                          `}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          <span>
                            {dayEvents.length} {dayEvents.length === 1 ? 'Item' : 'Items'}
                          </span>
                        </span>

                        {/* Mobile compact indicator pill */}
                        <span
                          className={`
                            inline-flex sm:hidden h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-2xs
                            ${
                              hasTodayUrgency
                                ? 'bg-[#ef4444]'
                                : hasUrgent
                                ? 'bg-[#f97316]'
                                : hasWarning
                                ? 'bg-[#eab308]'
                                : 'bg-[#18A968]'
                            }
                          `}
                        >
                          {dayEvents.length}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-[#F0F3F5] pt-3 text-xs text-[#8F999F] sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:pt-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#18A968] sm:h-2.5 sm:w-2.5" />
                  <span className="text-[10.5px] text-[#556068] sm:text-[11.5px]">Active / Upcoming</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#EAB308] sm:h-2.5 sm:w-2.5" />
                  <span className="text-[10.5px] text-[#556068] sm:text-[11.5px]">3–7 Days Warning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444] sm:h-2.5 sm:w-2.5" />
                  <span className="text-[10.5px] text-[#556068] sm:text-[11.5px]">Expires Today / Urgent</span>
                </div>
              </div>

              <span className="text-[10.5px] text-[#8F999F] sm:text-[11.5px]">
                Click any highlighted date to inspect and renew assets
              </span>
            </div>
          </>
        )}
      </div>

      {/* 2. UPCOMING RENEWALS & EXPIRIES SECTION */}
      <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EFF9F4] text-[#168F5A]">
              <Clock size={16} strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-[#182028]">
                Upcoming Renewals &amp; Schedules
              </h2>
              <p className="text-[12px] text-[#8F999F]">
                Normalized chronological feed of all domain and hosting expiry dates
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#EFF9F4] px-2.5 py-1 text-xs font-semibold text-[#168F5A]">
            {upcomingExpiries.length} tracked
          </span>
        </div>

        {upcomingExpiries.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8F999F]">
            No upcoming expiries or renewal dates found in the system.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {upcomingExpiries.slice(0, 15).map((item) => {
              const urgency = getUrgencyColor(item.urgency);
              const eventDate = new Date(item.date || item.expiryDate);
              const dateMonth = !isNaN(eventDate.getTime())
                ? eventDate.toLocaleDateString('en-US', { month: 'short' })
                : '—';
              const dateDay = !isNaN(eventDate.getTime()) ? eventDate.getDate() : '—';

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/calendar/${item.date || item.expiryDate}`)}
                  className="group flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3.5 transition-all duration-200 hover:border-[#D3D9DE] hover:bg-white hover:shadow-xs sm:flex-row sm:items-center sm:p-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Compact Date badge */}
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[10px] border border-[#E9EDEF] bg-white text-center shadow-2xs transition-colors group-hover:border-[#18A968]/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#168F5A]">
                        {dateMonth}
                      </span>
                      <span className="text-sm font-bold leading-tight text-[#182028]">
                        {dateDay}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[#182028] group-hover:text-[#168F5A] transition-colors">
                          {item.title}
                        </p>
                        <span className="hidden sm:inline-block">
                          {item.type === 'domain' ? (
                            <span className="flex items-center gap-1 rounded-md bg-[#EFF9F4] px-1.5 py-0.5 text-[10.5px] font-medium text-[#168F5A]">
                              <Globe size={11} /> Domain
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[10.5px] font-medium text-[#3B82F6]">
                              <Server size={11} /> Hosting
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-[12px] text-[#8F999F]">
                        {item.client} {item.description ? `• ${item.description}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Status badge + arrow */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${urgency.bg} ${urgency.text} ${urgency.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${urgency.dot}`} />
                      {item.status}
                    </span>

                    <ArrowRight
                      size={15}
                      className="text-[#9BA4AB] transition-transform group-hover:translate-x-0.5 group-hover:text-[#18A968]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. CALENDAR SYNC MODAL */}
      <Modal
        open={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Google Calendar Integration"
        description="Sync domain and hosting renewals directly to your Google Calendar."
        size="small"
      >
        <div className="py-1">
          {syncLoading ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3">
              <Loader text="Loading calendar sync status..." />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Calendar Card */}
              <div className="rounded-[18px] border border-[#E9EDEF] bg-[#FAFBFB] p-5 transition-all">
                {/* Header Row */}
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[14px] bg-white border border-[#E9EDEF] shadow-xs p-2">
                    {/* Official Google Calendar Logo with 31 */}
                    <svg className="w-full h-full" viewBox="0 0 192 192" fill="none">
                      <rect width="192" height="192" rx="28" fill="#FFFFFF"/>
                      <path d="M148 44H44C32.95 44 24 52.95 24 64V148C24 159.05 32.95 168 44 168H148C159.05 168 168 159.05 168 148V64C168 52.95 159.05 44 148 44Z" fill="#FFFFFF"/>
                      {/* Left: 3 */}
                      <path d="M101.5 85.6C101.5 77.8 95.4 72.7 86.7 72.7C78.7 72.7 72.7 77 71 83.9L80.2 86.7C81 83.3 83.3 81.2 86.7 81.2C90.2 81.2 92.5 83.4 92.5 87C92.5 90.9 89.8 93.4 85.9 93.4H81.5V101.9H86.3C90.9 101.9 93.8 104.7 93.8 109.3C93.8 113.6 91.4 116.7 86.8 116.7C83.1 116.7 80.3 114.2 79.5 109.9L70.1 112.7C71.4 120.5 77.3 125.4 86.2 125.4C96.4 125.4 102.9 119 102.9 109.8C102.9 103.1 100 98.6 94.7 96.5C98.9 94.3 101.5 90.4 101.5 85.6Z" fill="#1A73E8"/>
                      {/* Right: 1 */}
                      <path d="M127.3 85.6H120.4L105.1 91.7L108 99.6L117.4 95.9V124.6H127.3V85.6Z" fill="#1A73E8"/>
                      {/* Top Blue */}
                      <path d="M128 44H44C32.95 44 24 52.95 24 64V84H128V44Z" fill="#4285F4"/>
                      {/* Right Red */}
                      <path d="M148 44H128V84H168V64C168 52.95 159.05 44 148 44Z" fill="#EA4335"/>
                      {/* Left Yellow */}
                      <path d="M24 84V148C24 159.05 32.95 168 44 168H64V84H24Z" fill="#FBBC04"/>
                      {/* Bottom Green */}
                      <path d="M64 168H148C159.05 168 168 159.05 168 148V128H64V168Z" fill="#34A853"/>
                      {/* Right Dark Green Corner Fold */}
                      <path d="M128 84H168V128H128V84Z" fill="#188038"/>
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[15px] text-[#182028]">Google Calendar</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        syncSettings?.google?.connected
                          ? 'bg-[#EFF9F4] text-[#168F5A] border border-[#A7F3D0]'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          syncSettings?.google?.connected ? 'bg-[#18A968]' : 'bg-gray-400'
                        }`} />
                        {syncSettings?.google?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-[#8F999F] mt-0.5">
                      {syncSettings?.google?.connected
                        ? 'Automated calendar sync is active.'
                        : 'Connect your Google account to sync events.'}
                    </p>
                  </div>
                </div>

                {/* Body Details / Action Section */}
                {syncSettings?.google?.connected ? (
                  <div className="mt-4 pt-4 border-t border-[#E9EDEF] flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-[#525E69]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#18A968] animate-pulse" />
                        Live sync active
                      </span>
                      {syncSettings?.google?.lastSyncedAt && (
                        <span className="text-[#8F999F]">
                          Last synced: {new Date(syncSettings.google.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={feedActionLoading === 'sync_google'}
                        onClick={handleSyncGoogle}
                        className="flex-1 gap-2 text-xs py-2.5 font-semibold"
                      >
                        <RefreshCw size={14} className={feedActionLoading === 'sync_google' ? 'animate-spin' : ''} />
                        {feedActionLoading === 'sync_google' ? 'Syncing...' : 'Sync Now'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={feedActionLoading === 'disconnect_google'}
                        onClick={handleDisconnectGoogle}
                        className="text-xs py-2.5 text-[#D95353] hover:text-[#C94545] hover:bg-red-50/60 border-[#E9EDEF]"
                      >
                        <Unlink size={13} className="mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-[#E9EDEF] space-y-3">
                    <ul className="text-xs text-[#525E69] space-y-1.5">
                      <li className="flex items-center gap-2">
                        <span className="text-[#18A968] font-bold">✓</span>
                        Auto-sync all domain & hosting expirations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#18A968] font-bold">✓</span>
                        Receive 3-day and expiry-day event reminders
                      </li>
                    </ul>

                    <Button
                      size="sm"
                      variant="primary"
                      disabled={feedActionLoading === 'connect_google'}
                      onClick={handleConnectGoogle}
                      className="w-full gap-2 text-xs py-2.5 font-semibold mt-2"
                    >
                      {feedActionLoading === 'connect_google' ? 'Connecting...' : 'Connect Google Calendar'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[#F0F3F5] mt-4">
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => setIsSyncModalOpen(false)}
              className="text-xs px-4"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
