import './globals.css';
import { Vazirmatn } from 'next/font/google';

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
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.className}>{children}</body>
    </html>
  );
}
