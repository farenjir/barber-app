'use client';

import { Table, Paper, Text, Badge } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { toJalaali } from 'jalaali-js';

interface Customer {
  customer_name: string;
  customer_phone: string;
  last_appointment: string;
  total_appointments: number;
}

interface CustomersClientProps {
  customers: Customer[] | null;
}

export default function CustomersClient({ customers }: CustomersClientProps) {
  if (customers === null || customers.length === 0) {
    return (
      <Paper p="xl" withBorder className="text-center">
        <IconUsers size={48} className="mx-auto mb-4 opacity-50" />
        <Text c="dimmed">مشتری‌ای یافت نشد</Text>
      </Paper>
    );
  }

  const formatJalaliDate = (dateString: string) => {
    const date = new Date(dateString);
    const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jDate.jy}/${jDate.jm.toString().padStart(2, '0')}/${jDate.jd.toString().padStart(2, '0')}`;
  };

  return (
    <Paper withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>نام مشتری</Table.Th>
            <Table.Th>شماره تلفن</Table.Th>
            <Table.Th>تعداد نوبت‌ها</Table.Th>
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
              <Table.Td>
                <Badge variant="light">{customer.total_appointments}</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatJalaliDate(customer.last_appointment)}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
