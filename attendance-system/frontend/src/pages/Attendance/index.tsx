import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, DatePicker, Space, Tag, message } from 'antd';
import { LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { attendanceService } from '../../services/api';
import { useAppStore } from '../../store/appStore';

const { RangePicker } = DatePicker;

export default function AttendancePage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendanceRecords', dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: () => attendanceService.records(dateRange?.[0]?.format('YYYY-MM-DD'))
  });

  const clockInMutation = useMutation({
    mutationFn: () => attendanceService.clockIn(currentUser?.id || 1),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const clockOutMutation = useMutation({
    mutationFn: () => attendanceService.clockOut(currentUser?.id || 1),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const columns = [
    { title: t('attendance.date'), dataIndex: 'date' },
    { title: t('attendance.clockInRecord'), dataIndex: 'clockInTime', render: (time: string) => time || '-' },
    { title: t('attendance.clockOutRecord'), dataIndex: 'clockOutTime', render: (time: string) => time || '-' },
    {
      title: t('attendance.status'),
      render: (_: any, record: any) => (
        <Space>
          {record.clockInStatus === 'late' && <Tag color="red">{t('attendance.late')}</Tag>}
          {record.clockOutStatus === 'leaveEarly' && <Tag color="orange">{t('attendance.leaveEarly')}</Tag>}
          {record.clockInStatus === 'normal' && record.clockOutStatus === 'normal' && <Tag color="green">{t('attendance.normal')}</Tag>}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('attendance.title')}</h1>
      <Space style={{ marginBottom: 24 }}>
        <Button type="primary" icon={<LoginOutlined />} onClick={() => clockInMutation.mutate()} loading={clockInMutation.isPending}>
          {t('attendance.clockIn')}
        </Button>
        <Button icon={<LogoutOutlined />} onClick={() => clockOutMutation.mutate()} loading={clockOutMutation.isPending}>
          {t('attendance.clockOut')}
        </Button>
      </Space>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])} />
      </Space>
      <Table columns={columns} dataSource={records} rowKey="id" loading={isLoading} />
    </div>
  );
}