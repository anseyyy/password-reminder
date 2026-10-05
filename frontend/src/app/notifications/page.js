'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Clock,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Globe,
  Server,
  KeyRound,
  CheckCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import notificationsApi from '@/api/notifications.api';
import { useToast } from '@/components/common/ToastProvider';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { formatDate } from '@/utils/date.utils';

export default function NotificationsPage() {
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unread | read

  // Delete State
  const [deletingNotification, setDeletingNotification] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Mark read loading
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch notifications
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load notifications.');
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'read') return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Mark Single Notification as Read
  const handleMarkRead = async (notification) => {
    if (notification.read) return;
    setMarkingId(notification._id);
    try {
      const res = await notificationsApi.markRead(notification._id);
      if (res?.success) {
        toast.success('Notification marked as read');
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
      } else {
        toast.error(res?.message || 'Failed to update notification');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update notification');
    } finally {
      setMarkingId(null);
    }
  };

  // Mark All Unread as Read
  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => notificationsApi.markRead(n._id)));
      toast.success('All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      toast.error(err?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  // Delete Single Notification
  const handleDeleteConfirm = async () => {
    if (!deletingNotification) return;
    setDeleteLoading(true);
    try {
      const res = await notificationsApi.remove(deletingNotification._id);
      if (res?.success) {
        toast.success('Notification deleted');
        setNotifications((prev) => prev.filter((n) => n._id !== deletingNotification._id));
        setDeletingNotification(null);
      } else {
        toast.error(res?.message || 'Failed to delete notification');
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to delete notification');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper to pick type icon & color
  const getTypeIcon = (type) => {
    switch (type) {
      case 'domain':
        return {
          icon: Globe,
          bg: 'bg-[#EFF9F4]',
          color: 'text-[#168F5A]',
        };
      case 'hosting':
        return {
          icon: Server,
          bg: 'bg-[#EFF6FF]',
          color: 'text-[#3B82F6]',
        };
      case 'security':
      case 'credential':
        return {
          icon: KeyRound,
          bg: 'bg-[#FAF5FF]',
          color: 'text-[#7E22CE]',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-[#FFF8E9]',
          color: 'text-[#B7791F]',
        };
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 pb-12">
      {/* Header Card */}
      <div className="flex flex-col gap-4 rounded-[20px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_14px_rgba(20,30,40,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EFF9F4] text-[#168F5A]">
            <Bell size={19} strokeWidth={2} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#EF4444] px-2 py-0.5 text-[11px] font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
              System alerts, upcoming expiry notices, and client reminder logs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            title="Refresh notifications"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[11px] border border-[#E9EDEF] bg-[#FAFBFB] text-[#7C878E] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#168F5A]' : ''} />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-[11px] border border-[#E9EDEF] bg-[#FAFBFB] px-3.5 py-2 text-xs font-semibold text-[#182028] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A]"
            >
              {markingAll ? (
                <Loader2 size={13} className="animate-spin text-[#168F5A]" />
              ) : (
                <CheckCheck size={14} className="text-[#168F5A]" />
              )}
              <span>Mark all as read</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex items-center rounded-[11px] border border-[#E9EDEF] bg-[#FAFBFB] p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold transition ${
                filter === 'all'
                  ? 'bg-white text-[#182028] shadow-2xs'
                  : 'text-[#7C878E] hover:text-[#182028]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold transition ${
                filter === 'unread'
                  ? 'bg-white text-[#182028] shadow-2xs'
                  : 'text-[#7C878E] hover:text-[#182028]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('read')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold transition ${
                filter === 'read'
                  ? 'bg-white text-[#182028] shadow-2xs'
                  : 'text-[#7C878E] hover:text-[#182028]'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading notifications..." />
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchData} variant="card" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description={
            filter === 'unread'
              ? 'You are all caught up! No unread notices at the moment.'
              : 'Notifications about domain expiries, hosting renewals, and reminder dispatches will appear here.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotifications.map((notification) => {
            const { icon: TypeIcon, bg, color } = getTypeIcon(notification.type);
            const isUnread = !notification.read;
            const isMarking = markingId === notification._id;

            return (
              <div
                key={notification._id}
                className={`group flex flex-col justify-between gap-3 rounded-[16px] border p-4 transition-all duration-200 sm:flex-row sm:items-center sm:p-5 ${
                  isUnread
                    ? 'border-[#C8EAD9] bg-[#F7FDF9] shadow-[0_2px_10px_rgba(24,169,104,0.04)]'
                    : 'border-[#E9EDEF] bg-white shadow-2xs hover:border-[#D3D9DE]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${bg} ${color}`}
                  >
                    <TypeIcon size={18} strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-[14.5px] ${
                          isUnread ? 'font-bold text-[#182028]' : 'font-semibold text-[#3D4752]'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-[#18A968] shrink-0" />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-[#5A6570]">
                      {notification.message}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[#8F999F]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(notification.createdAt)}
                      </span>

                      {notification.type && (
                        <span className="capitalize">{notification.type} alert</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-[#F0F3F5] pt-2.5 sm:border-t-0 sm:pt-0 shrink-0">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification)}
                      disabled={isMarking}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-[8px] border border-[#E9EDEF] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563] transition hover:border-[#18A968] hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                      title="Mark as read"
                    >
                      {isMarking ? (
                        <Loader2 size={12} className="animate-spin text-[#168F5A]" />
                      ) : (
                        <CheckCircle2 size={13} className="text-[#18A968]" />
                      )}
                      <span>Mark Read</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeletingNotification(notification)}
                    className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                    title="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingNotification)}
        onClose={() => !deleteLoading && setDeletingNotification(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Notification"
        message="Are you sure you want to delete this notification?"
        confirmText="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}
