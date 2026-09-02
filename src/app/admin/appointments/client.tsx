'use client';

import { Table, Paper, Select, Button, Group, Badge } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toJalaali } from 'jalaali-js';

interface Appointment {
  id: number;
  appointment_time: string;
  barber_name: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  status: string;
}

interface Barber {
  id: number;
  display_name: string;
}

interface AppointmentsClientProps {
  appointments: Appointment[];
  barbers: Barber[];
  filters: { barber?: string; status?: string; from?: string };
}

export default function AppointmentsClient({ appointments, barbers, filters }: AppointmentsClientProps) {
  const router = useRouter();
  const [barber, setBarber] = useState(filters.barber || '');
  const [status, setStatus] = useState(filters.status || '');
  const [from, setFrom] = useState(filters.from || '');

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (barber) params.set('barber', barber);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    router.push(`/admin/appointments?${params.toString()}`);
  };

  const formatJalaliDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const time = date.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
    return `${jDate.jy}/${jDate.jm.toString().padStart(2, '0')}/${jDate.jd.toString().padStart(2, '0')} ${time}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'pending': return 'orange';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'تأیید شده';
      case 'pending': return 'در انتظار';
      case 'cancelled': return 'لغو شده';
      default: return status;
    }
  };

  return (
    <>
      <Paper p="md" withBorder mb="lg">
        <Group grow>
          <Select
            label="آرایشگر"
            placeholder="همه"
            data={[
              { value: '', label: 'همه' },
              ...barbers.map(b => ({ value: b.id.toString(), label: b.display_name }))
            ]}
            value={barber}
            onChange={(val) => setBarber(val || '')}
          />
          <Select
            label="وضعیت"
            placeholder="همه"
            data={[
              { value: '', label: 'همه' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'confirmed', label: 'تأیید شده' },
              { value: 'cancelled', label: 'لغو شده' },
            ]}
            value={status}
            onChange={(val) => setStatus(val || '')}
          />
          <Select
            label="زمان"
            placeholder="همه"
            data={[
              { value: '', label: 'همه' },
              { value: 'today', label: 'امروز' },
              { value: 'upcoming', label: 'آینده' },
              { value: 'past', label: 'گذشته' },
            ]}
            value={from}
            onChange={(val) => setFrom(val || '')}
          />
          <div className="flex items-end">
            <Button onClick={handleFilter} fullWidth>
              اعمال فیلتر
            </Button>
          </div>
        </Group>
      </Paper>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>زمان</Table.Th>
              <Table.Th>آرایشگر</Table.Th>
              <Table.Th>خدمت</Table.Th>
              <Table.Th>مشتری</Table.Th>
              <Table.Th>تلفن</Table.Th>
              <Table.Th>وضعیت</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {appointments.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} className="text-center py-12">
                  <IconCalendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">نوبتی یافت نشد</p>
                </Table.Td>
              </Table.Tr>
            ) : (
              appointments.map((appt) => (
                <Table.Tr key={appt.id}>
                  <Table.Td>{formatJalaliDateTime(appt.appointment_time)}</Table.Td>
                  <Table.Td>{appt.barber_name}</Table.Td>
                  <Table.Td>{appt.service_name}</Table.Td>
                  <Table.Td>{appt.customer_name}</Table.Td>
                  <Table.Td>{appt.customer_phone}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(appt.status)}>
                      {getStatusLabel(appt.status)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  );
}
