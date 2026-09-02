import { describe, it, expect, vi } from 'vitest';

// Mock the database client
vi.mock('@/db/client', () => ({
  sql: vi.fn().mockResolvedValue([]), // No collisions
}));

// Re-import after mocking
import { generateBarberCode } from '../auth';

describe('Barber code generation', () => {
  it('should generate a 6-character code', async () => {
    const code = await generateBarberCode();
    expect(code).toHaveLength(6);
  });

  it('should only use unambiguous characters', async () => {
    const code = await generateBarberCode();
    const validChars = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
    expect(code).toMatch(validChars);
  });

  it('should not contain ambiguous characters (0, O, 1, I)', async () => {
    const code = await generateBarberCode();
    expect(code).not.toContain('0');
    expect(code).not.toContain('O');
    expect(code).not.toContain('1');
    expect(code).not.toContain('I');
  });

  it('should generate unique codes', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const code = await generateBarberCode();
      codes.add(code);
    }
    // All codes should be unique
    expect(codes.size).toBe(10);
  });
});

describe('Phone validation', () => {
  // Helper function (duplicated from webhook route for testing)
  function isValidPhone(phone: string): boolean {
    return /^09\d{9}$/.test(phone.replace(/[\s-]/g, ''));
  }

  it('should accept valid Iranian mobile numbers', () => {
    expect(isValidPhone('09123456789')).toBe(true);
    expect(isValidPhone('09101234567')).toBe(true);
    expect(isValidPhone('09999999999')).toBe(true);
  });

  it('should accept valid numbers with spaces or dashes', () => {
    expect(isValidPhone('0912 345 6789')).toBe(true);
    expect(isValidPhone('0912-345-6789')).toBe(true);
    expect(isValidPhone('0912 345-6789')).toBe(true);
  });

  it('should reject numbers with wrong prefix', () => {
    expect(isValidPhone('08123456789')).toBe(false);
    expect(isValidPhone('9123456789')).toBe(false);
    expect(isValidPhone('00989123456789')).toBe(false);
  });

  it('should reject numbers with wrong length', () => {
    expect(isValidPhone('091234567')).toBe(false);     // Too short
    expect(isValidPhone('091234567890')).toBe(false);  // Too long
    expect(isValidPhone('0912345678')).toBe(false);    // Too short
  });

  it('should reject non-numeric characters', () => {
    expect(isValidPhone('0912abc6789')).toBe(false);
    expect(isValidPhone('۰۹۱۲۳۴۵۶۷۸۹')).toBe(false); // Persian digits
    expect(isValidPhone('09123456789x')).toBe(false);
  });

  it('should reject empty or invalid input', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('   ')).toBe(false);
    expect(isValidPhone('hello')).toBe(false);
  });
});
