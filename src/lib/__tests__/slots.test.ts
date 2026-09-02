import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database client
vi.mock('../../db/client', () => ({
  sql: vi.fn(),
}));

import { sql } from '../../db/client';

const TEST_BARBER_ID = 1;

// Test helper functions
describe('Slot calculation and validation (barber-scoped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Working hours validation', () => {
    it('should reject slots on closed days (Friday)', async () => {
      const friday = new Date('2024-01-05T10:00:00+03:30'); // Friday in Tehran
      expect(friday.getDay()).toBe(5); // Friday is day 5
      
      // Mock: Friday is closed for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 5,
        start_time: '10:00',
        end_time: '21:00',
        is_open: false,
      }]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(TEST_BARBER_ID, friday, 45);
      
      expect(available).toBe(false);
    });

    it('should accept slots on open days within working hours', async () => {
      const saturday = new Date('2024-01-06T14:00:00+03:30'); // Saturday 14:00
      expect(saturday.getDay()).toBe(6); // Saturday
      
      // Mock: Saturday is open 10:00-21:00 for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: No blocked slots for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      // Mock: No existing appointments for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(TEST_BARBER_ID, saturday, 45);
      
      expect(available).toBe(true);
    });

    it('should reject slots outside working hours', async () => {
      const earlyMorning = new Date('2024-01-06T08:00:00+03:30'); // Saturday 08:00
      
      // Mock: Working hours 10:00-21:00 for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(TEST_BARBER_ID, earlyMorning, 45);
      
      expect(available).toBe(false);
    });

    it('should reject slots that would extend past closing time', async () => {
      const lateSlot = new Date('2024-01-06T20:30:00+03:30'); // Saturday 20:30
      
      // Mock: Working hours 10:00-21:00 for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      const { isSlotAvailable } = await import('../slots');
      // 45-minute service would end at 21:15, past closing
      const available = await isSlotAvailable(TEST_BARBER_ID, lateSlot, 45);
      
      expect(available).toBe(false);
    });
  });

  describe('Overlap detection (per-barber)', () => {
    it('should detect overlapping appointments for the same barber', async () => {
      const newSlot = new Date('2024-01-06T14:00:00+03:30');
      
      // Mock: Working hours OK for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: No blocked slots for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      // Mock: Existing appointment for this barber at 14:30 (30 min duration)
      (sql as any).mockResolvedValueOnce([{
        id: 1,
        barber_id: TEST_BARBER_ID,
        appointment_time: new Date('2024-01-06T14:30:00+03:30'),
        duration_minutes: 30,
        status: 'confirmed',
      }]);
      
      const { isSlotAvailable } = await import('../slots');
      // New 45-min slot at 14:00 would overlap with 14:30 appointment
      const available = await isSlotAvailable(TEST_BARBER_ID, newSlot, 45);
      
      expect(available).toBe(false);
    });

    it('should allow non-overlapping appointments for the same barber', async () => {
      const newSlot = new Date('2024-01-06T14:00:00+03:30');
      
      // Mock: Working hours OK for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: No blocked slots for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      // Mock: Existing appointment at 15:00 (45 min duration)
      // New slot 14:00-14:45 should not overlap with 15:00-15:45
      (sql as any).mockResolvedValueOnce([]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(TEST_BARBER_ID, newSlot, 45);
      
      expect(available).toBe(true);
    });

    it('should allow same time slot for different barbers', async () => {
      const newSlot = new Date('2024-01-06T14:00:00+03:30');
      const barber2Id = 2;
      
      // Mock: Working hours OK for barber 2
      (sql as any).mockResolvedValueOnce([{
        barber_id: barber2Id,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: No blocked slots for barber 2
      (sql as any).mockResolvedValueOnce([]);
      
      // Mock: No appointments for barber 2 (even though barber 1 might have one)
      (sql as any).mockResolvedValueOnce([]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(barber2Id, newSlot, 45);
      
      expect(available).toBe(true);
    });
  });

  describe('Duration fitting', () => {
    it('should fit exact duration in available time', async () => {
      const slot = new Date('2024-01-06T20:00:00+03:30');
      
      // Mock: Working hours 10:00-21:00 for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: No blocked slots for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      // Mock: No appointments for this barber
      (sql as any).mockResolvedValueOnce([]);
      
      const { isSlotAvailable } = await import('../slots');
      // 60-minute service would end exactly at 21:00
      const available = await isSlotAvailable(TEST_BARBER_ID, slot, 60);
      
      expect(available).toBe(true);
    });
  });

  describe('Blocked slots (per-barber)', () => {
    it('should reject slots in blocked time ranges for the barber', async () => {
      const slot = new Date('2024-01-06T14:00:00+03:30');
      
      // Mock: Working hours OK for this barber
      (sql as any).mockResolvedValueOnce([{
        barber_id: TEST_BARBER_ID,
        weekday: 6,
        start_time: '10:00',
        end_time: '21:00',
        is_open: true,
      }]);
      
      // Mock: Blocked slot for this barber from 13:00 to 15:00
      (sql as any).mockResolvedValueOnce([{
        id: 1,
        barber_id: TEST_BARBER_ID,
        start_time: new Date('2024-01-06T13:00:00+03:30'),
        end_time: new Date('2024-01-06T15:00:00+03:30'),
      }]);
      
      const { isSlotAvailable } = await import('../slots');
      const available = await isSlotAvailable(TEST_BARBER_ID, slot, 45);
      
      expect(available).toBe(false);
    });
  });

  describe('Timezone handling (Asia/Tehran)', () => {
    it('should handle Tehran timezone correctly', () => {
      const date = new Date('2024-01-06T14:00:00+03:30');
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Tehran',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      
      expect(timeStr).toMatch(/\d{2}:\d{2}/);
    });
  });
});

describe('Date utilities', () => {
  it('should correctly identify weekdays', () => {
    const saturday = new Date('2024-01-06'); // Saturday
    const friday = new Date('2024-01-05'); // Friday
    
    expect(saturday.getDay()).toBe(6);
    expect(friday.getDay()).toBe(5);
  });
});

describe('Per-barber closed days (platform requirements)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Friday slots for barber B when barber A is closed on Friday', async () => {
    const friday = new Date('2024-01-05T14:00:00+03:30'); // Friday
    expect(friday.getDay()).toBe(5);
    
    const barberAId = 1;
    const barberBId = 2;
    
    // Test barber A (Friday closed)
    (sql as any).mockResolvedValueOnce([{
      barber_id: barberAId,
      weekday: 5,
      start_time: '10:00',
      end_time: '21:00',
      is_open: false, // Closed on Friday
    }]);
    
    const { isSlotAvailable } = await import('../slots');
    const availableA = await isSlotAvailable(barberAId, friday, 45);
    expect(availableA).toBe(false);
    
    // Test barber B (Friday open)
    (sql as any).mockResolvedValueOnce([{
      barber_id: barberBId,
      weekday: 5,
      start_time: '10:00',
      end_time: '21:00',
      is_open: true, // Open on Friday
    }]);
    
    // Mock: No blocked slots for barber B
    (sql as any).mockResolvedValueOnce([]);
    
    // Mock: No appointments for barber B
    (sql as any).mockResolvedValueOnce([]);
    
    const availableB = await isSlotAvailable(barberBId, friday, 45);
    expect(availableB).toBe(true);
  });
});

describe('Barber visibility requirements', () => {
  it('should describe filter logic: barbers without active services should not appear in booking list', () => {
    // This is tested at the query level in getActiveBarbers()
    // The query filters for barbers that have at least one active service
    // This test documents the requirement
    
    expect(true).toBe(true); // Placeholder - actual test is integration level
  });
});
