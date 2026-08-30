# 🪒 Barber Appointment Bot | ربات رزرو نوبت آرایشگاه

A production-ready Telegram booking bot for hairdressers/barbers and their customers, built with Next.js, Vercel Chat SDK, and PostgreSQL.

یک ربات تلگرام آماده برای رزرو نوبت آرایشگاه، ساخته شده با Next.js، Vercel Chat SDK و PostgreSQL.

**Live Bot:** [@BarberAppointmentAppBot](https://t.me/BarberAppointmentAppBot)

---

## 📋 Features | ویژگی‌ها

### For Customers | برای مشتریان
- 📅 **Book Appointments** - Select service, date, and time with Persian calendar (Jalali)
- 📋 **View Bookings** - See all upcoming appointments with status
- ❌ **Cancel Bookings** - Cancel appointments with admin notification
- 💇 **Browse Services** - View available services with prices and duration
- ⏰ **Reminders** - Automatic 24-hour reminders (daily at 08:00 Asia/Tehran)

### For Admins | برای مدیران
- ✅ **Confirm/Reject** - Review and respond to booking requests
- 📊 **Daily View** - `/today` - See today's appointments
- 📅 **Weekly View** - `/week` - See upcoming week's appointments
- 🚫 **Block Time** - Block specific time ranges
- 🛠️ **Manage Services** - Add, edit, or disable services
- ⏰ **Working Hours** - Configure opening hours per weekday

### Technical Features | ویژگی‌های فنی
- 🌐 **Persian UI** - All user-facing text in Farsi
- 📅 **Jalali Calendar** - Persian calendar for date display
- 🕐 **Timezone** - Asia/Tehran timezone handling
- 🔒 **No Double-Booking** - Slot validation prevents overlaps
- 💾 **Durable State** - PostgreSQL-backed conversation state
- 🔄 **Idempotent Reminders** - Prevents duplicate reminder messages
- ✅ **Production Ready** - TypeScript, tests, migrations, and seed data

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- Telegram bot token from [@BotFather](https://t.me/BotFather)

### Installation

1. **Clone and install dependencies:**
```bash
git clone https://github.com/farenjir/barber-app.git
cd barber-app
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Get your bot token from @BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Generate a random secret for webhook verification
TELEGRAM_WEBHOOK_SECRET_TOKEN=your_random_secret_here

# Find your Telegram user ID (send /start to @userinfobot)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Database connection string (Neon, Vercel Postgres, or other PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional: customize salon name
SALON_NAME=سالن زیبایی
```

3. **Run migrations and seed data:**
```bash
npm run db:migrate
npm run db:seed
```

4. **Start development server:**
```bash
npm run dev
```

5. **Set up Telegram webhook:**

For production deployment, configure the webhook URL with BotFather:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.vercel.app/api/webhooks/telegram",
    "secret_token": "your_random_secret_here"
  }'
```

**Note:** During local development, the bot automatically uses polling mode. The webhook is only needed for production.

---

## 🔧 Configuration

### Admin Setup | تنظیمات مدیر

**Finding Your Telegram User ID:**

1. Open Telegram and search for [@userinfobot](https://t.me/userinfobot)
2. Send `/start` to the bot
3. Copy your numeric user ID
4. Add it to `ADMIN_TELEGRAM_IDS` in `.env` (comma-separated for multiple admins)

**Admin Commands:**
- `/today` - View today's appointments
- `/week` - View next week's appointments  
- `/block` - Block time slots (coming soon)
- `/services` - Manage services (coming soon)
- `/hours` - Manage working hours (coming soon)
- `/help` - Show help

### Services Configuration | تنظیم خدمات

Default services are seeded automatically:
- **Haircut** (اصلاح مو) - 45 min, 350,000 Toman
- **Beard Trim** (اصلاح ریش) - 20 min, 150,000 Toman
- **Hair Color** (رنگ مو) - 90 min, 1,200,000 Toman
- **Eyebrow** (اصلاح ابرو) - 15 min, 200,000 Toman

To modify services, update the database directly or use the admin commands (when implemented).

### Working Hours | ساعات کاری

Default working hours (Saturday-Thursday 10:00-21:00, Friday closed):
```sql
-- Saturday = 6, Sunday = 0, Monday = 1, ..., Friday = 5
-- Edit in database or via admin commands
SELECT * FROM working_hours;
```

---

## 🏗️ Project Structure

```
barber-app/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── telegram/   # Telegram webhook endpoint
│   │   │   └── cron/
│   │   │       └── reminders/  # Reminder cron job
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── db/
│   │   ├── client.ts           # Database client and types
│   │   ├── schema.sql          # Database schema
│   │   ├── migrate.ts          # Migration runner
│   │   └── seed.ts             # Seed data
│   └── lib/
│       ├── bot.ts              # Main bot logic
│       ├── messages.ts         # Persian UI messages
│       ├── state-adapter.ts    # PostgreSQL state adapter
│       ├── slots.ts            # Slot calculation logic
│       ├── jalali.ts           # Persian calendar utilities
│       └── __tests__/          # Tests
├── .env.example                # Environment variables template
├── vercel.json                 # Vercel configuration (cron)
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Tests cover:
- ✅ Slot overlap detection
- ✅ Working hours validation
- ✅ Closed days (Friday)
- ✅ Duration fitting
- ✅ Timezone handling (Asia/Tehran)
- ✅ Jalali calendar conversion

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables in project settings
   - Deploy

3. **Configure webhook:**
   - After deployment, set the webhook URL using the command shown in Quick Start
   - Use your Vercel deployment URL: `https://your-project.vercel.app/api/webhooks/telegram`

### Environment Variables Required

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456:ABCDEF...` |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Random secret for webhook verification | `random_secret_string` |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin user IDs | `123456789,987654321` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `SALON_NAME` | Salon name (optional) | `سالن زیبایی` |

### Automatic Reminders

The reminder system behavior depends on your Vercel plan:

#### Vercel Hobby Plan (Current)
- **Cron Schedule:** Once daily at `30 4 * * *` (04:30 UTC = 08:00 Asia/Tehran)
- **24-hour reminders:** Sent to appointments scheduled 20-28 hours from the daily run
- **2-hour reminders:** Will rarely fire (only if an appointment happens to be exactly 2 hours away at 08:00)
- **Limitation:** Vercel Hobby only supports daily cron jobs

#### Vercel Pro Plan (Recommended for Full Features)
- **Cron Schedule:** Every 30 minutes `*/30 * * * *`
- **24-hour reminders:** Sent reliably 24 hours before confirmed appointments
- **2-hour reminders:** Sent reliably 2 hours before confirmed appointments
- **Idempotent:** Each reminder is sent only once

To upgrade to Pro for full reminder features, change the `schedule` in `vercel.json` to `*/30 * * * *` and redeploy.

---

## 📖 Customer Flow | جریان کاری مشتری

1. **Start** - Customer sends `/start` to [@BarberAppointmentAppBot](https://t.me/BarberAppointmentAppBot)
2. **Select Service** - Choose from haircut, beard trim, hair color, etc.
3. **Pick Date** - Select from next 14 available days (Jalali calendar)
4. **Choose Time** - Pick from available time slots
5. **Enter Contact** - Provide name and phone number
6. **Confirm** - Review and confirm booking
7. **Wait for Admin** - Admin receives notification with Confirm/Reject buttons
8. **Get Confirmation** - Customer receives confirmation message
9. **Receive Reminder** - Automatic reminder ~24 hours before appointment (daily at 08:00 Asia/Tehran)

---

## 🛠️ Development

### Database Migrations

Apply schema changes:
```bash
npm run db:migrate
```

Seed default data:
```bash
npm run db:seed
```

### Bot Development

The bot uses a state machine pattern for the booking flow:
1. **service** - Select service
2. **date** - Pick date  
3. **time** - Choose time slot
4. **contact** - Collect name/phone
5. **confirm** - Review and confirm

State is stored in PostgreSQL with 1-hour TTL.

### Adding New Features

To add new services:
```sql
INSERT INTO services (name, duration_minutes, price_toman)
VALUES ('خدمت جدید', 30, 200000);
```

To block a time range:
```sql
INSERT INTO blocked_slots (start_time, end_time, reason)
VALUES ('2024-01-10 14:00:00+03:30', '2024-01-10 16:00:00+03:30', 'تعطیلات');
```

---

## 🔐 Security Notes

- **Never commit secrets** - Bot tokens, database URLs, and secrets are in `.env` (gitignored)
- **Webhook verification** - All webhooks are verified with `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- **Admin access** - Only users in `ADMIN_TELEGRAM_IDS` can use admin commands
- **Database security** - Use connection pooling and prepared statements (handled by Neon SDK)

---

## 🐛 Troubleshooting

### Bot not responding
1. Check bot token is correct in `.env`
2. Verify webhook is set correctly (production) or polling is enabled (development)
3. Check Vercel logs for errors

### Reminders not sending
1. Verify cron job is enabled in Vercel dashboard
2. Check `sent_reminders` table for duplicate prevention
3. Review `/api/cron/reminders` logs

### Double-booking occurring
1. Ensure slot validation runs before booking creation
2. Check for race conditions (use database locks if needed)
3. Verify `isSlotAvailable` function logic

### Timezone issues
1. All dates are stored as `timestamptz` in PostgreSQL
2. Application uses `Asia/Tehran` timezone consistently
3. Jalali conversion happens only for display

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

Built with:
- [Vercel Chat SDK](https://chat-sdk.dev) - Multi-platform bot framework
- [Next.js](https://nextjs.org) - React framework
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [jalaali-js](https://github.com/jalaali/jalaali-js) - Persian calendar conversion

---

## 📞 Support | پشتیبانی

For issues or questions:
- Open an issue on GitHub
- Contact the salon directly through the bot

**Bot Username:** [@BarberAppointmentAppBot](https://t.me/BarberAppointmentAppBot)

---

Made with ❤️ for Iranian hairdressers and their customers
