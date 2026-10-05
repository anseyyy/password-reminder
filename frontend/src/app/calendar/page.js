import React from 'react';
import Calender from './components/Calender';

export const metadata = {
  title: 'Calendar - RemindPro',
  description: 'Manage domain expiries, server renewals, and client reminder schedules on an interactive calendar.',
};

export default function CalendarPage() {
  return <Calender />;
}
