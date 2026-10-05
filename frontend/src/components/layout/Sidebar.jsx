'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Globe,
  Server,
  KeyRound,
  Bell,
  CalendarDays,
  Settings,
  LogOut,
} from 'lucide-react';

function DashboardGridIcon({ size = 18, className = '', ...props }) {
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

const NAV_MAIN = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardGridIcon },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Domains', href: '/domains', icon: Globe },
  { label: 'Hosting', href: '/hosting', icon: Server },
  { label: 'Credentials', href: '/credentials', icon: KeyRound },
  { label: 'Reminders', href: '/reminders', icon: Bell },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
];

const NAV_GENERAL = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Logout', href: '/logout', icon: LogOut },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="fixed bottom-3 left-3.5 top-3 z-50 hidden w-[260px] flex-col overflow-y-auto rounded-[20px] border border-[#edf0f2] bg-white px-3.5 pb-4 pt-5.5 shadow-[0_2px_12px_rgba(20,30,40,0.035)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex"
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="mb-6 flex items-center gap-3 px-2.5">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[#19b967] text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L3 8L12 13L21 8L12 3Z" fill="currentColor" />
            <path
              d="M3 13L12 18L21 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 17L12 22L21 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.2px] text-[#171b22]">
          RemindPro
        </span>
      </div>

      {/* Main menu */}
      <div className="w-full">
        <p className="mb-2 px-3.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9aa2ac]">
          MENU
        </p>

        <nav aria-label="Main navigation">
          <ul className="flex flex-col gap-0.5">
            {NAV_MAIN.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);

              return (
                <li key={href} className="group relative w-full">
                  {/* Left indicator bar on active/hover */}
                  <span
                    className={`pointer-events-none absolute -left-3.5 top-1/2 z-10 h-7 w-[5px] -translate-y-1/2 rounded-r-lg bg-[#18A968] transition-opacity duration-200 ${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    aria-hidden="true"
                  />

                  <Link
                    href={href}
                    className={`flex h-12 w-full items-center gap-3.5 rounded-[13px] px-4 text-[15.5px] transition-colors duration-200 !no-underline ${
                      active
                        ? 'bg-[#EFF9F4] font-semibold text-[#182028]'
                        : 'font-medium text-[#98A0A3] hover:bg-[#F1FAF5] hover:text-[#182028]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200 ${
                        active
                          ? 'text-[#168F5A]'
                          : 'text-[#98A0A3] group-hover:text-[#168F5A]'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>

                    <span className="overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 leading-[1.35]">
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Spacer */}
      <div className="min-h-[30px] flex-1" />

      {/* General */}
      <div className="w-full border-t border-[#edf0f2] pt-4">
        <p className="mb-2 px-3.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9aa2ac]">
          GENERAL
        </p>

        <nav aria-label="General navigation">
          <ul className="flex flex-col gap-0.5">
            {NAV_GENERAL.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              const isLogout = href === '/logout';

              if (isLogout) {
                return (
                  <li key={href} className="group relative w-full">
                    <span
                      className="pointer-events-none absolute -left-3.5 top-1/2 z-10 h-7 w-[5px] -translate-y-1/2 rounded-r-lg bg-[#d35b5b] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      onClick={logout}
                      className="flex h-12 w-full cursor-pointer items-center gap-3.5 rounded-[13px] px-4 text-[15.5px] font-medium text-[#98A0A3] transition-colors duration-200 hover:bg-[#fff5f5] hover:text-[#d35b5b] outline-none"
                    >
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200 text-[#98A0A3] group-hover:text-[#d35b5b]">
                        <Icon size={18} strokeWidth={1.8} />
                      </span>

                      <span className="overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 leading-[1.35]">
                        {label}
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={href} className="group relative w-full">
                  <span
                    className={`pointer-events-none absolute -left-3.5 top-1/2 z-10 h-7 w-[5px] -translate-y-1/2 rounded-r-lg bg-[#18A968] transition-opacity duration-200 ${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    aria-hidden="true"
                  />

                  <Link
                    href={href}
                    className={`flex h-12 w-full items-center gap-3.5 rounded-[13px] px-4 text-[15.5px] transition-colors duration-200 !no-underline ${
                      active
                        ? 'bg-[#EFF9F4] font-semibold text-[#182028]'
                        : 'font-medium text-[#98A0A3] hover:bg-[#F1FAF5] hover:text-[#182028]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200 ${
                        active
                          ? 'text-[#168F5A]'
                          : 'text-[#98A0A3] group-hover:text-[#168F5A]'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>

                    <span className="overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 leading-[1.35]">
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
