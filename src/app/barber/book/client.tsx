'use client';

import { useState } from 'react';
import { Button, Select, TextInput, Paper, Stack, Group, Alert, Code, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconCheck, IconCopy, IconCheck as IconCopyCheck } from '@tabler/icons-react';
import { createAppointment } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/fa';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { toJalaali } from 'jalaali-js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fa');

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_toman: number;
}

interface BookClientProps {
  barberId: number;
  services: Service[];
  userRole: 'barber' | 'super_admin';
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const toPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

export default function BookClient({ barberId, services, userRole }: BookClientProps) {
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; stack?: string } | null>(null);

  const form = useForm({
    initialValues: {
      serviceId: '',
      datetime: null as string | null,
      name: '',
      phone: '',
    },
    validate: {
      serviceId: (value) => (!value ? 'انتخاب خدمت الزامی است' : null),
      datetime: (value) => (!value ? 'انتخاب زمان الزامی است' : null),
      name: (value) => (value.length < 2 ? 'نام باید حداقل 2 کاراکتر باشد' : null),
      phone: (value) => (value.length < 10 ? 'شماره تلفن نامعتبر است' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!values.datetime) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const result = await createAppointment(
        barberId,
        parseInt(values.serviceId),
        values.datetime,
        values.name,
        values.phone
      );
      
      if (!result.ok) {
        setError({ message: result.error, stack: result.stack });
        notifications.show({
          title: 'خطا',
          message: result.error,
          color: 'red',
        });
        return;
      }
      
      setSuccess(true);
      form.reset();
      notifications.show({
        title: 'موفق',
        message: 'نوبت با موفقیت ثبت شد',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'مشکلی پیش آمد';
      setError({ message });
      notifications.show({
        title: 'خطا',
        message,
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatJalaliLabel = (date: Date | null): string => {
    if (!date) return '';
    const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const monthName = PERSIAN_MONTHS[jDate.jm - 1];
    const day = toPersianNumber(jDate.jd);
    const year = toPersianNumber(jDate.jy);
    const hour = toPersianNumber(date.getHours());
    const minute = toPersianNumber(date.getMinutes());
    return `${day} ${monthName} ${year} - ${hour.padStart(2, '۰')}:${minute.padStart(2, '۰')}`;
  };

  const serviceOptions = services.map(s => ({
    value: s.id.toString(),
    label: `${s.name} (${s.duration_minutes} دقیقه - ${s.price_toman.toLocaleString('fa-IR')} تومان)`,
  }));

  return (
    <Paper p="lg" withBorder maw={600} mx="auto">
      {success && (
        <Alert icon={<IconCheck size={16} />} title="موفقیت" color="green" mb="md">
          نوبت با موفقیت ثبت شد
        </Alert>
      )}

      {error && (
        <Alert title="خطا" color="red" mb="md">
          <div>{error.message}</div>
          {error.stack && userRole === 'super_admin' && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <small>Stack trace:</small>
                <CopyButton value={error.stack}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'کپی شد' : 'کپی'}>
                      <ActionIcon size="sm" color={copied ? 'teal' : 'gray'} onClick={copy}>
                        {copied ? <IconCopyCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </div>
              <Code block style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
                {error.stack}
              </Code>
            </div>
          )}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="خدمت"
            placeholder="انتخاب کنید"
            data={serviceOptions}
            required
            clearable
            {...form.getInputProps('serviceId')}
          />

          <DateTimePicker
            label="تاریخ و زمان نوبت"
            placeholder="انتخاب کنید"
            minDate={new Date()}
            locale="fa"
            valueFormat="YYYY-MM-DD HH:mm:ss"
            required
            {...form.getInputProps('datetime')}
          />

          <TextInput
            label="نام مشتری"
            placeholder="نام و نام خانوادگی"
            required
            {...form.getInputProps('name')}
          />

          <TextInput
            label="شماره تلفن"
            placeholder="09123456789"
            required
            {...form.getInputProps('phone')}
          />

          <Group justify="flex-end" mt="md">
            <Button
              type="submit"
              size="lg"
              leftSection={<IconCalendar size={20} />}
              loading={submitting}
            >
              ثبت نوبت
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
