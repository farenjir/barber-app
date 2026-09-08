'use client';

import { useState } from 'react';
import { Container, Paper, Title, Text, Stack, Button, Group, TextInput, Select, Alert } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createBooking } from './actions';

interface BookingClientProps {
  barber: any;
  services: any[];
}

type BookingStep = 'service' | 'date' | 'time' | 'info' | 'confirm' | 'success';

export default function BookingClient({ barber, services }: BookingClientProps) {
  const [step, setStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceSelect = async (service: any) => {
    setSelectedService(service);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/booking/dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: barber.id,
          duration: service.duration_minutes 
        }),
      });
      
      if (!response.ok) {
        throw new Error('خطا در دریافت تاریخ‌های موجود');
      }
      
      const data = await response.json();
      setAvailableDates(data.dates);
      setStep('date');
    } catch (err) {
      setError('خطا در دریافت تاریخ‌های موجود. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/booking/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barberId: barber.id,
          date: dateStr,
          duration: selectedService.duration_minutes 
        }),
      });
      
      if (!response.ok) {
        throw new Error('خطا در دریافت ساعت‌های موجود');
      }
      
      const data = await response.json();
      
      if (data.slots.length === 0) {
        setError('متأسفانه در این تاریخ زمان خالی موجود نیست. لطفاً تاریخ دیگری انتخاب کنید.');
        setStep('date');
        return;
      }
      
      setAvailableSlots(data.slots);
      setStep('time');
    } catch (err) {
      setError('خطا در دریافت ساعت‌های موجود. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (timeStr: string) => {
    setSelectedTime(timeStr);
    setStep('info');
  };

  const handleInfoSubmit = () => {
    if (!customerName.trim()) {
      setError('لطفاً نام خود را وارد کنید.');
      return;
    }
    
    const phoneRegex = /^09\d{9}$/;
    const cleanPhone = customerPhone.replace(/[\s-]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      setError('شماره تماس نامعتبر است. لطفاً یک شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }
    
    setCustomerPhone(cleanPhone);
    setError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createBooking({
        barberId: barber.id,
        serviceId: selectedService.id,
        appointmentTime: selectedTime!,
        duration: selectedService.duration_minutes,
        customerName: customerName.trim(),
        customerPhone: customerPhone,
      });
      
      if (!result.success) {
        if (result.error === 'SLOT_UNAVAILABLE') {
          setError('متأسفانه این زمان دیگر در دسترس نیست. لطفاً ساعت دیگری انتخاب کنید.');
          setStep('time');
          await handleDateSelect(selectedDate!);
        } else {
          setError(result.error || 'خطا در ثبت نوبت. لطفاً دوباره تلاش کنید.');
        }
        return;
      }
      
      setStep('success');
    } catch (err) {
      setError('خطا در ثبت نوبت. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const formatJalaliDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tehran',
    });
  };

  if (step === 'success') {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" withBorder>
          <Stack align="center" gap="lg">
            <IconCheck size={64} color="green" />
            <Title order={2} ta="center">نوبت شما با موفقیت ثبت شد!</Title>
            <Text ta="center" c="dimmed">
              درخواست شما ثبت شد و به زودی توسط آرایشگر بررسی می‌شود.
              در صورت تأیید، از طریق تلگرام یا تماس با شما اطلاع‌رسانی خواهد شد.
            </Text>
            <Button component="a" href="/" mt="md">
              بازگشت
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" withBorder>
        <Stack gap="lg">
          <div>
            <Title order={2}>رزرو نوبت</Title>
            <Text size="lg" fw={600} mt="xs">{barber.display_name}</Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {step === 'service' && (
            <Stack gap="md">
              <Text size="sm" fw={500}>انتخاب خدمت:</Text>
              {services.map((service) => (
                <Button
                  key={service.id}
                  variant="light"
                  size="lg"
                  onClick={() => handleServiceSelect(service)}
                  disabled={loading}
                  styles={{
                    root: { height: 'auto', padding: '1rem' },
                    label: { whiteSpace: 'normal' },
                  }}
                >
                  <div style={{ width: '100%', textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{service.name}</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.8 }}>
                      {service.duration_minutes} دقیقه • {service.price_toman.toLocaleString('fa-IR')} تومان
                    </div>
                  </div>
                </Button>
              ))}
            </Stack>
          )}

          {step === 'date' && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>انتخاب تاریخ:</Text>
                <Button variant="subtle" size="xs" onClick={() => setStep('service')}>
                  بازگشت
                </Button>
              </Group>
              {availableDates.slice(0, 10).map((dateStr) => (
                <Button
                  key={dateStr}
                  variant="light"
                  size="lg"
                  onClick={() => handleDateSelect(dateStr)}
                  disabled={loading}
                >
                  {formatJalaliDate(dateStr)}
                </Button>
              ))}
            </Stack>
          )}

          {step === 'time' && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>انتخاب ساعت برای {selectedDate && formatJalaliDate(selectedDate)}:</Text>
                <Button variant="subtle" size="xs" onClick={() => setStep('date')}>
                  بازگشت
                </Button>
              </Group>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                {availableSlots.map((slotStr) => (
                  <Button
                    key={slotStr}
                    variant="light"
                    onClick={() => handleTimeSelect(slotStr)}
                    disabled={loading}
                  >
                    {formatTime(slotStr)}
                  </Button>
                ))}
              </div>
            </Stack>
          )}

          {step === 'info' && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>اطلاعات تماس:</Text>
                <Button variant="subtle" size="xs" onClick={() => setStep('time')}>
                  بازگشت
                </Button>
              </Group>
              <TextInput
                label="نام"
                placeholder="نام خود را وارد کنید"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <TextInput
                label="شماره تماس"
                placeholder="09123456789"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
              <Button onClick={handleInfoSubmit} disabled={loading}>
                ادامه
              </Button>
            </Stack>
          )}

          {step === 'confirm' && (
            <Stack gap="md">
              <Text size="sm" fw={500}>خلاصه رزرو:</Text>
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text c="dimmed">خدمت:</Text>
                    <Text fw={600}>{selectedService?.name}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed">تاریخ:</Text>
                    <Text fw={600}>{selectedDate && formatJalaliDate(selectedDate)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed">ساعت:</Text>
                    <Text fw={600}>{selectedTime && formatTime(selectedTime)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed">قیمت:</Text>
                    <Text fw={600}>{selectedService?.price_toman.toLocaleString('fa-IR')} تومان</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed">نام:</Text>
                    <Text fw={600}>{customerName}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed">تلفن:</Text>
                    <Text fw={600}>{customerPhone}</Text>
                  </Group>
                </Stack>
              </Paper>
              <Group>
                <Button onClick={handleConfirm} loading={loading} disabled={loading}>
                  تأیید و ثبت نوبت
                </Button>
                <Button variant="outline" onClick={() => setStep('info')} disabled={loading}>
                  بازگشت
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
