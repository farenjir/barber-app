'use client';

import { useState } from 'react';
import { Button, Modal, TextInput, Table, Badge, Group, Stack, ActionIcon, Paper, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { addBarber, toggleBarber } from './actions';

interface Barber {
  id: number;
  display_name: string;
  user_name: string;
  telegram_id: number;
  is_active: boolean;
  user_active: boolean;
}

interface BarbersClientProps {
  initialBarbers: Barber[];
}

export default function BarbersClient({ initialBarbers }: BarbersClientProps) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);
  const [opened, setOpened] = useState(false);

  const form = useForm({
    initialValues: {
      telegram_id: '',
      display_name: '',
    },
    validate: {
      telegram_id: (value) => (!value || isNaN(Number(value)) ? 'آیدی تلگرام باید عدد باشد' : null),
      display_name: (value) => (value.length < 2 ? 'نام باید حداقل 2 کاراکتر باشد' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await addBarber(parseInt(values.telegram_id), values.display_name);
      
      // Refresh barbers list (simple approach - you could optimize this)
      window.location.reload();
      
      notifications.show({
        title: 'موفق',
        message: 'آرایشگر با موفقیت اضافه شد',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'مشکلی پیش آمد',
        color: 'red',
      });
    }
  };

  const handleToggle = async (barber: Barber) => {
    try {
      await toggleBarber(barber.id, barber.is_active && barber.user_active);
      setBarbers(barbers.map(b => 
        b.id === barber.id 
          ? { ...b, is_active: !b.is_active, user_active: !b.user_active }
          : b
      ));
      notifications.show({
        title: 'موفق',
        message: `آرایشگر ${!(barber.is_active && barber.user_active) ? 'فعال' : 'غیرفعال'} شد`,
        color: 'blue',
      });
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'مشکلی پیش آمد',
        color: 'red',
      });
    }
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <h2 className="text-xl font-bold">لیست آرایشگران ({barbers.length})</h2>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setOpened(true)}
        >
          افزودن آرایشگر
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>نام نمایشی</Table.Th>
              <Table.Th>کاربر</Table.Th>
              <Table.Th>Telegram ID</Table.Th>
              <Table.Th>وضعیت</Table.Th>
              <Table.Th>عملیات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {barbers.map((barber) => (
              <Table.Tr key={barber.id}>
                <Table.Td>{barber.display_name}</Table.Td>
                <Table.Td>{barber.user_name}</Table.Td>
                <Table.Td>{barber.telegram_id}</Table.Td>
                <Table.Td>
                  <Badge color={barber.is_active && barber.user_active ? 'green' : 'gray'}>
                    {barber.is_active && barber.user_active ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color={barber.is_active && barber.user_active ? 'red' : 'green'}
                    onClick={() => handleToggle(barber)}
                  >
                    {barber.is_active && barber.user_active ? <IconX size={16} /> : <IconCheck size={16} />}
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="افزودن آرایشگر جدید"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Telegram ID"
              placeholder="123456789"
              description="آیدی عددی تلگرام آرایشگر (با ارسال /start به @userinfobot قابل دریافت است)"
              required
              {...form.getInputProps('telegram_id')}
            />
            <TextInput
              label="نام نمایشی"
              placeholder="نام آرایشگر"
              required
              {...form.getInputProps('display_name')}
            />
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              ساعات کاری پیش‌فرض از آرایشگر دیگری کپی می‌شود.
            </Alert>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setOpened(false)}>
                انصراف
              </Button>
              <Button type="submit">افزودن آرایشگر</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
