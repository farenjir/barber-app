# 🪒 Barber Appointment Bot | ربات رزرو نوبت آرایشگاه

A production-ready Telegram booking bot for hairdressers/barbers and their customers, built with Next.js and PostgreSQL. Supports multiple barbers with separate schedules and services.

یک ربات تلگرام آماده برای رزرو نوبت آرایشگاه، ساخته شده با Next.js و PostgreSQL. پشتیبانی از چند آرایشگر با برنامه‌های کاری و خدمات جداگانه.

**Live Bot:** [@BarberAppointmentAppBot](https://t.me/BarberAppointmentAppBot)

---

## 📋 Features | ویژگی‌ها

### Three-Role System | سیستم سه نقشی

The system supports three distinct roles with different interfaces:

#### 🧑 Customer | مشتری
- **Telegram bot only** - No web access
- 📅 **Book Appointments** - Select barber, service, date, and time
- 📋 **View Bookings** - See upcoming appointments with status
- ❌ **Cancel Bookings** - Cancel appointments with barber notification
- 💇 **Browse Services** - View services by barber with prices
- ⏰ **Reminders** - Automatic reminders (daily at 08:00 Asia/Tehran)

#### 💈 Barber | آرایشگر
- **Telegram bot + web panel**
- **Telegram features:**
  - ✅ **Confirm/Reject** - Review and respond to booking requests
  - 📊 `/today` - See today's appointments
  - 📅 `/week` - See this week's appointments
  - 🔐 `/panel` - Get magic link to web panel
- **Web panel (`/barber`):**
  - 📅 **Calendar view** - Week view with Jalali dates
  - 💇 **Services CRUD** - Create, edit, disable services
  - 🕐 **Working hours** - Configure opening hours per weekday
  - 🚫 **Block slots** - Block specific time ranges
  - 👥 **Customer list** - View customers from appointments
  - ➕ **Manual booking** - Create appointments manually

#### 👨‍💼 Super Admin | سوپر ادمین
- **Web only (`/admin`)**
- 👨‍💼 **Manage barbers** - Add/disable barbers by Telegram ID
- 📊 **View all appointments** - Filter by barber, date, status
- 👥 **View all customers** - Complete customer database
- ⚙️ **Salon settings** - Configure salon name and settings
- 📈 **Dashboard** - Overview of all salon activity
- **Telegram:** `/panel` command only (for web access link)

### Technical Features | ویژگی‌های فنی
- 🌐 **Persian UI** - All user-facing text in Farsi (bot + web)
- 📅 **Jalali Calendar** - Persian calendar for date display
- 🕐 **Timezone** - Asia/Tehran timezone handling
- 🔒 **Per-Barber Slots** - No overlap between barbers
- 🔐 **Magic Link Auth** - Secure web panel access via Telegram
- 💾 **Durable State** - PostgreSQL-backed conversation state
- 🔄 **Idempotent Reminders** - Prevents duplicate messages
- ✅ **Production Ready** - TypeScript, tests, migrations, RTL UI

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
# This will be the super admin
ADMIN_TELEGRAM_IDS=123456789

# Database connection string (Neon, Vercel Postgres, or other PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Web application URL (for magic link authentication)
# Use your Vercel deployment URL or custom domain
APP_URL=https://your-domain.com

# Optional: customize salon name
SALON_NAME=سالن زیبایی
```

3. **Run migrations and seed data:**
```bash
npm run db:migrate
npm run db:migrate:data  # Migrate existing data if upgrading
npm run db:seed
```

This will:
- Create all database tables
- Create a super admin user from `ADMIN_TELEGRAM_IDS`
- Create a default barber with sample services
- Set up default working hours

4. **Start development server:**
```bash
npm run dev
```

5. **Set up Telegram webhook:**

For production deployment, configure the webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.vercel.app/api/webhooks/telegram",
    "secret_token": "your_random_secret_here"
  }'
```

---

## 🔧 Configuration

### Role Setup | تنظیمات نقش‌ها

#### Setting Up Super Admin

1. Find your Telegram User ID:
   - Open [@userinfobot](https://t.me/userinfobot) in Telegram
   - Send `/start`
   - Copy your numeric user ID
2. Add it to `ADMIN_TELEGRAM_IDS` in `.env` (comma-separated for multiple admins)
3. After running migrations and seed, this user will be a super admin

#### Adding Barbers

**Via Web Panel (Super Admin):**
1. Super admin sends `/panel` to the bot
2. Opens the magic link
3. Navigates to `/admin/barbers`
4. Clicks "Add Barber"
5. Enters barber's Telegram ID and name

**Direct Database:**
```sql
-- First, create a user
INSERT INTO users (telegram_id, role, name, is_active)
VALUES (987654321, 'barber', 'آرایشگر نمونه', true);

-- Then create barber record
INSERT INTO barbers (user_id, display_name, is_active)
VALUES ((SELECT id FROM users WHERE telegram_id = 987654321), 'آرایشگر نمونه', true);
```

### Services Configuration | تنظیم خدمات

Each barber has their own services. Default services are seeded:
- **Haircut** (اصلاح مو) - 45 min, 350,000 Toman
- **Beard Trim** (اصلاح ریش) - 20 min, 150,000 Toman
- **Hair Color** (رنگ مو) - 90 min, 1,200,000 Toman
- **Eyebrow** (اصلاح ابرو) - 15 min, 200,000 Toman

Barbers can manage their services via the web panel at `/barber/services`.

### Working Hours | ساعات کاری

Each barber has independent working hours. Default: Saturday-Thursday 10:00-21:00, Friday closed.

Configure via web panel at `/barber/hours` or directly in the database:

```sql
-- View working hours for a barber
SELECT * FROM working_hours WHERE barber_id = 1;

-- Saturday = 6, Sunday = 0, Monday = 1, ..., Friday = 5
```

---

## 🏗️ Project Structure

```
barber-app/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── admin/              # Super admin web panel
│   │   │   ├── page.tsx        # Admin dashboard
│   │   │   ├── barbers/        # Manage barbers
│   │   │   ├── appointments/   # View all appointments
│   │   │   ├── customers/      # View all customers
│   │   │   └── settings/       # Salon settings
│   │   ├── barber/             # Barber web panel
│   │   │   ├── page.tsx        # Barber dashboard
│   │   │   ├── calendar/       # Calendar view
│   │   │   ├── services/       # Manage services
│   │   │   ├── hours/          # Working hours
│   │   │   └── customers/      # Customer list
│   │   ├── login/              # Magic link login page
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── telegram/   # Telegram webhook (RAW API)
│   │   │   └── cron/
│   │   │       └── reminders/  # Reminder cron job
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── db/
│   │   ├── client.ts           # Database client and types
│   │   ├── schema.sql          # Database schema
│   │   ├── migrate.ts          # Schema migration runner
│   │   ├── migrate-data.ts     # Data migration (upgrade)
│   │   └── seed.ts             # Seed data
│   ├── lib/
│   │   ├── auth.ts             # Magic links & sessions
│   │   ├── messages.ts         # Persian UI messages
│   │   ├── slots.ts            # Per-barber slot logic
│   │   ├── jalali.ts           # Persian calendar
│   │   └── __tests__/          # Tests
│   └── middleware.ts           # Web auth & role gates
├── .env.example                # Environment variables template
├── vercel.json                 # Vercel configuration (cron)
└── package.json
```

---

## 👥 User Flows

### Customer Flow | جریان مشتری

1. Customer sends `/start` to bot
2. Taps "📅 رزرو نوبت جدید"
3. **Selects barber** (if multiple barbers)
4. Selects service
5. Picks date from Jalali calendar
6. Chooses available time slot
7. Enters name and phone
8. Confirms booking
9. Barber receives notification with Confirm/Reject buttons
10. Customer receives confirmation
11. Gets automatic reminder ~24 hours before

### Barber Flow | جریان آرایشگر

**Via Telegram:**
- Receive booking requests → Confirm/Reject
- `/today` - View today's schedule
- `/week` - View weekly schedule
- `/panel` - Get web panel link

**Via Web Panel:**
- View week calendar with all appointments
- Manage services (add, edit, disable)
- Configure working hours
- Block time slots for breaks/vacation
- View customer list
- Create manual bookings

### Admin Flow | جریان ادمین

1. Send `/panel` to bot
2. Open magic link → lands at `/admin`
3. View dashboard with stats
4. Manage barbers (add/disable)
5. View all appointments across barbers
6. View all customers
7. Configure salon settings

---

## 🔐 Authentication

### Web Panel Access

Both barbers and admins access web panels via **magic links**:

1. User sends `/panel` (or taps "🔐 ورود به پنل مدیریت") to bot
2. Bot generates a one-time magic link (expires in 10 minutes)
3. User clicks link → logged in automatically
4. Session stored in httpOnly cookie (7 days)

**Security:**
- Links are single-use and expire quickly
- Sessions use SHA-256 hashed tokens
- Role-based access control in middleware
- No password storage or management needed

---

## 🧪 Testing

Run tests:
```bash
npm test
```

Tests cover:
- ✅ Per-barber slot overlap detection
- ✅ Working hours validation per barber
- ✅ Closed days (Friday)
- ✅ Duration fitting
- ✅ Multi-barber slot independence
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
   - Add environment variables
   - Deploy

3. **Configure webhook:**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project.vercel.app/api/webhooks/telegram",
    "secret_token": "your_random_secret_here"
  }'
```

### Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456:ABCDEF...` |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Random secret for webhook | `random_secret` |
| `ADMIN_TELEGRAM_IDS` | Super admin Telegram IDs | `123456789` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `APP_URL` | Web application URL | `https://your-domain.com` |
| `SALON_NAME` | Salon name (optional) | `سالن زیبایی` |

**Important:** After deployment, run migrations and seed:
```bash
npm run db:migrate
npm run db:seed
```

### Automatic Reminders

**Vercel Hobby Plan (Current):**
- Cron: Daily at `30 4 * * *` (04:30 UTC = 08:00 Asia/Tehran)
- Sends 24-hour reminders for appointments 20-28 hours away

**Vercel Pro Plan (Recommended):**
- Cron: Every 30 minutes `*/30 * * * *`
- Reliable 24-hour and 2-hour reminders

---

## 🛠️ Development

### Database Migrations

Apply schema:
```bash
npm run db:migrate
```

Migrate existing data (when upgrading from single-barber):
```bash
npm run db:migrate:data
```

Seed default data:
```bash
npm run db:seed
```

### Bot Development

The bot uses RAW Telegram Bot API (fetch to sendMessage) - **no Chat SDK** for inbound webhooks. Multi-barber booking flow:

1. **barber** - Select barber (if multiple active)
2. **service** - Select service for that barber
3. **date** - Pick date (barber's open days)
4. **time** - Choose time (barber's available slots)
5. **contact** - Enter name/phone
6. **confirm** - Review and confirm

State stored in PostgreSQL with 1-hour TTL.

### Adding Features

To add a new barber:
```sql
-- Create user
INSERT INTO users (telegram_id, role, name, is_active)
VALUES (999888777, 'barber', 'New Barber', true);

-- Create barber
INSERT INTO barbers (user_id, display_name, is_active)
SELECT id, 'New Barber', true FROM users WHERE telegram_id = 999888777;

-- Add services and working hours...
```

---

## 🔐 Security Notes

- **No secrets in code** - All tokens in `.env` (gitignored)
- **Webhook verification** - Secret token validation
- **Magic link auth** - Single-use, expiring tokens
- **Role-based access** - Middleware enforces permissions
- **httpOnly cookies** - Session tokens not accessible to JS
- **Database security** - Prepared statements via Neon SDK

---

## 📖 API Documentation

### Telegram Bot Commands

**Everyone:**
- `/start`, `/menu` - Show main menu
- `/panel` - Get web panel link (barbers and admins only)

**Barbers:**
- `/today` - Today's appointments (for that barber)
- `/week` - This week's appointments (for that barber)

**Super Admin:**
- `/today` - All appointments today (all barbers)
- `/week` - All appointments this week (all barbers)

### Web Routes

**Public:**
- `/login?token=...` - Magic link login

**Barber (role: barber or super_admin):**
- `/barber` - Dashboard
- `/barber/calendar` - Week calendar
- `/barber/services` - Manage services
- `/barber/hours` - Working hours
- `/barber/customers` - Customer list

**Admin (role: super_admin only):**
- `/admin` - Dashboard
- `/admin/barbers` - Manage barbers
- `/admin/appointments` - All appointments
- `/admin/customers` - All customers
- `/admin/settings` - Salon settings

---

## 🐛 Troubleshooting

### Bot not responding
1. Check bot token in `.env`
2. Verify webhook is set correctly
3. Check Vercel function logs

### Web panel not loading
1. Verify `APP_URL` is set correctly
2. Check magic link hasn't expired (10 min)
3. Ensure user role is barber or super_admin

### Reminders not sending
1. Verify cron job enabled in Vercel
2. Check `sent_reminders` table
3. Review `/api/cron/reminders` logs

### Double-booking
1. Should not happen with per-barber slots
2. Check `isSlotAvailable` uses correct barber_id
3. Verify database constraints

### Role issues
1. Check users table: `SELECT * FROM users WHERE telegram_id = YOUR_ID;`
2. Verify barbers table for barber users
3. Check middleware logs

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [jalaali-js](https://github.com/jalaali/jalaali-js) - Persian calendar
- [Telegram Bot API](https://core.telegram.org/bots/api) - Bot platform

---

## 📞 Support | پشتیبانی

For issues or questions:
- Open an issue on GitHub
- Contact through the bot: [@BarberAppointmentAppBot](https://t.me/BarberAppointmentAppBot)

---

**Made with ❤️ for Iranian hairdressers and their customers**

**ساخته شده با ❤️ برای آرایشگران ایرانی و مشتریان آن‌ها**
