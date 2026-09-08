import { NextRequest, NextResponse } from 'next/server';
import { getNextOpenDays } from '@/lib/slots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barberId, duration } = body;
    
    if (!barberId || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const dates = await getNextOpenDays(barberId, 14);
    
    return NextResponse.json({
      dates: dates.map(d => d.toISOString()),
    });
  } catch (error) {
    console.error('Error fetching dates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
