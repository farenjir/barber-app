export const metadata = {
  title: 'Barber Appointment Bot',
  description: 'Telegram booking bot for hairdresser appointments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
