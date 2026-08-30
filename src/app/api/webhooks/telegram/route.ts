import { bot } from '@/lib/bot-simple';

export async function POST(request: Request): Promise<Response> {
  try {
    return await bot.webhooks.telegram(request);
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
