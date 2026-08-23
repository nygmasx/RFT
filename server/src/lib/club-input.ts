const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function buildRecurringSessionDates(startDate: string, repeatWeeks: number) {
  if (!DATE_RE.test(startDate) || !Number.isInteger(repeatWeeks) || repeatWeeks < 1 || repeatWeeks > 52) return null;
  const date = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) return null;
  return Array.from({ length: repeatWeeks }, (_, index) => {
    const occurrence = new Date(date);
    occurrence.setUTCDate(occurrence.getUTCDate() + index * 7);
    return occurrence.toISOString().slice(0, 10);
  });
}

export function bookingStatus(bookedCount: number, capacity: number): 'booked' | 'waitlist' {
  return bookedCount >= capacity ? 'waitlist' : 'booked';
}

export function parseDocumentDataUrl(value: unknown, maxBase64Length = 8_000_000) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match || match[2].length > maxBase64Length) return null;
  return { mimeType: match[1], base64: match[2] };
}
