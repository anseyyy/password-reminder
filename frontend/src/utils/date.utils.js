/**
 * Utility to calculate expiry status and styling from real backend ISO date strings
 */
export function getExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) {
    return {
      daysLeft: 0,
      statusLabel: 'No Expiry',
      urgency: 'upcoming',
      badgeClass: 'bg-[#F5F6F8] text-[#7C878E] border-[#E9EDEF]',
      dotClass: 'bg-[#94A3B8]',
    };
  }

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      daysLeft: 0,
      statusLabel: 'Invalid Date',
      urgency: 'expired',
      badgeClass: 'bg-[#F5F5F5] text-[#8F999F] border-[#E5E7EB]',
      dotClass: 'bg-[#9CA3AF]',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(expiry);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return {
      daysLeft: diffDays,
      statusLabel: overdue === 1 ? 'Expired 1 day ago' : `Expired ${overdue} days ago`,
      urgency: 'expired',
      badgeClass: 'bg-[#F5F5F5] text-[#8F999F] border-[#E5E7EB]',
      dotClass: 'bg-[#9CA3AF]',
    };
  }

  if (diffDays === 0) {
    return {
      daysLeft: 0,
      statusLabel: 'Expires today',
      urgency: 'today',
      badgeClass: 'bg-[#FFF1F1] text-[#C24141] border-[#FCA5A5]',
      dotClass: 'bg-[#EF4444]',
    };
  }

  if (diffDays === 1) {
    return {
      daysLeft: 1,
      statusLabel: 'Expires tomorrow',
      urgency: 'tomorrow',
      badgeClass: 'bg-[#FFF1E8] text-[#C2410C] border-[#FDBA74]',
      dotClass: 'bg-[#F97316]',
    };
  }

  if (diffDays <= 3) {
    return {
      daysLeft: diffDays,
      statusLabel: `Expires in ${diffDays} days`,
      urgency: 'urgent',
      badgeClass: 'bg-[#FFF8E9] text-[#B7791F] border-[#FDE047]',
      dotClass: 'bg-[#EAB308]',
    };
  }

  if (diffDays <= 7) {
    return {
      daysLeft: diffDays,
      statusLabel: `Expires in ${diffDays} days`,
      urgency: 'warning',
      badgeClass: 'bg-[#FFF8E9] text-[#B7791F] border-[#FDE047]',
      dotClass: 'bg-[#EAB308]',
    };
  }

  if (diffDays <= 30) {
    return {
      daysLeft: diffDays,
      statusLabel: `Expires in ${diffDays} days`,
      urgency: 'upcoming',
      badgeClass: 'bg-[#EFF9F4] text-[#168F5A] border-[#A7F3D0]',
      dotClass: 'bg-[#18A968]',
    };
  }

  return {
    daysLeft: diffDays,
    statusLabel: `Expires in ${diffDays} days`,
    urgency: 'upcoming',
    badgeClass: 'bg-[#EFF9F4] text-[#168F5A] border-[#A7F3D0]',
    dotClass: 'bg-[#18A968]',
  };
}

/**
 * Format ISO date string into readable text (e.g. Sep 25, 2026)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
