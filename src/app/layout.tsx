import './globals.css';
import { Vazirmatn } from 'next/font/google';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Providers } from '@/components/Providers';

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  display: 'swap',
});

export const metadata = {
  title: 'نوبت‌آرا',
  description: 'سامانه نوبت‌دهی آرایشگاه',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={vazirmatn.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
