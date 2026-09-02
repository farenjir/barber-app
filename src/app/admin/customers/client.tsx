'use client';

import { Table, Paper, Text, Stack } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { toJalaali } from 'jalaali-js';

interface Customer {
  customer_name: string;
  customer_phone: string;
  total_appointments: number;
  confirmed_count: number;
  last_appointment: string;
}

interface CustomersClientProps {
  customers: Customer[];
}

export default function CustomersClient({ customers }: CustomersClientProps) {
  const formatJalaliDate = (dateString: string) => {
    const date = new Date(dateString);
    const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jDate.jy}/${jDate.jm.toString().padStart(2, '0')}/${jDate.jd.toString().padStart(2, '0')}`;
  };

  if (customers.length === 0) {
    return (
      <Paper p="xl" withBorder>
        <Stack align="center" gap="md">
          <IconUsers size={48} opacity={0.5} />
          <Text c="dimmed">مشتری‌ای یافت نشد</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>نام</Table.Th>
            <Table.Th>تلفن</Table.Th>
            <Table.Th>تعداد نوبت‌ها</Table.Th>
            <Table.Th>تأیید شده</Table.Th>
            <Table.Th>آخرین نوبت</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {customers.map((customer, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>
                <Text fw={600}>{customer.customer_name}</Text>
              </Table.Td>
              <Table.Td>
                <Text c="dimmed">{customer.customer_phone}</Text>
              </Table.Td>
              <Table.Td>{customer.total_appointments}</Table.Td>
              <Table.Td>{customer.confirmed_count}</Table.Td>
              <Table.Td>{formatJalaliDate(customer.last_appointment)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
