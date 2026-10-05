'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Globe,
  Server,
  Building,
  Mail,
  Phone,
  Bell,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Edit3,
  X,
  CalendarDays,
  Sparkles,
  Info,
  Loader2,
  User,
  Bot,
} from 'lucide-react';
import domainsApi from '@/api/domains.api';
import hostingApi from '@/api/hosting.api';
import remindersApi from '@/api/reminders.api';
import calendarApi from '@/api/calendar.api';
import clientsApi from '@/api/clients.api';
import { useToast } from '@/components/common/ToastProvider';
import Modal from '@/components/common/Modal';
import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { getExpiryStatus, formatDate } from '@/utils/date.utils';
import { getUrgencyColor } from '../Calender';

export default function CalendarDateDetail({ slug }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateEvents, setDateEvents] = useState([]);

  // Edit / Renew Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    newExpiryDate: '',
    autoRenew: false,
    registrarOrProvider: '',
    plan: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch real items for this date
  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const [domainsRes, hostingRes, remindersRes, calendarRes, clientsRes] = await Promise.all([
        domainsApi.getAll(),
        hostingApi.getAll(),
        remindersApi.getAll(),
        calendarApi.getAll(),
        clientsApi.getAll().catch(() => ({ success: false, data: [] })),
      ]);

      const clientsMap = {};
      if (clientsRes?.success && Array.isArray(clientsRes.data)) {
        clientsRes.data.forEach((c) => {
          if (c._id) clientsMap[c._id] = c;
          if (c.name) clientsMap[c.name.toLowerCase().trim()] = c;
        });
      }

      const items = [];

      // Domains
      if (domainsRes?.success && Array.isArray(domainsRes.data)) {
        domainsRes.data.forEach((d) => {
          if (!d.expiryDate) return;
          const expKey = new Date(d.expiryDate).toISOString().split('T')[0];
          if (expKey === slug) {
            const st = getExpiryStatus(d.expiryDate);
            const clientObj = (typeof d.client === 'object' && d.client !== null) ? d.client : null;
            const clientId = clientObj?._id || d.client;
            const resolvedClient = clientsMap[clientId] || clientsMap[clientObj?.name?.toLowerCase()?.trim()] || clientObj;

            items.push({
              id: `domain-${d._id}`,
              _rawId: d._id,
              type: 'domain',
              title: d.domainName,
              client: resolvedClient?.name || clientObj?.name || 'Direct Client',
              company: resolvedClient?.company || clientObj?.company || '',
              email: resolvedClient?.email || clientObj?.email || '',
              phone: resolvedClient?.phone || clientObj?.phone || '',
              domain: d.domainName,
              registrar: d.registrar || 'Standard',
              expiryDate: expKey,
              rawExpiryDate: d.expiryDate,
              status: st.statusLabel,
              urgency: st.urgency,
              autoRenew: Boolean(d.autoRenew),
              notes: d.notes || '',
              rawModel: d,
            });
          }
        });
      }

      // Hosting
      if (hostingRes?.success && Array.isArray(hostingRes.data)) {
        hostingRes.data.forEach((h) => {
          if (!h.expiryDate) return;
          const expKey = new Date(h.expiryDate).toISOString().split('T')[0];
          if (expKey === slug) {
            const st = getExpiryStatus(h.expiryDate);
            const clientObj = (typeof h.client === 'object' && h.client !== null) ? h.client : null;
            const clientId = clientObj?._id || h.client;
            const resolvedClient = clientsMap[clientId] || clientsMap[clientObj?.name?.toLowerCase()?.trim()] || clientObj;

            items.push({
              id: `hosting-${h._id}`,
              _rawId: h._id,
              type: 'hosting',
              title: h.hostingName,
              client: resolvedClient?.name || clientObj?.name || 'Direct Client',
              company: resolvedClient?.company || clientObj?.company || '',
              email: resolvedClient?.email || clientObj?.email || '',
              phone: resolvedClient?.phone || clientObj?.phone || '',
              hosting: h.hostingName,
              provider: h.provider || 'Cloud Host',
              plan: h.plan || 'Standard Node',
              expiryDate: expKey,
              rawExpiryDate: h.expiryDate,
              status: st.statusLabel,
              urgency: st.urgency,
              autoRenew: Boolean(h.autoRenew),
              notes: h.notes || '',
              rawModel: h,
            });
          }
        });
      }

      // Reminders
      if (remindersRes?.success && Array.isArray(remindersRes.data)) {
        remindersRes.data.forEach((r) => {
          const remKey = r.reminderDate ? new Date(r.reminderDate).toISOString().split('T')[0] : '';
          const expKey = r.expiryDate ? new Date(r.expiryDate).toISOString().split('T')[0] : '';
          if (remKey === slug || expKey === slug) {
            const st = getExpiryStatus(r.expiryDate || r.reminderDate);
            items.push({
              id: `reminder-${r._id}`,
              _rawId: r._id,
              type: 'reminder',
              title: r.title,
              client: r.client?.name || 'Direct Client',
              company: r.client?.company || '',
              email: r.client?.email || '',
              phone: r.client?.phone || '',
              reminderDate: remKey,
              expiryDate: expKey || remKey,
              message: r.message || '',
              source: r.source || 'manual',
              sent: Boolean(r.sent),
              status: r.sent ? 'Sent' : st.statusLabel,
              urgency: st.urgency,
              rawModel: r,
            });
          }
        });
      }

      // Calendar Events
      if (calendarRes?.success && Array.isArray(calendarRes.data)) {
        calendarRes.data.forEach((c) => {
          if (!c.startDate) return;
          const startKey = new Date(c.startDate).toISOString().split('T')[0];
          if (startKey === slug) {
            items.push({
              id: `cal-${c._id}`,
              _rawId: c._id,
              type: 'event',
              title: c.title,
              client: c.client?.name || 'General Event',
              company: c.client?.company || '',
              email: c.client?.email || '',
              phone: c.client?.phone || '',
              expiryDate: startKey,
              status: 'Scheduled',
              urgency: 'upcoming',
              notes: c.description || '',
              rawModel: c,
            });
          }
        });
      }

      setDateEvents(items);
    } catch (err) {
      setError(err?.message || 'Failed to load date details.');
      toast.error('Failed to load date details.');
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Parse formatted date header
  const formattedDate = useMemo(() => {
    if (!slug) return 'Selected Date';
    try {
      const parts = slug.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return slug;
    } catch {
      return slug;
    }
  }, [slug]);

  // Counts
  const domainCount = dateEvents.filter((e) => e.type === 'domain').length;
  const hostingCount = dateEvents.filter((e) => e.type === 'hosting').length;
  const reminderCount = dateEvents.filter((e) => e.type === 'reminder').length;
  const totalCount = dateEvents.length;

  // Calculate default +1 year renewal date
  const calculatePlusOneYear = (dateStr) => {
    try {
      const d = new Date(dateStr || slug || new Date());
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Open Edit / Renew Modal
  const handleOpenEdit = (item, isRenewAction = false) => {
    setEditingItem({ ...item, isRenewAction });
    const defaultNewDate = isRenewAction
      ? calculatePlusOneYear(item.expiryDate)
      : item.expiryDate;

    setFormData({
      newExpiryDate: defaultNewDate,
      autoRenew: Boolean(item.autoRenew),
      registrarOrProvider: item.registrar || item.provider || '',
      plan: item.plan || '',
      notes: item.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Update or Renewal to live backend
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError('');

    if (!formData.newExpiryDate) {
      setFormError('New expiry date is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingItem.type === 'domain') {
        // PUT /api/domains/:id
        const res = await domainsApi.update(editingItem._rawId, {
          expiryDate: formData.newExpiryDate,
          autoRenew: formData.autoRenew,
          registrar: formData.registrarOrProvider.trim() || undefined,
          notes: formData.notes,
        });

        if (res?.success) {
          const successMsg = editingItem.isRenewAction
            ? `Domain "${editingItem.title}" renewed successfully.`
            : `Domain "${editingItem.title}" updated successfully.`;
          toast.success(successMsg);
          setIsModalOpen(false);
          setEditingItem(null);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to update domain.');
        }
      } else if (editingItem.type === 'hosting') {
        // PUT /api/hosting/:id
        const res = await hostingApi.update(editingItem._rawId, {
          expiryDate: formData.newExpiryDate,
          autoRenew: formData.autoRenew,
          provider: formData.registrarOrProvider.trim() || undefined,
          plan: formData.plan.trim() || undefined,
          notes: formData.notes,
        });

        if (res?.success) {
          const successMsg = editingItem.isRenewAction
            ? `Hosting "${editingItem.title}" renewed successfully.`
            : `Hosting "${editingItem.title}" updated successfully.`;
          toast.success(successMsg);
          setIsModalOpen(false);
          setEditingItem(null);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to update hosting.');
        }
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save changes.');
      toast.error(err?.message || 'Failed to save changes.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12">
      {/* 1. BACK & HEADER */}
      <div className="flex flex-col gap-3 rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
        <div>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#168F5A] transition hover:text-[#18A968] !no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Calendar</span>
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#182028]">
              {formattedDate}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#8F999F]">
              Expiry & Reminder Details for this date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh date details"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[11px] border border-[#E9EDEF] bg-[#FAFBFB] text-[#7C878E] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#168F5A]' : ''} />
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF9F4] px-3 py-1.5 text-xs font-semibold text-[#168F5A]">
              <Calendar size={13} />
              {slug}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-[16px] border border-[#E9EDEF] bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-[#8F999F]">Total Items</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-[#182028]">
            {totalCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8F999F]">On this schedule</p>
        </div>

        <div className="rounded-[16px] border border-[#E9EDEF] bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-[#168F5A]">Domains</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-[#168F5A]">
            {domainCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8F999F]">Domain assets</p>
        </div>

        <div className="rounded-[16px] border border-[#E9EDEF] bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-[#3B82F6]">Hostings</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-[#3B82F6]">
            {hostingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8F999F]">Servers & plans</p>
        </div>

        <div className="rounded-[16px] border border-[#E9EDEF] bg-white p-4 shadow-2xs">
          <p className="text-[11.5px] font-medium text-[#8B5CF6]">Reminders</p>
          <p className="mt-1 text-[24px] font-bold tracking-tight text-[#8B5CF6]">
            {reminderCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[#8F999F]">Scheduled alerts</p>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[18px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading date details..." />
        </div>
      ) : error ? (
        <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchData} variant="card" />
        </div>
      ) : dateEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#E9EDEF] bg-white p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F6F8] text-[#8F999F]">
            <Calendar size={22} />
          </div>
          <h2 className="mt-4 text-[16px] font-semibold text-[#182028]">
            No expiries scheduled
          </h2>
          <p className="mt-1 max-w-sm text-[13px] text-[#8F999F]">
            There are no active domain expiries or hosting renewals scheduled for {formattedDate}.
          </p>
          <Link
            href="/calendar"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#18A968] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15945b] !no-underline"
          >
            View Full Calendar
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Section: Expiring Items */}
          <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
            <div className="border-b border-[#F0F3F5] pb-3.5">
              <h2 className="text-[16px] font-semibold text-[#182028]">
                Expiring Assets & Events ({dateEvents.length})
              </h2>
              <p className="mt-0.5 text-[12px] text-[#8F999F]">
                Assets requiring attention, renewal or notification dispatch
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dateEvents.map((item) => {
                const urgency = getUrgencyColor(item.urgency);
                const isDomainOrHosting = item.type === 'domain' || item.type === 'hosting';
                const isReminder = item.type === 'reminder';

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#E9EDEF] bg-[#FAFBFB] p-5 transition-all hover:border-[#D3D9DE] hover:bg-white hover:shadow-xs"
                  >
                    <div>
                      {/* Top Header Row with Title, Actions & Status Badge */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                              item.type === 'domain'
                                ? 'bg-[#EFF9F4] text-[#168F5A]'
                                : item.type === 'hosting'
                                ? 'bg-[#EFF6FF] text-[#3B82F6]'
                                : 'bg-[#F5F3FF] text-[#7C3AED]'
                            }`}
                          >
                            {item.type === 'domain' ? (
                              <Globe size={18} strokeWidth={1.8} />
                            ) : item.type === 'hosting' ? (
                              <Server size={18} strokeWidth={1.8} />
                            ) : (
                              <Bell size={18} strokeWidth={1.8} />
                            )}
                          </span>

                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8F999F]">
                              {item.type === 'domain'
                                ? 'DOMAIN EXPIRY'
                                : item.type === 'hosting'
                                ? 'HOSTING EXPIRY'
                                : 'SCHEDULED REMINDER'}
                            </span>
                            <h3 className="truncate text-[15px] sm:text-[15.5px] font-bold text-[#182028]">
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        {/* Action buttons + Status Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {/* Quick Renew Button (Domain / Hosting) */}
                          {isDomainOrHosting && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item, true)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-[8px] bg-[#18A968] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#15945b] shadow-2xs active:scale-98"
                            >
                              <RefreshCw size={11} />
                              <span>Renew</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          {isDomainOrHosting && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item, false)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-[8px] border border-[#E4E8EC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                            >
                              <Edit3 size={11} />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${urgency.bg} ${urgency.text} ${urgency.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${urgency.dot}`} />
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid for Domain / Hosting */}
                      {isDomainOrHosting && (
                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#F0F3F5] bg-white p-3.5 text-xs">
                          <div>
                            <p className="text-[#8F999F]">Client</p>
                            <p className="mt-0.5 font-semibold text-[#182028]">
                              {item.client}
                            </p>
                          </div>

                          <div>
                            <p className="text-[#8F999F]">Expiry Date</p>
                            <p className="mt-0.5 font-semibold text-[#182028]">
                              {item.expiryDate}
                            </p>
                          </div>

                          {item.registrar && (
                            <div>
                              <p className="text-[#8F999F]">Registrar</p>
                              <p className="mt-0.5 font-semibold text-[#182028]">
                                {item.registrar}
                              </p>
                            </div>
                          )}

                          {item.provider && (
                            <div>
                              <p className="text-[#8F999F]">Provider / Plan</p>
                              <p className="mt-0.5 font-semibold text-[#182028]">
                                {item.provider} ({item.plan || 'Standard'})
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-[#8F999F]">Auto-Renew</p>
                            <p className="mt-0.5 flex items-center gap-1 font-semibold text-[#182028]">
                              {item.autoRenew ? (
                                <span className="flex items-center gap-1 text-[#168F5A]">
                                  <ShieldCheck size={13} /> Enabled
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[#C2410C]">
                                  <ShieldAlert size={13} /> Manual Action
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Details Box for Reminder */}
                      {isReminder && (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#F0F3F5] bg-white p-3.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#8F999F]">Client:</span>
                            <span className="font-semibold text-[#182028]">{item.client}</span>
                          </div>
                          {item.message && (
                            <div className="border-t border-[#F0F3F5] pt-2 text-[#5A6570]">
                              {item.message}
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-[#F0F3F5] pt-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7E22CE]">
                              {item.source === 'auto' ? <Bot size={12} /> : <User size={12} />}
                              {item.source === 'auto' ? 'Auto Triggered' : 'Manual'}
                            </span>
                            <span className="text-[11px] text-[#8F999F]">
                              Status: <strong className={item.sent ? 'text-[#168F5A]' : 'text-[#B7791F]'}>{item.sent ? 'Sent' : 'Pending'}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Client Extra Footer */}
                    {item.email && (
                      <div className="mt-4 border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-xs text-[#8F999F]">
                        <span>
                          Email: <span className="text-[#202830] font-medium">{item.email}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Client & Organization Profiles */}
          <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] sm:p-6">
            <div className="border-b border-[#F0F3F5] pb-3.5">
              <h2 className="text-[16px] font-semibold text-[#182028]">
                Associated Client Profiles
              </h2>
              <p className="mt-0.5 text-[12px] text-[#8F999F]">
                Contact information for account managers and stakeholders
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(new Set(dateEvents.map((e) => e.client))).map((clientName) => {
                const event = dateEvents.find((e) => e.client === clientName);
                if (!event) return null;

                return (
                  <div
                    key={clientName}
                    className="flex flex-col gap-3 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-4 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF9F4] text-[#168F5A]">
                        <Building size={16} />
                      </span>
                      <div>
                        <h4 className="font-semibold text-[14px] text-[#182028]">
                          {clientName}
                        </h4>
                        <p className="text-[11px] text-[#8F999F]">
                          {event.company || 'Client Profile'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[#F0F3F5] pt-2.5 text-[#5A6570]">
                      {event.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-[#168F5A] shrink-0" />
                          <a
                            href={`mailto:${event.email}`}
                            className="truncate text-xs text-[#182028] hover:text-[#168F5A] hover:underline"
                          >
                            {event.email}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#9BA4AB]">
                          <Mail size={13} className="shrink-0" />
                          <span className="text-[11px]">No email registered</span>
                        </div>
                      )}

                      {event.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-[#168F5A] shrink-0" />
                          <a
                            href={`tel:${event.phone}`}
                            className="text-xs text-[#182028] hover:text-[#168F5A] hover:underline"
                          >
                            {event.phone}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#9BA4AB]">
                          <Phone size={13} className="shrink-0" />
                          <span className="text-[11px]">No phone registered</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          3. EDIT / RENEW MODAL (DIRECT BACKEND PUT)
      ======================================================= */}
      {isModalOpen && editingItem && (
        <Modal
          open={isModalOpen}
          onClose={() => !formSubmitting && setIsModalOpen(false)}
          title={
            editingItem.isRenewAction
              ? `Renew ${editingItem.type === 'domain' ? 'Domain' : 'Hosting'}`
              : `Update ${editingItem.type === 'domain' ? 'Domain' : 'Hosting'}`
          }
          description={
            editingItem.isRenewAction
              ? 'Extend renewal cycle and update backend database records'
              : 'Modify asset configuration and expiry schedules'
          }
        >
          {formError && (
            <div className="mb-4">
              <ErrorMessage message={formError} />
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {/* Asset Name (Readonly) */}
            <div>
              <label className="text-[12px] font-medium text-[#5F6973]">
                {editingItem.type === 'domain' ? 'Domain Name' : 'Hosting Asset'}
              </label>
              <input
                type="text"
                readOnly
                value={editingItem.title}
                className="mt-1 w-full rounded-[10px] border border-[#E9EDEF] bg-[#F8FAFB] px-3.5 py-2 text-xs font-semibold text-[#182028] outline-none"
              />
            </div>

            {/* Client & Current Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#5F6973]">Client</label>
                <input
                  type="text"
                  readOnly
                  value={editingItem.client}
                  className="mt-1 w-full rounded-[10px] border border-[#E9EDEF] bg-[#F8FAFB] px-3.5 py-2 text-xs text-[#182028] outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-[#5F6973]">Current Expiry</label>
                <input
                  type="text"
                  readOnly
                  value={editingItem.expiryDate}
                  className="mt-1 w-full rounded-[10px] border border-[#E9EDEF] bg-[#F8FAFB] px-3.5 py-2 text-xs font-medium text-[#C24141] outline-none"
                />
              </div>
            </div>

            {/* New Expiry Date (Interactive) */}
            <div>
              <label className="text-[12px] font-semibold text-[#182028] flex items-center justify-between">
                <span>New Expiry Date <span className="text-[#EF4444]">*</span></span>
                {editingItem.isRenewAction && (
                  <span className="text-[11px] font-normal text-[#168F5A]">+1 Year Auto-calculated</span>
                )}
              </label>
              <input
                type="date"
                required
                value={formData.newExpiryDate}
                onChange={(e) => setFormData({ ...formData, newExpiryDate: e.target.value })}
                disabled={formSubmitting}
                className="mt-1 w-full cursor-pointer rounded-[10px] border border-[#D3D9DE] bg-white px-3.5 py-2 text-xs font-semibold text-[#182028] transition outline-none focus:border-[#18A968] focus:ring-3 focus:ring-[#18A968]/15"
              />
            </div>

            {/* Registrar / Provider */}
            <InputField
              label={editingItem.type === 'domain' ? 'Registrar' : 'Provider'}
              value={formData.registrarOrProvider}
              onChange={(e) => setFormData({ ...formData, registrarOrProvider: e.target.value })}
              disabled={formSubmitting}
              placeholder={editingItem.type === 'domain' ? 'e.g. Namecheap, Cloudflare' : 'e.g. AWS, DigitalOcean'}
            />

            {/* Plan (if hosting) */}
            {editingItem.type === 'hosting' && (
              <InputField
                label="Hosting Plan / Node"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                disabled={formSubmitting}
                placeholder="e.g. Memory-Optimized 32GB"
              />
            )}

            {/* Auto Renew Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium text-[#27313B] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                disabled={formSubmitting}
                className="h-4 w-4 rounded border-[#D3D9DE] text-[#18A968] focus:ring-[#18A968]"
              />
              <span>Enable Auto-Renew on Provider</span>
            </label>

            {/* Notes */}
            <div>
              <label className="text-[12px] font-medium text-[#5F6973]">
                Renewal Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Renewed invoice ref #98321"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={formSubmitting}
                className="mt-1 w-full resize-none rounded-[10px] border border-[#E9EDEF] bg-white px-3.5 py-2 text-xs text-[#182028] transition outline-none focus:border-[#18A968] focus:ring-3 focus:ring-[#18A968]/15"
              />
            </div>

            {/* Actions */}
            <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-[#F0F3F5] pt-4">
              <button
                type="button"
                disabled={formSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-[10px] border border-[#E9EDEF] bg-white px-4 py-2 text-xs font-semibold text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] disabled:opacity-50"
              >
                Cancel
              </button>

              <Button
                type="submit"
                disabled={formSubmitting}
                className="min-h-[40px] text-xs gap-1.5"
              >
                {formSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : editingItem.isRenewAction ? (
                  'Confirm Renewal'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
