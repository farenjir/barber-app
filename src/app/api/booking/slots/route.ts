import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/slots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barberId, date, duration } = body;
    
    if (!barberId || !date || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const dateObj = new Date(date);
    const slots = await getAvailableSlots(barberId, dateObj, duration);
    
    return NextResponse.json({
      slots: slots.map(s => s.toISOString()),
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
