'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/dashboard',    icon: DashboardIcon },
  { label: 'Clients',       href: '/clients',       icon: ClientsIcon   },
  { label: 'Domains',       href: '/domains',       icon: DomainsIcon   },
  { label: 'Hosting',       href: '/hosting',       icon: HostingIcon   },
  { label: 'Credentials',   href: '/credentials',   icon: KeyIcon       },
  { label: 'Reminders',     href: '/reminders',     icon: BellIcon      },
  { label: 'Calendar',      href: '/calendar',      icon: CalendarIcon  },
  { label: 'Notifications', href: '/notifications', icon: NotifIcon     },
];

export default function DesktopBottomBar() {
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 rounded-full border border-[#edf0f2] bg-white px-5 py-2 shadow-lg lg:flex" aria-label="Desktop bottom navigation">
      <ul className="flex items-center gap-2" role="list">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors duration-200 !no-underline ${
                  active
                    ? 'bg-[#EFF9F4] font-semibold text-[#18A968]'
                    : 'text-[#98A0A3] hover:bg-[#f5f6f8] hover:text-[#273142]'
                }`.trim()}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="flex items-center" aria-hidden="true">
                  <Icon />
                </span>
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function ClientsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function DomainsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function HostingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="4" rx="1" />
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <rect x="2" y="17" width="20" height="4" rx="1" />
      <circle cx="6" cy="5" r="0.5" fill="currentColor" />
      <circle cx="6" cy="12" r="0.5" fill="currentColor" />
      <circle cx="6" cy="19" r="0.5" fill="currentColor" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function NotifIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <line x1="12" y1="6" x2="12" y2="10" />
    </svg>
  );
}
