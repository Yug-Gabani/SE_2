/**
 * Time utility functions for TeleMeet Appointment Scheduling & Join-Window Enforcement.
 */

export interface AppointmentTimeStatus {
  canJoin: boolean;
  status: 'FUTURE_LOCKED' | 'OPEN_NOW' | 'CONCLUDED' | 'PAST_UNCONCLUDED';
  badgeLabel: string;
  badgeColor: string;
  timeRemainingText: string;
  scheduledFormatted: string;
  opensAtFormatted: string;
  diffMinutes: number;
}

/**
 * Window settings:
 * - EARLY_JOIN_MINUTES: Number of minutes before appointment when room unlocks (15 mins)
 * - LATE_JOIN_MINUTES: Number of minutes after appointment start time when it stays accessible (60 mins)
 */
export const EARLY_JOIN_MINUTES = 15;
export const LATE_JOIN_MINUTES = 60;

/**
 * Robustly parses various scheduled_time representations:
 * 1. ISO strings: "2026-10-30T19:30:00" or "2026-10-30T19:30"
 * 2. Formatted strings with ISO embedded: "Oct 30, 2026, 7:30 PM (2026-10-30T19:30:00.000Z)"
 * 3. Natural strings: "Today at 5:30 PM", "Tomorrow at 10:00 AM"
 * 4. "Now" / "Immediate"
 */
export function parseAppointmentDate(timeStr: string | undefined | null): Date {
  if (!timeStr) return new Date();

  const str = timeStr.trim();

  // If contains ISO in parentheses
  const isoMatch = str.match(/\(([^)]+T[^)]+)\)/);
  if (isoMatch && isoMatch[1]) {
    const d = new Date(isoMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // Try standard Date parse
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() >= 2020) {
    return directDate;
  }

  const now = new Date();

  // Check for "Now" or "Immediate"
  if (/^(now|immediate|today\s+now)/i.test(str)) {
    return now;
  }

  // Check for "Today at HH:MM AM/PM" or "Tomorrow at HH:MM AM/PM"
  const isTomorrow = /tomorrow/i.test(str);
  const isToday = /today/i.test(str);

  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (timeMatch && (isToday || isTomorrow)) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const target = new Date();
    if (isTomorrow) {
      target.setDate(target.getDate() + 1);
    }
    target.setHours(hours, minutes, 0, 0);
    return target;
  }

  // Fallback: return now
  return now;
}

/**
 * Calculates current join status and countdown based on appointment time and current time.
 */
export function getAppointmentTimeStatus(
  scheduledTimeStr: string,
  hasSummary: boolean = false,
  currentTime: Date = new Date()
): AppointmentTimeStatus {
  const appDate = parseAppointmentDate(scheduledTimeStr);
  const diffMs = appDate.getTime() - currentTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor(diffMs / 1000);

  // Time when consultation room unlocks (15 mins prior)
  const unlockDate = new Date(appDate.getTime() - EARLY_JOIN_MINUTES * 60 * 1000);

  // Formatting strings
  const scheduledFormatted = formatDateTime(appDate);
  const opensAtFormatted = formatTimeOnly(unlockDate);

  // 1. If summary already generated or appointment is past +60 mins and already concluded
  if (hasSummary && diffMinutes < -LATE_JOIN_MINUTES) {
    return {
      canJoin: false,
      status: 'CONCLUDED',
      badgeLabel: 'Consultation Concluded',
      badgeColor: '#10b981',
      timeRemainingText: 'Consultation completed',
      scheduledFormatted,
      opensAtFormatted,
      diffMinutes,
    };
  }

  // 2. Future Locked: More than 15 minutes before scheduled start time
  if (diffMinutes > EARLY_JOIN_MINUTES) {
    const minutesUntilOpen = diffMinutes - EARLY_JOIN_MINUTES;
    const hours = Math.floor(minutesUntilOpen / 60);
    const mins = minutesUntilOpen % 60;

    let timeRemainingText = '';
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      timeRemainingText = `Opens in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      timeRemainingText = `Opens in ${hours}h ${mins}m`;
    } else {
      const secs = Math.max(0, diffSeconds - EARLY_JOIN_MINUTES * 60) % 60;
      timeRemainingText = `Opens in ${mins}m ${secs}s`;
    }

    return {
      canJoin: false,
      status: 'FUTURE_LOCKED',
      badgeLabel: `🔒 Opens at ${opensAtFormatted}`,
      badgeColor: '#f59e0b',
      timeRemainingText,
      scheduledFormatted,
      opensAtFormatted,
      diffMinutes,
    };
  }

  // 3. Open Now: Within 15 minutes before start, up to 60 minutes after start
  if (diffMinutes <= EARLY_JOIN_MINUTES && diffMinutes >= -LATE_JOIN_MINUTES) {
    let timeRemainingText = '';
    if (diffMinutes > 0) {
      timeRemainingText = `Starts in ${diffMinutes} min${diffMinutes === 1 ? '' : 's'}`;
    } else {
      const elapsed = Math.abs(diffMinutes);
      timeRemainingText = `Started ${elapsed}m ago`;
    }

    return {
      canJoin: true,
      status: 'OPEN_NOW',
      badgeLabel: '🟢 Room Active Now',
      badgeColor: '#10b981',
      timeRemainingText,
      scheduledFormatted,
      opensAtFormatted,
      diffMinutes,
    };
  }

  // 4. Past appointment window (> 60 mins past)
  if (hasSummary) {
    return {
      canJoin: false,
      status: 'CONCLUDED',
      badgeLabel: 'Concluded',
      badgeColor: '#64748b',
      timeRemainingText: 'Past Appointment',
      scheduledFormatted,
      opensAtFormatted,
      diffMinutes,
    };
  } else {
    // If past slot without summary, allow doctor/patient to still join to finish up or view records
    return {
      canJoin: true,
      status: 'PAST_UNCONCLUDED',
      badgeLabel: '⚠️ Past Slot (Open)',
      badgeColor: '#eab308',
      timeRemainingText: 'Session Pending Conclusion',
      scheduledFormatted,
      opensAtFormatted,
      diffMinutes,
    };
  }
}

/**
 * Formats a Date object into a readable date and time string: "Oct 30, 2026 at 7:30 PM"
 */
export function formatDateTime(d: Date): string {
  try {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return d.toISOString();
  }
}

/**
 * Formats a Date object into time only: "7:30 PM"
 */
export function formatTimeOnly(d: Date): string {
  try {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Helper to produce standard datetime string for datetime-local input: "YYYY-MM-DDTHH:mm"
 */
export function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}
