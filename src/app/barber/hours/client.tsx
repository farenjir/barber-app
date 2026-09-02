'use client';

import { useState } from 'react';
import { Button, Switch, Paper, Stack, Group, Text, Alert } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconClock, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { updateWorkingHours } from './actions';

interface Weekday {
  value: number;
  label: string;
}

interface HoursClientProps {
  barberId: number;
  weekdays: Weekday[];
  hoursMap: Map<number, any>;
}

export default function HoursClient({ barberId, weekdays, hoursMap }: HoursClientProps) {
  const [hours, setHours] = useState<Map<number, any>>(hoursMap);
  const [saving, setSaving] = useState(false);

  const handleToggle = (dayValue: number) => {
    const current = hours.get(dayValue) || { weekday: dayValue, is_open: true, start_time: '10:00', end_time: '21:00' };
    const updated = new Map(hours);
    updated.set(dayValue, { ...current, is_open: !current.is_open });
    setHours(updated);
  };

  const handleTimeChange = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    const current = hours.get(dayValue) || { weekday: dayValue, is_open: true, start_time: '10:00', end_time: '21:00' };
    const updated = new Map(hours);
    updated.set(dayValue, { ...current, [field]: value });
    setHours(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hoursArray = weekdays.map(day => {
        const h = hours.get(day.value) || { is_open: true, start_time: '10:00', end_time: '21:00' };
        return {
          weekday: day.value,
          is_open: h.is_open ?? true,
          start_time: h.start_time || '10:00',
          end_time: h.end_time || '21:00',
        };
      });
      
      await updateWorkingHours(barberId, hoursArray);
      
      notifications.show({
        title: 'موفق',
        message: 'ساعات کاری با موفقیت ذخیره شد',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'مشکلی پیش آمد',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack>
      <Alert icon={<IconInfoCircle size={16} />} title="توجه" color="blue">
        این پلتفرم برای آرایشگران مستقل است. هر آرایشگر روز تعطیل و ساعات کاری خودش را مشخص می‌کند.
      </Alert>

      {weekdays.map((day) => {
        const dayHours = hours.get(day.value) || { is_open: true, start_time: '10:00', end_time: '21:00' };
        const isOpen = dayHours.is_open ?? true;
        const startTime = dayHours.start_time || '10:00';
        const endTime = dayHours.end_time || '21:00';

        return (
          <Paper key={day.value} p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="lg" fw={600}>{day.label}</Text>
                <Switch
                  checked={isOpen}
                  onChange={() => handleToggle(day.value)}
                  label={isOpen ? 'باز' : 'بسته'}
                />
              </Group>
              
              {isOpen && (
                <Group grow>
                  <TimeInput
                    label="ساعت شروع"
                    value={startTime}
                    onChange={(e) => handleTimeChange(day.value, 'start_time', e.currentTarget.value)}
                  />
                  <TimeInput
                    label="ساعت پایان"
                    value={endTime}
                    onChange={(e) => handleTimeChange(day.value, 'end_time', e.currentTarget.value)}
                  />
                </Group>
              )}
            </Stack>
          </Paper>
        );
      })}

      <Button
        size="lg"
        leftSection={<IconClock size={20} />}
        onClick={handleSave}
        loading={saving}
      >
        ذخیره ساعات کاری
      </Button>
    </Stack>
  );
}
