'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';

export default function ExpiryOverview({ expiries = {}, loading = false }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = useMemo(() => {
    const items = [];
    for (let i = 0; i < firstDay; i++) {
      items.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      items.push(day);
    }
    return items;
  }, [firstDay, daysInMonth]);

  const formatDateKey = useCallback((day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, [year, month]);

  const goPrevious = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const totalExpiriesThisMonth = useMemo(() => {
    let sum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(d);
      if (expiries[key]) sum += expiries[key];
    }
    return sum;
  }, [daysInMonth, expiries, formatDateKey]);

  const handleDayClick = (dateKey, count) => {
    if (count > 0) {
      router.push(`/calendar/${dateKey}`);
    }
  };

  return (
    <section className="flex h-full flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#DDE3E6] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EFF9F4] text-[#168F5A]">
            <CalendarDays size={15} strokeWidth={2} />
          </div>

          <div>
            <h2 className="text-[15px] font-semibold text-[#182028]">
              Expiry Calendar
            </h2>
            <p className="mt-0.5 text-[11px] text-[#929BA1]">
              Upcoming domain & hosting expiries
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1 rounded-[10px] bg-[#F6F8F8] p-1">
          <button
            type="button"
            onClick={goPrevious}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#89939A] transition hover:bg-white hover:text-[#168F5A]"
          >
            <ChevronLeft size={14} />
          </button>

          <span className="min-w-[92px] text-center text-[11px] font-medium text-[#3C464D]">
            {monthName}
          </span>

          <button
            type="button"
            onClick={goNext}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#89939A] transition hover:bg-white hover:text-[#168F5A]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mt-5">
        {/* Weekdays */}
        <div className="mb-2 grid grid-cols-7">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="text-center text-[9px] font-medium uppercase tracking-wide text-[#A0A8AD]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }

            const dateKey = formatDateKey(day);
            const expiryCount = expiries[dateKey] || 0;
            const todayDate = isToday(day);

            return (
              <div
                key={dateKey}
                onClick={() => handleDayClick(dateKey, expiryCount)}
                className={`
                  relative
                  flex
                  h-[42px]
                  items-center
                  justify-center
                  rounded-[10px]
                  border
                  text-[11px]
                  font-medium
                  transition-all
                  duration-150

                  ${
                    expiryCount
                      ? expiryCount >= 3
                        ? 'cursor-pointer border-[#fecaca] bg-[#fff1f1] text-[#c24141] hover:scale-[1.03]'
                        : 'cursor-pointer border-[#fee2e2] bg-[#fff7f7] text-[#c85a5a] hover:scale-[1.03]'
                      : 'border-transparent bg-[#F8FAF9] text-[#59636A]'
                  }

                  ${
                    todayDate
                      ? 'ring-1 ring-[#18A968] ring-offset-1'
                      : ''
                  }

                  hover:border-[#D7E9E0]
                  hover:bg-[#F1FAF5]
                `}
              >
                {day}

                {/* Expiry indicator */}
                {expiryCount > 0 && (
                  <span
                    className={`
                      absolute
                      bottom-[5px]
                      h-[4px]
                      rounded-full
                      ${
                        expiryCount >= 3
                          ? 'w-[14px] bg-[#ef4444]'
                          : 'w-[6px] bg-[#f87171]'
                      }
                    `}
                  />
                )}

                {/* Count Badge */}
                {expiryCount > 1 && (
                  <span className="absolute right-[4px] top-[3px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[7px] font-semibold text-white">
                    {expiryCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between border-t border-[#F0F3F5] pt-3">
        <div className="flex items-center gap-4">
          <Legend dot="bg-[#18A968]" label="Today" />
          <Legend dot="bg-[#f87171]" label="Expiry" />
          <Legend dot="bg-[#ef4444]" label="Multiple" />
        </div>

        <span className="text-[10px] text-[#929BA1]">
          {loading ? (
            <Loader2 size={11} className="inline animate-spin text-[#18A968]" />
          ) : (
            `${totalExpiriesThisMonth} this month`
          )}
        </span>
      </div>
    </section>
  );
}

function Legend({ dot, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-[6px] w-[6px] rounded-full ${dot}`} />
      <span className="text-[9px] text-[#8F999F]">{label}</span>
    </div>
  );
}