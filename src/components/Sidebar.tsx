'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, Calendar, Scissors, Clock, UserPlus, Users, Settings } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  userName: string;
  userRole: 'barber' | 'super_admin';
  barberName?: string;
}

const barberLinks: NavLink[] = [
  { href: '/barber', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/barber/calendar', label: 'تقویم', icon: Calendar },
  { href: '/barber/services', label: 'خدمات', icon: Scissors },
  { href: '/barber/hours', label: 'ساعات کاری', icon: Clock },
  { href: '/barber/book', label: 'نوبت دستی', icon: UserPlus },
  { href: '/barber/customers', label: 'مشتریان', icon: Users },
];

const adminLinks: NavLink[] = [
  { href: '/admin', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/admin/barbers', label: 'آرایشگرها', icon: Users },
  { href: '/admin/appointments', label: 'نوبت‌ها', icon: Calendar },
  { href: '/admin/customers', label: 'مشتریان', icon: Users },
  { href: '/admin/settings', label: 'تنظیمات', icon: Settings },
];

export function Sidebar({ userName, userRole, barberName }: SidebarProps) {
  const pathname = usePathname();
  const links = userRole === 'barber' ? barberLinks : adminLinks;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-l border-border bg-card">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">نوبت‌آرا</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userRole === 'barber' ? barberName : 'پنل مدیریت'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{userName}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {userRole === 'super_admin' && (
          <Link
            href="/barber"
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Scissors className="w-5 h-5" />
            پنل آرایشگر
          </Link>
        )}
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            خروج
          </button>
        </form>
      </div>
    </aside>
  );
}
