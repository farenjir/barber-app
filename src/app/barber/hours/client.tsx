'use client';

import { useState } from 'react';
import { Button, Switch, Paper, Stack, Group, Text, Alert, SimpleGrid } from '@mantine/core';
import { TimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconClock, IconCheck, IconInfoCircle, IconCopy } from '@tabler/icons-react';
import { updateWorkingHours } from './actions';
import dayjs from 'dayjs';

interface Weekday {
  value: number;
  label: string;
}

interface WorkingHourData {
  weekday: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface HoursClientProps {
  barberId: number;
  weekdays: Weekday[];
  hoursArray: WorkingHourData[];
}

export default function HoursClient({ barberId, weekdays, hoursArray }: HoursClientProps) {
  const initialHours = new Map<number, WorkingHourData>(
    hoursArray.map(h => [h.weekday, h])
  );
  
  weekdays.forEach(day => {
    if (!initialHours.has(day.value)) {
      initialHours.set(day.value, {
        weekday: day.value,
        is_open: true,
        start_time: '10:00',
        end_time: '21:00',
      });
    }
  });

  const [hours, setHours] = useState<Map<number, WorkingHourData>>(initialHours);
  const [saving, setSaving] = useState(false);

  const handleToggle = (dayValue: number) => {
    const current = hours.get(dayValue)!;
    const updated = new Map(hours);
    updated.set(dayValue, { ...current, is_open: !current.is_open });
    setHours(updated);
  };

  const handleTimeChange = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    if (!value) return;
    const current = hours.get(dayValue)!;
    const updated = new Map(hours);
    updated.set(dayValue, { ...current, [field]: value });
    setHours(updated);
  };

  const applyToAllOpen = () => {
    const saturday = hours.get(6);
    if (!saturday) return;
    
    const updated = new Map(hours);
    weekdays.forEach(day => {
      const current = updated.get(day.value)!;
      if (current.is_open) {
        updated.set(day.value, {
          ...current,
          start_time: saturday.start_time,
          end_time: saturday.end_time,
        });
      }
    });
    setHours(updated);
    
    notifications.show({
      message: 'ساعات شنبه روی همه روزهای باز اعمال شد',
      color: 'blue',
      icon: <IconCopy size={16} />,
    });
  };

  const validateHours = (): boolean => {
    for (const [dayValue, dayHours] of hours.entries()) {
      if (!dayHours.is_open) continue;
      
      const start = dayjs(`2000-01-01 ${dayHours.start_time}`);
      const end = dayjs(`2000-01-01 ${dayHours.end_time}`);
      
      if (!start.isValid() || !end.isValid()) {
        const dayLabel = weekdays.find(d => d.value === dayValue)?.label || '';
        notifications.show({
          title: 'خطا',
          message: `زمان ${dayLabel} معتبر نیست`,
          color: 'red',
        });
        return false;
      }
      
      if (end.isBefore(start) || end.isSame(start)) {
        const dayLabel = weekdays.find(d => d.value === dayValue)?.label || '';
        notifications.show({
          title: 'خطا',
          message: `ساعت پایان ${dayLabel} باید بعد از ساعت شروع باشد`,
          color: 'red',
        });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateHours()) return;
    
    setSaving(true);
    try {
      const hoursArray = weekdays.map(day => {
        const h = hours.get(day.value)!;
        return {
          weekday: day.value,
          is_open: h.is_open,
          start_time: h.start_time,
          end_time: h.end_time,
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

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 7 }} spacing="md">
        {weekdays.map((day) => {
          const dayHours = hours.get(day.value)!;
          const isOpen = dayHours.is_open;

          return (
            <Paper 
              key={day.value} 
              p="md" 
              withBorder
              style={{ opacity: isOpen ? 1 : 0.5 }}
            >
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={600}>{day.label}</Text>
                  <Switch
                    size="xs"
                    checked={isOpen}
                    onChange={() => handleToggle(day.value)}
                    label={isOpen ? 'باز' : 'بسته'}
                  />
                </Group>
                
                {isOpen && (
                  <Stack gap="xs">
                    <TimePicker
                      label="ساعت شروع"
                      value={dayHours.start_time}
                      onChange={(value) => handleTimeChange(day.value, 'start_time', value)}
                      size="xs"
                    />
                    <TimePicker
                      label="ساعت پایان"
                      value={dayHours.end_time}
                      onChange={(value) => handleTimeChange(day.value, 'end_time', value)}
                      size="xs"
                    />
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Group>
        <Button
          variant="light"
          leftSection={<IconCopy size={16} />}
          onClick={applyToAllOpen}
          size="sm"
        >
          اعمال ساعات شنبه روی همه روزهای باز
        </Button>
      </Group>

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
