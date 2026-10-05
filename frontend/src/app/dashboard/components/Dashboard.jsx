'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import clientsApi from '@/api/clients.api';
import domainsApi from '@/api/domains.api';
import hostingApi from '@/api/hosting.api';
import credentialsApi from '@/api/credentials.api';
import remindersApi from '@/api/reminders.api';
import notificationsApi from '@/api/notifications.api';
import calendarApi from '@/api/calendar.api';
import { useToast } from '@/components/common/ToastProvider';
import Loader from '@/components/common/Loader';
import ErrorMessage from '@/components/common/ErrorMessage';
import { getExpiryStatus } from '@/utils/date.utils';

import DashboardHeader from './DashboardHeader';
import TopCard from './TopCard';
import ExpiryOverview from './ExpiryOverview';
import ExpiringNext from './ExpiringNext';
import RecentReminders from './RecentReminders';
import RecentNotifications from './RecentNotifications';
import ClientOverview from './ClientOverview';
import CalendarOverview from './CalendarOverview';

export default function Dashboard() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [clients, setClients] = useState([]);
  const [domains, setDomains] = useState([]);
  const [hosting, setHosting] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Fetch all backend modules concurrently
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        clientsRes,
        domainsRes,
        hostingRes,
        credentialsRes,
        remindersRes,
        notificationsRes,
        calendarRes,
      ] = await Promise.all([
        clientsApi.getAll().catch(() => ({ success: false, data: [] })),
        domainsApi.getAll().catch(() => ({ success: false, data: [] })),
        hostingApi.getAll().catch(() => ({ success: false, data: [] })),
        credentialsApi.getAll().catch(() => ({ success: false, data: [] })),
        remindersApi.getAll().catch(() => ({ success: false, data: [] })),
        notificationsApi.getAll().catch(() => ({ success: false, data: [] })),
        calendarApi.getAll().catch(() => ({ success: false, data: [] })),
      ]);

      if (clientsRes?.success && Array.isArray(clientsRes.data)) setClients(clientsRes.data);
      if (domainsRes?.success && Array.isArray(domainsRes.data)) setDomains(domainsRes.data);
      if (hostingRes?.success && Array.isArray(hostingRes.data)) setHosting(hostingRes.data);
      if (credentialsRes?.success && Array.isArray(credentialsRes.data)) setCredentials(credentialsRes.data);
      if (remindersRes?.success && Array.isArray(remindersRes.data)) setReminders(remindersRes.data);
      if (notificationsRes?.success && Array.isArray(notificationsRes.data)) setNotifications(notificationsRes.data);
      if (calendarRes?.success && Array.isArray(calendarRes.data)) setCalendarEvents(calendarRes.data);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard metrics.');
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Compute Expiry Map for Calendar Grid
  const expiriesMap = useMemo(() => {
    const map = {};

    domains.forEach((d) => {
      if (!d.expiryDate) return;
      const key = new Date(d.expiryDate).toISOString().split('T')[0];
      map[key] = (map[key] || 0) + 1;
    });

    hosting.forEach((h) => {
      if (!h.expiryDate) return;
      const key = new Date(h.expiryDate).toISOString().split('T')[0];
      map[key] = (map[key] || 0) + 1;
    });

    return map;
  }, [domains, hosting]);

  // Compute Expiring Next (Sorted chronologically)
  const expiringNextList = useMemo(() => {
    const combined = [];

    domains.forEach((d) => {
      if (!d.expiryDate) return;
      const st = getExpiryStatus(d.expiryDate);
      combined.push({
        id: `domain-${d._id}`,
        title: d.domainName,
        type: 'domain',
        client: d.client?.name || 'Direct Client',
        expiryDate: new Date(d.expiryDate).toISOString().split('T')[0],
        status: st.statusLabel,
        urgency: st.urgency,
        daysLeft: st.daysLeft,
      });
    });

    hosting.forEach((h) => {
      if (!h.expiryDate) return;
      const st = getExpiryStatus(h.expiryDate);
      combined.push({
        id: `hosting-${h._id}`,
        title: h.hostingName,
        type: 'hosting',
        client: h.client?.name || 'Direct Client',
        expiryDate: new Date(h.expiryDate).toISOString().split('T')[0],
        status: st.statusLabel,
        urgency: st.urgency,
        daysLeft: st.daysLeft,
      });
    });

    // Sort by expiry date ascending
    return combined.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
  }, [domains, hosting]);

  // Count renewals due within 30 days
  const upcomingRenewalsCount = useMemo(() => {
    return expiringNextList.filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30).length;
  }, [expiringNextList]);

  // Unified upcoming calendar list
  const upcomingScheduleList = useMemo(() => {
    const events = [];

    expiringNextList.forEach((item) => {
      events.push({
        id: item.id,
        title: item.title,
        client: item.client,
        expiryDate: item.expiryDate,
        type: item.type,
        status: item.status,
      });
    });

    calendarEvents.forEach((c) => {
      if (!c.startDate) return;
      events.push({
        id: `cal-${c._id}`,
        title: c.title,
        client: c.client?.name || 'Scheduled Event',
        expiryDate: new Date(c.startDate).toISOString().split('T')[0],
        type: 'event',
        status: 'Active',
      });
    });

    return events.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
  }, [expiringNextList, calendarEvents]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-8 sm:gap-6">
      {/* Top 4 Metric Cards */}
      <TopCard
        clients={clients.length}
        domains={domains.length}
        hostings={hosting.length}
        renewals={upcomingRenewalsCount}
        loading={loading}
      />

      {error ? (
        <div className="rounded-[18px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchDashboardData} variant="card" />
        </div>
      ) : (
        <>
          {/* Main Analytics Row: Expiry Calendar (8 cols) + Expiring Next (4 cols) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <ExpiryOverview expiries={expiriesMap} loading={loading} />
            </div>
            <div className="lg:col-span-4">
              <ExpiringNext items={expiringNextList} loading={loading} />
            </div>
          </div>

          {/* Operations Row 1: Recent Reminders (5 cols) + Client Overview (7 cols) */}
          {/* <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <RecentReminders renewals={expiringNextList} loading={loading} />
            </div>
            <div className="lg:col-span-7">
              <ClientOverview
                clients={clients}
                domains={domains}
                hosting={hosting}
                credentials={credentials}
                loading={loading}
              />
            </div>
          </div> */}

          {/* Operations Row 2: Activity & Alerts (5 cols) + Calendar Overview (7 cols) */}
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <RecentNotifications notifications={notifications} loading={loading} />
            </div>
            <div className="lg:col-span-7">
              <CalendarOverview events={upcomingScheduleList} loading={loading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
