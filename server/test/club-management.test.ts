import assert from 'node:assert/strict';
import test from 'node:test';

import { bookingStatus, buildRecurringSessionDates, parseDocumentDataUrl } from '../src/lib/club-input';

test('recurring class dates preserve the weekday across month boundaries', () => {
  assert.deepEqual(buildRecurringSessionDates('2026-08-31', 4), [
    '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21',
  ]);
});

test('recurring classes reject invalid dates and unsafe repetition counts', () => {
  assert.equal(buildRecurringSessionDates('2026-02-31', 2), null);
  assert.equal(buildRecurringSessionDates('2026-08-31', 0), null);
  assert.equal(buildRecurringSessionDates('2026-08-31', 53), null);
});

test('full classes place the next registration on the waitlist', () => {
  assert.equal(bookingStatus(29, 30), 'booked');
  assert.equal(bookingStatus(30, 30), 'waitlist');
  assert.equal(bookingStatus(31, 30), 'waitlist');
});

test('document payloads accept known data URLs and enforce the size cap', () => {
  assert.deepEqual(parseDocumentDataUrl('data:application/pdf;base64,QUJD'), { mimeType: 'application/pdf', base64: 'QUJD' });
  assert.equal(parseDocumentDataUrl('https://malicious.example/file.pdf'), null);
  assert.equal(parseDocumentDataUrl('data:image/png;base64,QUJD', 3), null);
});
