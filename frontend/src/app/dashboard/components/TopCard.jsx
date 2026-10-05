'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Globe,
  Server,
  RefreshCw,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

export default function TopCard({
  clients = 0,
  domains = 0,
  hostings = 0,
  renewals = 0,
  loading = false,
}) {
  const cards = [
    {
      id: 'clients',
      title: 'Active Clients',
      value: clients,
      subtitle: 'Managed client accounts',
      href: '/clients',
      icon: Users,
      badge: 'Live',
      isHighlighted: true,
    },
    {
      id: 'domains',
      title: 'Active Domains',
      value: domains,
      subtitle: 'Registered & monitored',
      href: '/domains',
      icon: Globe,
      badge: 'Active',
      isHighlighted: false,
    },
    {
      id: 'hostings',
      title: 'Active Hostings',
      value: hostings,
      subtitle: 'Connected servers & plans',
      href: '/hosting',
      icon: Server,
      badge: 'Online',
      isHighlighted: false,
    },
    {
      id: 'renewals',
      title: 'Upcoming Renewals',
      value: renewals,
      subtitle: 'Expiring within 30 days',
      href: '/calendar',
      icon: RefreshCw,
      badge: renewals > 0 ? `${renewals} due` : 'Up to date',
      isHighlighted: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Link
            key={card.id}
            href={card.href}
            className={`
              group relative
              min-h-[158px]
              overflow-hidden
              rounded-[18px]
              border
              p-[18px]
              transition-all
              duration-300
              ease-out
              !no-underline

              ${
                card.isHighlighted
                  ? `
                    border-[#d9eee4]
                    bg-[#f4fbf7]
                    shadow-[0_4px_20px_rgba(24,169,104,0.055)]
                    hover:-translate-y-[2px]
                    hover:border-[#c9e7da]
                    hover:shadow-[0_10px_28px_rgba(24,169,104,0.09)]
                  `
                  : `
                    border-[#e9edef]
                    bg-white
                    shadow-[0_3px_18px_rgba(20,30,40,0.035)]
                    hover:-translate-y-[2px]
                    hover:border-[#dde3e6]
                    hover:shadow-[0_10px_28px_rgba(20,30,40,0.065)]
                  `
              }
            `}
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div
                className={`
                  flex
                  h-[39px]
                  w-[39px]
                  items-center
                  justify-center
                  rounded-[11px]
                  transition-all
                  duration-300

                  ${
                    card.isHighlighted
                      ? `
                        bg-[#e0f5e9]
                        text-[#168f5a]
                        group-hover:bg-[#d8f1e4]
                      `
                      : `
                        bg-[#f2faf6]
                        text-[#168f5a]
                        group-hover:bg-[#e8f7f0]
                      `
                  }
                `}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>

              {/* Status Badge */}
              <span
                className={`
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  px-2.5
                  py-[5px]
                  text-[10px]
                  font-medium
                  tracking-[0.1px]

                  ${
                    card.isHighlighted
                      ? 'bg-white text-[#168f5a] shadow-[0_1px_5px_rgba(24,169,104,0.06)]'
                      : 'bg-[#f7f8f9] text-[#89929a]'
                  }
                `}
              >
                <span
                  className={`
                    h-[5px]
                    w-[5px]
                    rounded-full
                    ${
                      card.isHighlighted
                        ? 'bg-[#18a968]'
                        : 'bg-[#31b77a]'
                    }
                  `}
                />
                {card.badge}
              </span>
            </div>

            {/* Content */}
            <div className="mt-[17px]">
              <p className="text-[12px] font-medium tracking-[0.05px] text-[#7b858d]">
                {card.title}
              </p>

              <div className="mt-[3px] flex items-baseline gap-2">
                {loading ? (
                  <div className="h-7 w-12 animate-pulse rounded bg-[#E9EDEF]" />
                ) : (
                  <p className="text-[29px] font-semibold leading-none tracking-[-0.8px] text-[#202830]">
                    {card.value}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom */}
            <div className="mt-[17px] flex items-center justify-between">
              <span className="text-[10.5px] leading-none text-[#a0a8ae]">
                {card.subtitle}
              </span>

              <span
                className={`
                  flex
                  h-[25px]
                  w-[25px]
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  duration-300

                  ${
                    card.isHighlighted
                      ? `
                        bg-white
                        text-[#168f5a]
                        group-hover:-translate-y-[1px]
                      `
                      : `
                        bg-[#f7f8f9]
                        text-[#a2aab0]
                        group-hover:bg-[#eef8f3]
                        group-hover:text-[#168f5a]
                        group-hover:-translate-y-[1px]
                      `
                  }
                `}
              >
                <ArrowUpRight size={13} strokeWidth={1.8} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}