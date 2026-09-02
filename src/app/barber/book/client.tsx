'use client';

import { useState } from 'react';
import { Button, Select, TextInput, Paper, Stack, Group, Alert } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconCheck } from '@tabler/icons-react';
import { createAppointment } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/fa';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

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
}

export default function BookClient({ barberId, services }: BookClientProps) {
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      serviceId: '',
      datetime: null as Date | null,
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
    try {
      await createAppointment(
        barberId,
        parseInt(values.serviceId),
        values.datetime.toISOString(),
        values.name,
        values.phone
      );
      
      setSuccess(true);
      form.reset();
      notifications.show({
        title: 'موفق',
        message: 'نوبت با موفقیت ثبت شد',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'مشکلی پیش آمد',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
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

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="خدمت"
            placeholder="انتخاب کنید"
            data={serviceOptions}
            required
            {...form.getInputProps('serviceId')}
          />

          <DateTimePicker
            label="تاریخ و زمان نوبت"
            placeholder="انتخاب کنید"
            minDate={new Date()}
            locale="fa"
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
