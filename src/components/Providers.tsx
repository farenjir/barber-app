'use client';

import { MantineProvider, DirectionProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/schedule/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import 'dayjs/locale/fa';

const theme = createTheme({
  primaryColor: 'orange',
  defaultRadius: 'md',
  colors: {
    // Warm gold/amber theme for نوبت‌آرا
    orange: [
      '#fff4e6',
      '#ffe8cc',
      '#ffd8a8',
      '#ffc078',
      '#ffa94d',
      '#ff922b',
      '#fd7e14',
      '#f76707',
      '#e8590c',
      '#d9480f',
    ],
  },
  fontFamily: 'inherit',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <DatesProvider settings={{ locale: 'fa', firstDayOfWeek: 6 }}>
          <ModalsProvider>
            <Notifications position="top-center" />
            {children}
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </DirectionProvider>
  );
}
