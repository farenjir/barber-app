'use client';

import { useState } from 'react';
import { Paper, Table, ScrollArea, Code, CopyButton, ActionIcon, Tooltip, Badge, Text, Group, Box } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { toJalaali } from 'jalaali-js';

interface ErrorLog {
  id: number;
  created_at: string;
  source: string;
  path: string;
  message: string;
  stack: string | null;
  user_id: number | null;
  user_name: string | null;
}

interface ErrorsClientProps {
  errorLogs: ErrorLog[];
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const toPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

const formatJalaliDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const jDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const monthName = PERSIAN_MONTHS[jDate.jm - 1];
  const day = toPersianNumber(jDate.jd);
  const year = toPersianNumber(jDate.jy);
  const hour = toPersianNumber(date.getHours());
  const minute = toPersianNumber(date.getMinutes());
  return `${day} ${monthName} ${year} - ${hour.padStart(2, '۰')}:${minute.padStart(2, '۰')}`;
};

export default function ErrorsClient({ errorLogs }: ErrorsClientProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (errorLogs.length === 0) {
    return (
      <Paper p="lg" withBorder>
        <Text ta="center" c="dimmed">هیچ خطایی ثبت نشده است</Text>
      </Paper>
    );
  }

  return (
    <Paper p="lg" withBorder>
      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>زمان</Table.Th>
              <Table.Th>منبع</Table.Th>
              <Table.Th>مسیر</Table.Th>
              <Table.Th>کاربر</Table.Th>
              <Table.Th>پیام</Table.Th>
              <Table.Th>عملیات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {errorLogs.map((log) => (
              <>
                <Table.Tr key={log.id} onClick={() => toggleRow(log.id)} style={{ cursor: 'pointer' }}>
                  <Table.Td>
                    <Text size="sm">{formatJalaliDateTime(log.created_at)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">{log.source}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Code>{log.path}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{log.user_name || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>{log.message}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <CopyButton value={log.message}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'کپی شد' : 'کپی پیام'}>
                            <ActionIcon 
                              size="sm" 
                              color={copied ? 'teal' : 'gray'} 
                              onClick={(e) => {
                                e.stopPropagation();
                                copy();
                              }}
                            >
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                      {log.stack && (
                        <CopyButton value={log.stack}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'کپی شد' : 'کپی Stack'}>
                              <ActionIcon 
                                size="sm" 
                                color={copied ? 'teal' : 'blue'} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copy();
                                }}
                              >
                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
                {expandedRow === log.id && log.stack && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Box p="md" bg="gray.0" style={{ borderRadius: 4 }}>
                        <Text size="sm" fw={600} mb="xs">Stack Trace:</Text>
                        <Code block style={{ fontSize: '11px', maxHeight: '300px', overflow: 'auto' }}>
                          {log.stack}
                        </Code>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                )}
              </>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
