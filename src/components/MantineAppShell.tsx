'use client';

import { ReactNode } from 'react';
import { AppShell as MantineAppShell, Burger, Group, Title, NavLink, Text, ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import { 
  IconLogout, IconLayoutDashboard, IconCalendar, IconScissors, 
  IconClock, IconUserPlus, IconUsers, IconSettings, IconAlertTriangle,
  IconSun, IconMoon
} from '@tabler/icons-react';
import Link from 'next/link';

interface AppShellProps {
  children: ReactNode;
  userName: string;
  userRole: 'barber' | 'super_admin';
  barberName?: string;
  pageTitle: string;
  isSuperAdmin?: boolean;
}

const barberLinks = [
  { href: '/barber', label: 'داشبورد', icon: IconLayoutDashboard },
  { href: '/barber/calendar', label: 'تقویم', icon: IconCalendar },
  { href: '/barber/services', label: 'خدمات', icon: IconScissors },
  { href: '/barber/hours', label: 'ساعات کاری', icon: IconClock },
  { href: '/barber/book', label: 'نوبت دستی', icon: IconUserPlus },
  { href: '/barber/customers', label: 'مشتریان', icon: IconUsers },
];

const adminLinks = [
  { href: '/admin', label: 'داشبورد', icon: IconLayoutDashboard },
  { href: '/admin/barbers', label: 'آرایشگرها', icon: IconUsers },
  { href: '/admin/appointments', label: 'نوبت‌ها', icon: IconCalendar },
  { href: '/admin/customers', label: 'مشتریان', icon: IconUsers },
  { href: '/admin/errors', label: 'خطاها', icon: IconAlertTriangle },
  { href: '/admin/settings', label: 'تنظیمات', icon: IconSettings },
];

export function AppShell({ children, userName, userRole, barberName, pageTitle, isSuperAdmin }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const links = userRole === 'barber' ? barberLinks : adminLinks;
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      navbar-position="right"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={2}>{pageTitle}</Title>
          <Group gap="xs">
            <ActionIcon
              onClick={toggleColorScheme}
              variant="subtle"
              size="lg"
              aria-label="تغییر تم"
            >
              {computedColorScheme === 'dark' ? (
                <IconSun size={20} stroke={1.5} />
              ) : (
                <IconMoon size={20} stroke={1.5} />
              )}
            </ActionIcon>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <MantineAppShell.Section>
          <Title order={3} mb="xs">نوبت‌آرا</Title>
          <Text size="sm" c="dimmed">
            {userRole === 'barber' ? barberName : 'پنل مدیریت'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>{userName}</Text>
        </MantineAppShell.Section>

        <MantineAppShell.Section grow mt="md">
          {isSuperAdmin && userRole === 'barber' && (
            <NavLink
              component={Link}
              href="/admin"
              label="بازگشت به داشبورد ادمین"
              leftSection={<IconLayoutDashboard size={20} stroke={1.5} />}
              mb="md"
              variant="light"
              color="blue"
            />
          )}
          {links.map((link) => (
            <NavLink
              key={link.href}
              component={Link}
              href={link.href}
              label={link.label}
              leftSection={<link.icon size={20} stroke={1.5} />}
              active={pathname === link.href}
            />
          ))}
        </MantineAppShell.Section>

        <MantineAppShell.Section>
          {userRole === 'super_admin' && (
            <NavLink
              component={Link}
              href="/barber"
              label="پنل آرایشگر"
              leftSection={<IconScissors size={20} stroke={1.5} />}
              mb="xs"
            />
          )}
          <form action="/api/logout" method="POST">
            <NavLink
              component="button"
              type="submit"
              label="خروج"
              leftSection={<IconLogout size={20} stroke={1.5} />}
              style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'right' }}
            />
          </form>
        </MantineAppShell.Section>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
