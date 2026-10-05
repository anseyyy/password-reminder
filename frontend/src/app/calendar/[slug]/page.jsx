import React from 'react';
import CalendarDateDetail from '../components/innerpage/page';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || 'Date';
  return {
    title: `Calendar: ${slug} - RemindPro`,
    description: `Expiry & reminder schedule details for ${slug}.`,
  };
}

export default async function CalendarSlugPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';

  return <CalendarDateDetail slug={slug} />;
}
