'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Server,
  Calendar,
  Building,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import domainsApi from '@/api/domains.api';
import hostingApi from '@/api/hosting.api';
import { useToast } from '@/components/common/ToastProvider';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { formatDate } from '@/utils/date.utils';

export default function RemindersPage() {
  const router = useRouter();
  const toast = useToast();

  const [domains, setDomains] = useState([]);
  const [hosting, setHosting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | domain | hosting
  const [urgencyFilter, setUrgencyFilter] = useState('all'); // all | 7days | 30days | expired | active
  const [sortBy, setSortBy] = useState('upcoming'); // upcoming | latest | name

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Quick Renew Modal State
  const [renewingItem, setRenewingItem] = useState(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // Fetch all domain and hosting records
  const fetchAllRenewals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [domainsRes, hostingRes] = await Promise.all([
        domainsApi.getAll().catch(() => ({ success: false, data: [] })),
        hostingApi.getAll().catch(() => ({ success: false, data: [] })),
      ]);

      if (domainsRes?.success && Array.isArray(domainsRes.data)) {
        setDomains(domainsRes.data);
      } else if (Array.isArray(domainsRes)) {
        setDomains(domainsRes);
      } else {
        setDomains([]);
      }

      if (hostingRes?.success && Array.isArray(hostingRes.data)) {
        setHosting(hostingRes.data);
      } else if (Array.isArray(hostingRes)) {
        setHosting(hostingRes);
      } else {
        setHosting([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load renewal records.');
      toast.error('Failed to load renewals.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllRenewals();
  }, [fetchAllRenewals]);

  // Combine and normalize all renewal items (Domains & Hosting)
  const allRenewals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = [];

    // 1. Domains
    domains.forEach((d) => {
      const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
      let daysLeft = null;
      if (expiry && !isNaN(expiry.getTime())) {
        const expMidnight = new Date(expiry);
        expMidnight.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((expMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      items.push({
        id: d._id,
        rawId: d._id,
        type: 'domain',
        title: d.domainName,
        subtitle: d.registrar ? `Registrar: ${d.registrar}` : 'Domain Name',
        clientName: d.client?.name || d.client?.company || 'Unassigned',
        clientCompany: d.client?.company || '',
        expiryDate: d.expiryDate,
        daysLeft,
        targetRoute: '/domains',
        rawData: d,
      });
    });

    // 2. Hosting
    hosting.forEach((h) => {
      const expiry = h.expiryDate ? new Date(h.expiryDate) : null;
      let daysLeft = null;
      if (expiry && !isNaN(expiry.getTime())) {
        const expMidnight = new Date(expiry);
        expMidnight.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((expMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      items.push({
        id: h._id,
        rawId: h._id,
        type: 'hosting',
        title: h.hostingName,
        subtitle: h.provider ? `Provider: ${h.provider}` : (h.hostname || 'Web Hosting'),
        clientName: h.client?.name || h.client?.company || 'Unassigned',
        clientCompany: h.client?.company || '',
        expiryDate: h.expiryDate,
        daysLeft,
        targetRoute: '/hosting',
        rawData: h,
      });
    });

    return items;
  }, [domains, hosting]);

  // Metric counts
  const stats = useMemo(() => {
    let expiringIn7 = 0;
    let expiringIn30 = 0;
    let expiredCount = 0;

    allRenewals.forEach((item) => {
      if (item.daysLeft !== null) {
        if (item.daysLeft < 0) {
          expiredCount++;
        } else {
          if (item.daysLeft <= 7) expiringIn7++;
          if (item.daysLeft <= 30) expiringIn30++;
        }
      }
    });

    return {
      total: allRenewals.length,
      expiringIn7,
      expiringIn30,
      expiredCount,
    };
  }, [allRenewals]);

  // Filter and Sort Renewals (Upcoming First by Default)
  const filteredRenewals = useMemo(() => {
    let list = allRenewals.filter((item) => {
      // Type Filter
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // Urgency Filter
      if (urgencyFilter === '7days') {
        if (item.daysLeft === null || item.daysLeft < 0 || item.daysLeft > 7) return false;
      } else if (urgencyFilter === '30days') {
        if (item.daysLeft === null || item.daysLeft < 0 || item.daysLeft > 30) return false;
      } else if (urgencyFilter === 'expired') {
        if (item.daysLeft === null || item.daysLeft >= 0) return false;
      } else if (urgencyFilter === 'active') {
        if (item.daysLeft !== null && item.daysLeft < 0) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const subMatch = item.subtitle?.toLowerCase().includes(q);
        const clientMatch =
          item.clientName?.toLowerCase().includes(q) ||
          item.clientCompany?.toLowerCase().includes(q);
        if (!titleMatch && !subMatch && !clientMatch) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }

      if (sortBy === 'latest') {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
        return dateB - dateA;
      }

      // Default: 'upcoming' -> Future/active upcoming first (soonest to farthest), then expired
      const aDays = a.daysLeft !== null ? a.daysLeft : 99999;
      const bDays = b.daysLeft !== null ? b.daysLeft : 99999;

      // If both are upcoming (>= 0), smaller days first (e.g. 0, 1, 2, 5, 20...)
      if (aDays >= 0 && bDays >= 0) {
        return aDays - bDays;
      }
      // If a is upcoming and b is expired, upcoming comes first
      if (aDays >= 0 && bDays < 0) {
        return -1;
      }
      // If b is upcoming and a is expired, upcoming comes first
      if (bDays >= 0 && aDays < 0) {
        return 1;
      }
      // If both are expired (< 0), most recently expired first
      return bDays - aDays;
    });

    return list;
  }, [allRenewals, typeFilter, urgencyFilter, searchQuery, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, urgencyFilter, sortBy]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRenewals.length / itemsPerPage));
  const paginatedRenewals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRenewals.slice(start, start + itemsPerPage);
  }, [filteredRenewals, currentPage, itemsPerPage]);

  // Quick Renew Handler
  const handleOpenRenew = (item) => {
    setRenewingItem(item);
    // Pre-calculate +1 year from current expiry or today
    const baseDate = item.expiryDate ? new Date(item.expiryDate) : new Date();
    const target = isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate);
    target.setFullYear(target.getFullYear() + 1);
    setNewExpiryDate(target.toISOString().split('T')[0]);
  };

  const handleApplyQuickAddYears = (years) => {
    const baseDate = renewingItem?.expiryDate ? new Date(renewingItem.expiryDate) : new Date();
    const target = isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate);
    target.setFullYear(target.getFullYear() + years);
    setNewExpiryDate(target.toISOString().split('T')[0]);
  };

  const handleSaveRenewal = async (e) => {
    e.preventDefault();
    if (!newExpiryDate || !renewingItem) return;

    setRenewSubmitting(true);
    try {
      if (renewingItem.type === 'domain') {
        await domainsApi.update(renewingItem.rawId, { expiryDate: newExpiryDate });
        toast.success(`Domain "${renewingItem.title}" renewed to ${formatDate(newExpiryDate)}`);
      } else if (renewingItem.type === 'hosting') {
        await hostingApi.update(renewingItem.rawId, { expiryDate: newExpiryDate });
        toast.success(`Hosting "${renewingItem.title}" renewed to ${formatDate(newExpiryDate)}`);
      }

      setRenewingItem(null);
      fetchAllRenewals();
    } catch (err) {
      toast.error(err?.message || 'Failed to update renewal date.');
    } finally {
      setRenewSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#182028]">
            Renewals &amp; Expiry
          </h1>
          <p className="mt-1 text-xs text-[#8F999F]">
            All upcoming domain and hosting renewals automatically tracked and listed by expiry date
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchAllRenewals}
            icon={RefreshCw}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-4 shadow-[0_2px_12px_rgba(20,30,40,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8F999F]">Total Renewals</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#EFF9F4] text-[#168F5A]">
              <Calendar size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#182028]">{stats.total}</p>
        </div>

        <div
          onClick={() => setUrgencyFilter(urgencyFilter === '7days' ? 'all' : '7days')}
          className={`cursor-pointer rounded-[18px] border p-4 transition-all duration-150 ${
            urgencyFilter === '7days'
              ? 'border-orange-300 bg-orange-50/50 shadow-md ring-2 ring-orange-400/20'
              : 'border-[#E9EDEF] bg-white shadow-[0_2px_12px_rgba(20,30,40,0.03)] hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8F999F]">Expiring ≤ 7 Days</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-orange-50 text-orange-600">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-600">{stats.expiringIn7}</p>
        </div>

        <div
          onClick={() => setUrgencyFilter(urgencyFilter === '30days' ? 'all' : '30days')}
          className={`cursor-pointer rounded-[18px] border p-4 transition-all duration-150 ${
            urgencyFilter === '30days'
              ? 'border-blue-300 bg-blue-50/50 shadow-md ring-2 ring-blue-400/20'
              : 'border-[#E9EDEF] bg-white shadow-[0_2px_12px_rgba(20,30,40,0.03)] hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8F999F]">Expiring ≤ 30 Days</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-blue-50 text-blue-600">
              <Clock size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">{stats.expiringIn30}</p>
        </div>

        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'expired' ? 'all' : 'expired')}
          className={`cursor-pointer rounded-[18px] border p-4 transition-all duration-150 ${
            urgencyFilter === 'expired'
              ? 'border-red-300 bg-red-50/50 shadow-md ring-2 ring-red-400/20'
              : 'border-[#E9EDEF] bg-white shadow-[0_2px_12px_rgba(20,30,40,0.03)] hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8F999F]">Expired</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-red-50 text-red-600">
              <ShieldAlert size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{stats.expiredCount}</p>
        </div>
      </div>

      {/* 3. SEARCH, FILTERS & SORT CONTROLS */}
      <div className="flex flex-col gap-3 rounded-[18px] border border-[#E9EDEF] bg-white p-4 shadow-[0_2px_12px_rgba(20,30,40,0.02)] md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F999F]"
          />
          <input
            type="text"
            placeholder="Search renewals, clients, providers, domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-[12px] border border-[#E9EDEF] bg-[#F8FAFB] pl-10 pr-4 text-xs text-[#182028] placeholder-[#8F999F] outline-none transition focus:border-[#18A968] focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-[12px] border border-[#E9EDEF] bg-white px-3 text-xs text-[#182028] outline-none transition focus:border-[#18A968]"
          >
            <option value="all">All Types</option>
            <option value="domain">Domains</option>
            <option value="hosting">Hosting</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="h-10 rounded-[12px] border border-[#E9EDEF] bg-white px-3 text-xs text-[#182028] outline-none transition focus:border-[#18A968]"
          >
            <option value="all">All Timelines</option>
            <option value="active">Active Only</option>
            <option value="7days">Expiring in 7 Days</option>
            <option value="30days">Expiring in 30 Days</option>
            <option value="expired">Expired Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-[12px] border border-[#E9EDEF] bg-white px-3 text-xs text-[#182028] outline-none transition focus:border-[#18A968]"
          >
            <option value="upcoming">Sort: Upcoming First</option>
            <option value="latest">Sort: Latest Expiry</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. RENEWALS LIST TABLE / CARDS */}
      {loading ? (
        <div className="py-16">
          <Loader text="Loading all upcoming renewals..." />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchAllRenewals} />
      ) : filteredRenewals.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No renewals found"
          description={
            searchQuery || typeFilter !== 'all' || urgencyFilter !== 'all'
              ? 'No renewal records match your current filter criteria.'
              : 'Add domains and hosting records to automatically monitor all upcoming renewals here.'
          }
          actionLabel={
            searchQuery || typeFilter !== 'all' || urgencyFilter !== 'all'
              ? 'Clear Filters'
              : 'Add Domain'
          }
          onAction={
            searchQuery || typeFilter !== 'all' || urgencyFilter !== 'all'
              ? () => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setUrgencyFilter('all');
                  setSortBy('upcoming');
                }
              : () => router.push('/domains')
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[18px] border border-[#E9EDEF] bg-white shadow-[0_2px_12px_rgba(20,30,40,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E9EDEF] bg-[#F8FAFB] text-[11px] font-bold uppercase tracking-wider text-[#8F999F]">
                  <tr>
                    <th className="px-5 py-3.5">Type &amp; Asset</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Expiry Date</th>
                    <th className="px-5 py-3.5">Countdown</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EDEF]">
                  {paginatedRenewals.map((item) => {
                    const isExpired = item.daysLeft !== null && item.daysLeft < 0;
                    const isToday = item.daysLeft === 0;
                    const isUrgent = item.daysLeft !== null && item.daysLeft > 0 && item.daysLeft <= 7;
                    const isWarning = item.daysLeft !== null && item.daysLeft > 7 && item.daysLeft <= 30;

                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        className="transition hover:bg-[#F9FBFA]"
                      >
                        {/* 1. Asset Name & Type */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                                item.type === 'domain'
                                  ? 'bg-[#EFF9F4] text-[#168F5A]'
                                  : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              {item.type === 'domain' ? (
                                <Globe size={16} />
                              ) : (
                                <Server size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#182028] truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-[#8F999F] truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Client */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building size={13} className="text-[#8F999F] shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-[#182028] truncate">
                                {item.clientName}
                              </p>
                              {item.clientCompany && item.clientCompany !== item.clientName && (
                                <p className="text-[11px] text-[#8F999F] truncate">
                                  {item.clientCompany}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Expiry Date */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 font-medium text-[#182028]">
                            <Calendar size={13} className="text-[#8F999F]" />
                            <span>{item.expiryDate ? formatDate(item.expiryDate) : 'No date'}</span>
                          </div>
                        </td>

                        {/* 4. Relative Countdown Badge */}
                        <td className="px-5 py-4">
                          {item.daysLeft === null ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                              No Expiry
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                              <ShieldAlert size={12} />
                              Expired {Math.abs(item.daysLeft)}d ago
                            </span>
                          ) : isToday ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 animate-pulse">
                              <AlertTriangle size={12} />
                              Expires Today!
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
                              <Clock size={12} />
                              Expires in {item.daysLeft}d
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                              In {item.daysLeft} days
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#C8EAD9] bg-[#EFF9F4] px-2.5 py-1 text-[11px] font-medium text-[#168F5A]">
                              In {item.daysLeft} days
                            </span>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenRenew(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#C8EAD9] bg-[#EFF9F4] px-2.5 py-1.5 text-xs font-semibold text-[#168F5A] transition hover:bg-[#18A968] hover:text-white"
                            >
                              <RefreshCw size={12} />
                              <span>Renew</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push(item.targetRoute)}
                              title="View Details"
                              className="rounded-lg p-1.5 text-[#8F999F] transition hover:bg-gray-100 hover:text-[#182028]"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E9EDEF] bg-[#F8FAFB] px-5 py-3 sm:flex-row text-xs">
              <span className="text-[#8F999F]">
                Showing{' '}
                <span className="font-semibold text-[#182028]">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-[#182028]">
                  {Math.min(currentPage * itemsPerPage, filteredRenewals.length)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[#182028]">
                  {filteredRenewals.length}
                </span>{' '}
                renewals
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9EDEF] bg-white text-[#182028] transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                      currentPage === pageNum
                        ? 'bg-[#18A968] text-white shadow-sm'
                        : 'border border-[#E9EDEF] bg-white text-[#182028] hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E9EDEF] bg-white text-[#182028] transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUICK RENEW MODAL */}
      <Modal
        isOpen={!!renewingItem}
        onClose={() => setRenewingItem(null)}
        title={`Renew ${renewingItem?.type === 'domain' ? 'Domain' : 'Hosting'}`}
      >
        {renewingItem && (
          <form onSubmit={handleSaveRenewal} className="space-y-4">
            <div className="rounded-[14px] border border-[#E9EDEF] bg-[#F8FAFB] p-3.5 text-xs">
              <p className="font-semibold text-[#182028]">{renewingItem.title}</p>
              <p className="mt-0.5 text-[#8F999F]">
                Current Expiry:{' '}
                <span className="font-medium text-[#182028]">
                  {renewingItem.expiryDate ? formatDate(renewingItem.expiryDate) : 'Not Set'}
                </span>
              </p>
            </div>

            {/* Quick Extension Buttons */}
            <div>
              <label className="block text-xs font-semibold text-[#182028] mb-1.5">
                Quick Extend
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyQuickAddYears(1)}
                  className="rounded-lg border border-[#E9EDEF] bg-white py-2 text-xs font-semibold text-[#182028] hover:border-[#18A968] hover:bg-[#EFF9F4]"
                >
                  +1 Year
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickAddYears(2)}
                  className="rounded-lg border border-[#E9EDEF] bg-white py-2 text-xs font-semibold text-[#182028] hover:border-[#18A968] hover:bg-[#EFF9F4]"
                >
                  +2 Years
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickAddYears(3)}
                  className="rounded-lg border border-[#E9EDEF] bg-white py-2 text-xs font-semibold text-[#182028] hover:border-[#18A968] hover:bg-[#EFF9F4]"
                >
                  +3 Years
                </button>
              </div>
            </div>

            {/* Custom Expiry Date Input */}
            <div>
              <label className="block text-xs font-semibold text-[#182028] mb-1">
                New Expiry Date
              </label>
              <input
                type="date"
                required
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="h-10 w-full rounded-[12px] border border-[#E9EDEF] bg-white px-3 text-xs text-[#182028] outline-none transition focus:border-[#18A968]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setRenewingItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={renewSubmitting}
              >
                Save Renewal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
