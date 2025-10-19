export function formatDate(date: Date, timezone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
}

export function formatDateTime(date: Date, timezone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
}

export function getStartOfDay(date: Date, timezone = 'UTC'): Date {
  const offsetMs = getTimezoneOffset(timezone);
  const localDate = new Date(date.getTime() + offsetMs);
  localDate.setHours(0, 0, 0, 0);
  return new Date(localDate.getTime() - offsetMs);
}

export function getEndOfDay(date: Date, timezone = 'UTC'): Date {
  const offsetMs = getTimezoneOffset(timezone);
  const localDate = new Date(date.getTime() + offsetMs);
  localDate.setHours(23, 59, 59, 999);
  return new Date(localDate.getTime() - offsetMs);
}

export function getStartOfMonth(date: Date, timezone = 'UTC'): Date {
  const offsetMs = getTimezoneOffset(timezone);
  const localDate = new Date(date.getTime() + offsetMs);
  localDate.setDate(1);
  localDate.setHours(0, 0, 0, 0);
  return new Date(localDate.getTime() - offsetMs);
}

export function getEndOfMonth(date: Date, timezone = 'UTC'): Date {
  const offsetMs = getTimezoneOffset(timezone);
  const localDate = new Date(date.getTime() + offsetMs);
  localDate.setMonth(localDate.getMonth() + 1, 0);
  localDate.setHours(23, 59, 59, 999);
  return new Date(localDate.getTime() - offsetMs);
}

function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return targetTime.getTime() - utc.getTime();
}