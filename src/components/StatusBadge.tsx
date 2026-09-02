import { Badge } from '@/components/ui/badge';

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'default' }> = {
  pending: { label: 'در انتظار', variant: 'warning' },
  confirmed: { label: 'تأیید شده', variant: 'success' },
  cancelled: { label: 'لغو شده', variant: 'destructive' },
  completed: { label: 'انجام شده', variant: 'default' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
