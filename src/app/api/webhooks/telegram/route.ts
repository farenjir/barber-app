import { bot, initializeBot } from '@/lib/bot';

// Initialize bot once at module load
let isInitialized = false;

export async function POST(request: Request): Promise<Response> {
  try {
    // Ensure bot is initialized before processing webhooks
    if (!isInitialized) {
      try {
        await initializeBot();
        isInitialized = true;
      } catch (initError) {
        console.error('Bot initialization error:', initError);
        // Continue anyway - webhook handling may still work
      }
    }

    return await bot.webhooks.telegram(request);
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
