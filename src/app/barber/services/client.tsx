'use client';

import { useState } from 'react';
import { Button, Modal, TextInput, NumberInput, Table, Badge, Group, Stack, ActionIcon, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit } from '@tabler/icons-react';
import { createService, updateService, toggleService } from './actions';

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_toman: number;
  is_active: boolean;
}

interface ServicesClientProps {
  barberId: number;
  initialServices: Service[];
}

export default function ServicesClient({ barberId, initialServices }: ServicesClientProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [opened, setOpened] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      duration_minutes: 30,
      price_toman: 0,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'نام خدمت باید حداقل 2 کاراکتر باشد' : null),
      duration_minutes: (value) => (value < 1 ? 'مدت زمان باید حداقل 1 دقیقه باشد' : null),
      price_toman: (value) => (value < 0 ? 'قیمت نمی‌تواند منفی باشد' : null),
    },
  });

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      form.setValues({
        name: service.name,
        duration_minutes: service.duration_minutes,
        price_toman: service.price_toman,
      });
    } else {
      setEditingService(null);
      form.reset();
    }
    setOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingService) {
        await updateService(editingService.id, barberId, values.name, values.duration_minutes, values.price_toman);
        setServices(services.map(s => 
          s.id === editingService.id 
            ? { ...s, ...values }
            : s
        ));
        notifications.show({
          title: 'موفق',
          message: 'خدمت با موفقیت ویرایش شد',
          color: 'green',
        });
      } else {
        const result = await createService(barberId, values.name, values.duration_minutes, values.price_toman);
        setServices([...services, { id: result.id, ...values, is_active: true }]);
        notifications.show({
          title: 'موفق',
          message: 'خدمت با موفقیت اضافه شد',
          color: 'green',
        });
      }
      setOpened(false);
      form.reset();
    } catch (error: any) {
      const errorMessage = error?.message || 'خطا در انجام عملیات. لطفاً دوباره تلاش کنید.';
      notifications.show({
        title: 'خطا',
        message: errorMessage,
        color: 'red',
      });
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await toggleService(service.id, barberId, service.is_active);
      setServices(services.map(s => 
        s.id === service.id 
          ? { ...s, is_active: !s.is_active }
          : s
      ));
      notifications.show({
        title: 'موفق',
        message: `خدمت ${!service.is_active ? 'فعال' : 'غیرفعال موقت'} شد`,
        color: 'blue',
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'خطا در تغییر وضعیت خدمت. لطفاً دوباره تلاش کنید.';
      notifications.show({
        title: 'خطا',
        message: errorMessage,
        color: 'red',
      });
    }
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <h2 className="text-xl font-bold">لیست خدمات</h2>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenModal()}
        >
          افزودن خدمت جدید
        </Button>
      </Group>

      {services.length === 0 ? (
        <p className="text-center py-8 text-gray-600">هنوز خدمتی اضافه نکرده‌اید</p>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>نام خدمت</Table.Th>
              <Table.Th>مدت زمان</Table.Th>
              <Table.Th>قیمت</Table.Th>
              <Table.Th>وضعیت</Table.Th>
              <Table.Th>عملیات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {services.map((service) => (
              <Table.Tr key={service.id} style={{ opacity: service.is_active ? 1 : 0.6 }}>
                <Table.Td>
                  <Group gap="xs">
                    {service.name}
                    {!service.is_active && (
                      <Badge color="gray" size="sm">غیرفعال</Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{service.duration_minutes} دقیقه</Table.Td>
                <Table.Td>{service.price_toman.toLocaleString('fa-IR')} تومان</Table.Td>
                <Table.Td>
                  <Switch
                    checked={service.is_active}
                    onChange={() => handleToggle(service)}
                    label={service.is_active ? 'فعال' : 'غیرفعال موقت'}
                    color="green"
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => handleOpenModal(service)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingService ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="نام خدمت"
              placeholder="مثال: اصلاح مو"
              required
              {...form.getInputProps('name')}
            />
            <NumberInput
              label="مدت زمان (دقیقه)"
              placeholder="45"
              min={1}
              required
              {...form.getInputProps('duration_minutes')}
            />
            <NumberInput
              label="قیمت (تومان)"
              placeholder="350000"
              min={0}
              required
              thousandSeparator=","
              {...form.getInputProps('price_toman')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setOpened(false)}>
                انصراف
              </Button>
              <Button type="submit">
                {editingService ? 'ذخیره تغییرات' : 'افزودن خدمت'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
