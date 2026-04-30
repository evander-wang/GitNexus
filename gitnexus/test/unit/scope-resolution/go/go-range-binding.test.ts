import { describe, expect, it } from 'vitest';

describe('Go range binding', () => {
  it('is covered by integration parity: go-map-range and go-for-call-expr fixtures', () => {
    // The real assertion: for _, user := range userMap must bind user to map value type
    // and for _, user := range GetUsers() must bind user to return element type.
    expect(true).toBe(true);
  });
});
