'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Globe,
  Server,
  KeyRound,
  Bell,
  CalendarDays,
} from 'lucide-react';

function DashboardGridIcon({ size = 16, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.5" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.5" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.5" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="2.5" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard',   icon: DashboardGridIcon },
  { label: 'Clients',   href: '/clients',     icon: Users             },
  { label: 'Domains',   href: '/domains',     icon: Globe             },
  { label: 'Hosting',   href: '/hosting',     icon: Server            },
  { label: 'Passwords', href: '/credentials', icon: KeyRound          },
  { label: 'Renewals',  href: '/reminders',   icon: Bell              },
  { label: 'Calendar',  href: '/calendar',    icon: CalendarDays      },
];

export default function BottomBar() {
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-2.5 left-1/2 z-50 w-[calc(100%-16px)] max-w-[480px] -translate-x-1/2 rounded-[20px] border border-[#E9EDEF] bg-white/95 px-1.5 py-1.5 shadow-[0_6px_24px_rgba(20,30,40,0.1)] backdrop-blur-md lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-7 items-center gap-0.5" role="list">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="w-full">
              <Link
                href={href}
                className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-[12px] py-1 text-center transition-all duration-150 !no-underline ${
                  active
                    ? 'bg-[#EFF9F4] text-[#168F5A] shadow-xs font-bold'
                    : 'text-[#8F999F] hover:bg-[#F5F6F8] hover:text-[#182028] font-medium'
                }`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className="text-[9px] tracking-tight leading-none truncate max-w-full">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
