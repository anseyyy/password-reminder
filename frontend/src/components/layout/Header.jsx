'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Mail,
  ChevronDown,
  Loader2,
  Users,
  Globe,
  Server,
  KeyRound,
  X,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import searchApi from '@/api/search.api';
import notificationsApi from '@/api/notifications.api';
import { formatDate } from '@/utils/date.utils';

export default function Header({ user: propUser }) {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();

  // Active User Info
  const activeUser = propUser || authUser || {};

  const displayName = activeUser.name || 'User';
  const displayEmail = activeUser.email || '';
  const initials =
    displayName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationContainerRef = useRef(null);

  // User Dropdown State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Fetch real unread notifications count
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {
      // ignore background notification fetch failures
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 60s background poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Debounced live backend search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchError(null);
      setIsSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setIsSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.search(trimmed);
        if (res?.success && res.data) {
          setSearchResults(res.data);
        } else {
          setSearchResults(null);
        }
      } catch (err) {
        setSearchError(err?.message || 'Search failed');
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to dismiss popups
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(e.target)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResultsCount =
    (searchResults?.clients?.length || 0) +
    (searchResults?.domains?.length || 0) +
    (searchResults?.hosting?.length || 0) +
    (searchResults?.credentials?.length || 0);

  const handleSelectResult = (path) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-40 mx-3.5 mt-3 flex min-h-[72px] w-[calc(100%-28px)] items-center justify-between gap-5 rounded-[20px] border border-[#edf0f2] bg-white px-[18px] py-3.5 shadow-[0_2px_10px_rgba(20,30,40,0.025)] max-md:mx-2.5 max-md:mt-2.5 max-md:min-h-[58px] max-md:w-[calc(100%-20px)] max-md:gap-2.5 max-md:rounded-2xl max-md:px-2.5 max-md:py-2">
      {/* 1. SEARCH PILL & DROPDOWN */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-[380px]">
        <div className="flex h-10 w-full items-center rounded-full border border-[#e7eaf0] bg-[#f5f6f8] px-3.5 transition-all focus-within:border-[#18A968] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#18A968]/15 max-md:h-[38px] max-md:px-3">
          {searchLoading ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-[#18A968]" />
          ) : (
            <Search
              size={16}
              strokeWidth={1.8}
              className="shrink-0 text-[#718096]"
              aria-hidden="true"
            />
          )}

          <input
            type="search"
            placeholder="Search clients, domains, hosting, credentials..."
            value={searchQuery}
            onFocus={() => {
              if (searchQuery.trim().length >= 1) setIsSearchOpen(true);
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length >= 1) setIsSearchOpen(true);
            }}
            className="ml-2.5 w-full min-w-0 border-0 bg-transparent text-xs font-normal text-[#273142] placeholder-[#7c8798] outline-none [appearance:none] [&::-webkit-search-cancel-button]:hidden"
            aria-label="Global Search"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setIsSearchOpen(false);
              }}
              className="p-1 text-[#8F999F] hover:text-[#182028]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* SEARCH RESULTS DROPDOWN */}
        {isSearchOpen && searchQuery.trim().length >= 1 && (
          <div className="absolute left-0 top-12 z-50 w-full min-w-[340px] max-w-[460px] rounded-[18px] border border-[#E9EDEF] bg-white p-3.5 shadow-2xl animate-in fade-in duration-150">
            {searchLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#8F999F]">
                <Loader2 size={15} className="animate-spin text-[#18A968]" />
                <span>Searching live database...</span>
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="py-8 text-center text-xs text-[#8F999F]">
                No records found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto pr-1 text-xs">
                {/* Clients Group */}
                {searchResults?.clients?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8F999F]">
                      <Users size={12} className="text-[#168F5A]" />
                      <span>Clients ({searchResults.clients.length})</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {searchResults.clients.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => handleSelectResult('/clients')}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-[#EFF9F4]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#182028] truncate">{c.name}</p>
                            <p className="text-[11px] text-[#8F999F] truncate">
                              {c.company || c.email || 'Client Profile'}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#168F5A]">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domains Group */}
                {searchResults?.domains?.length > 0 && (
                  <div className="border-t border-[#F0F3F5] pt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8F999F]">
                      <Globe size={12} className="text-[#168F5A]" />
                      <span>Domains ({searchResults.domains.length})</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {searchResults.domains.map((d) => (
                        <div
                          key={d._id}
                          onClick={() => handleSelectResult('/domains')}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-[#EFF9F4]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#182028] truncate">{d.domainName}</p>
                            <p className="text-[11px] text-[#8F999F] truncate">
                              {d.client?.name || 'Direct'} • {d.registrar || 'Domain'}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#168F5A]">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hosting Group */}
                {searchResults?.hosting?.length > 0 && (
                  <div className="border-t border-[#F0F3F5] pt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8F999F]">
                      <Server size={12} className="text-[#3B82F6]" />
                      <span>Hosting ({searchResults.hosting.length})</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {searchResults.hosting.map((h) => (
                        <div
                          key={h._id}
                          onClick={() => handleSelectResult('/hosting')}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-[#EFF6FF]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#182028] truncate">{h.hostingName}</p>
                            <p className="text-[11px] text-[#8F999F] truncate">
                              {h.client?.name || 'Direct'} • {h.provider || 'Server'}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#3B82F6]">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credentials Group */}
                {searchResults?.credentials?.length > 0 && (
                  <div className="border-t border-[#F0F3F5] pt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8F999F]">
                      <KeyRound size={12} className="text-[#7E22CE]" />
                      <span>Credentials ({searchResults.credentials.length})</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {searchResults.credentials.map((cred) => (
                        <div
                          key={cred._id}
                          onClick={() => handleSelectResult('/credentials')}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-[#FAF5FF]"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#182028] truncate">{cred.name}</p>
                            <p className="text-[11px] text-[#8F999F] truncate">
                              {cred.client?.name || 'Vault'} • {cred.username || 'Login'}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#7E22CE]">Vault →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. RIGHT CONTROLS: NOTIFICATIONS & ACCOUNT */}
      <div className="flex min-w-0 items-center gap-2 max-md:gap-1.5">
        {/* Notifications Popover */}
        <div ref={notificationContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e7eaf0] bg-white p-0 text-[#586579] transition-colors duration-200 hover:border-[#d7eee2] hover:bg-[#f3fbf7] hover:text-[#19a863] max-md:h-9 max-md:w-9"
            aria-label="Notifications"
          >
            <Bell size={17} strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span className="absolute right-[5px] top-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-white bg-[#EF4444]" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 top-12 z-50 w-[340px] rounded-[18px] border border-[#E9EDEF] bg-white p-4 shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#F0F3F5] pb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-semibold text-[#182028]">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-[#EF4444] px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <Link
                  href="/notifications"
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-xs font-semibold text-[#168F5A] hover:underline !no-underline"
                >
                  View All
                </Link>
              </div>

              {/* Quick Preview List */}
              <div className="mt-2.5 flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#8F999F]">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <Link
                      key={n._id}
                      href="/notifications"
                      onClick={() => setIsNotificationOpen(false)}
                      className={`flex flex-col gap-0.5 rounded-xl p-2.5 text-xs transition !no-underline ${
                        !n.read ? 'bg-[#F7FDF9] border border-[#d2eedf]' : 'hover:bg-[#FAFBFB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#182028] truncate">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[#18A968]" />}
                      </div>
                      <p className="text-[11.5px] text-[#5A6570] line-clamp-1">{n.message}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <span
          className="mx-1.5 h-7 w-px bg-[#e6e9ed] max-md:hidden"
          aria-hidden="true"
        />

        {/* Account Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex min-w-0 cursor-pointer items-center gap-2.5 bg-transparent p-0 text-inherit outline-none"
            aria-label={`Account menu for ${displayName}`}
          >
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 border-[#16bd65] bg-[#effbf4] text-xs font-semibold text-[#159b5a] max-md:h-9 max-md:w-9">
              {initials}
            </span>

            <span className="flex min-w-0 flex-col items-start text-left leading-tight max-md:hidden">
              <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[#1d2735]">
                {displayName}
              </span>
              <span className="mt-0.5 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-normal text-[#8993a2]">
                {displayEmail}
              </span>
            </span>

            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className="ml-0.5 shrink-0 text-[#7d8795] max-md:hidden"
              aria-hidden="true"
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-[16px] border border-[#E9EDEF] bg-white p-2 shadow-2xl animate-in fade-in duration-150">
              <div className="border-b border-[#F0F3F5] px-3 py-2 text-xs">
                <p className="font-semibold text-[#182028] truncate">{displayName}</p>
                <p className="text-[11px] text-[#8F999F] truncate">{displayEmail}</p>
              </div>

              <div className="mt-1 flex flex-col gap-0.5">
                <Link
                  href="/dashboard"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] !no-underline"
                >
                  Dashboard
                </Link>
                <Link
                  href="/credentials"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] !no-underline"
                >
                  Credentials Vault
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] !no-underline"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="cursor-pointer text-left rounded-lg px-3 py-2 text-xs font-semibold text-[#EF4444] transition hover:bg-[#FEF2F2]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
