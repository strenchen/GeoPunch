import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, DatePicker, Space, Tag, Card, Row, Col, Statistic, message, Modal, Popconfirm } from 'antd';
import { LoginOutlined, LogoutOutlined, EnvironmentOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { attendanceService } from '../../services/api';
import { useAppStore } from '../../store/appStore';

const { RangePicker } = DatePicker;

interface AggregatedRecord {
  date: string;
  dateStr: string;
  weekday: string;
  morningTime: string;
  eveningTime: string;
  morningStatus: string;
  eveningStatus: string;
  morningAddress: string;
  eveningAddress: string;
  rawRecords: any[];
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();

  // 今日考勤状态
  const { data: todayStatus } = useQuery({
    queryKey: ['attendanceToday'],
    queryFn: attendanceService.today,
    refetchInterval: 30000,
  });

  // 打卡记录（原始流水）
  const { data: rawRecords = [], isLoading } = useQuery({
    queryKey: ['attendanceRecords', dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: () => attendanceService.records({
      start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
      end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
  });

  // 按日期聚合
  const aggregatedRecords: AggregatedRecord[] = (() => {
    const byDate: Record<string, any[]> = {};
    for (const r of rawRecords) {
      const dateKey = dayjs(r.checkTime).format('YYYY-MM-DD');
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(r);
    }
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return Object.keys(byDate)
      .sort((a, b) => (a > b ? -1 : 1))
      .map((dateKey) => {
        const items = byDate[dateKey];
        const checkIns = items.filter((r) => r.type === 'CHECK_IN');
        const checkOuts = items.filter((r) => r.type === 'CHECK_OUT');
        // 取最后一条作为当日上班/下班
        const morning = checkIns[checkIns.length - 1];
        const evening = checkOuts[checkOuts.length - 1];
        const d = dayjs(dateKey);
        return {
          date: dateKey,
          dateStr: `${d.month() + 1}月${d.date()}日`,
          weekday: weekdays[d.day()],
          morningTime: morning ? dayjs(morning.checkTime).format('HH:mm') : '',
          eveningTime: evening ? dayjs(evening.checkTime).format('HH:mm') : '',
          morningStatus: morning?.status === 'LATE' ? 'late' : morning ? 'normal' : 'absent',
          eveningStatus: evening?.status === 'EARLY_LEAVE' ? 'early' : evening ? 'normal' : 'absent',
          morningAddress: morning?.address || '',
          eveningAddress: evening?.address || '',
          rawRecords: items,
        };
      });
  })();

  // 请假余额
  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance', currentUser?.id],
    queryFn: () => attendanceService.leaveBalance(currentUser?.id || 1),
    enabled: !!currentUser?.id,
  });

  // 删除打卡记录
  const deleteMutation = useMutation({
    mutationFn: (id: number) => attendanceService.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      message.success(t('attendance.deleteSuccess') || '删除成功');
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  });

  // 上班打卡
  const clockInMutation = useMutation({
    mutationFn: () => attendanceService.clockIn({ latitude: 0, longitude: 0, address: 'Office' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      message.success(t('attendance.clockInSuccess'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  // 下班打卡
  const clockOutMutation = useMutation({
    mutationFn: () => attendanceService.clockOut({ latitude: 0, longitude: 0, address: 'Office' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      message.success(t('attendance.clockOutSuccess'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const handleClockIn = () => {
    if (todayStatus?.checkIn) {
      Modal.confirm({ title: t('attendance.alreadyClockIn'), onOk: () => clockInMutation.mutate() });
    } else {
      clockInMutation.mutate();
    }
  };

  const handleClockOut = () => {
    if (!todayStatus?.checkIn) {
      message.warning(t('attendance.pleaseClockInFirst'));
      return;
    }
    if (todayStatus?.checkOut) {
      Modal.confirm({ title: t('attendance.alreadyClockOut'), onOk: () => clockOutMutation.mutate() });
    } else {
      clockOutMutation.mutate();
    }
  };

  const columns = [
    {
      title: t('attendance.date') || '日期',
      dataIndex: 'dateStr',
      width: 120,
      render: (_: any, record: AggregatedRecord) => (
        <span>
          {record.dateStr}
          <br />
          <span style={{ color: '#888', fontSize: 12 }}>{record.weekday}</span>
        </span>
      ),
    },
    {
      title: t('attendance.clockInRecord') || '上班打卡',
      width: 150,
      render: (_: any, record: AggregatedRecord) => {
        if (!record.morningTime) return <Tag color="default">{t('attendance.notClockIn') || '未打卡'}</Tag>;
        const isLate = record.morningStatus === 'late';
        return (
          <span style={{ color: isLate ? '#ff4d4f' : undefined }}>
            {record.morningTime}
            {isLate && ` (${t('attendance.late') || '迟到'})`}
          </span>
        );
      },
    },
    {
      title: t('attendance.clockOutRecord') || '下班打卡',
      width: 150,
      render: (_: any, record: AggregatedRecord) => {
        if (!record.eveningTime) return <Tag color="default">{t('attendance.notClockOut') || '未打卡'}</Tag>;
        const isEarly = record.eveningStatus === 'early';
        return (
          <span style={{ color: isEarly ? '#faad14' : undefined }}>
            {record.eveningTime}
            {isEarly && ` (${t('attendance.earlyLeave') || '早退'})`}
          </span>
        );
      },
    },
    {
      title: t('attendance.status') || '状态',
      width: 100,
      render: (_: any, record: AggregatedRecord) => {
        const statuses = [record.morningStatus, record.eveningStatus];
        let color = 'green';
        let text = t('attendance.normal') || '正常';
        if (statuses.includes('late')) { color = 'red'; text = t('attendance.late') || '迟到'; }
        else if (statuses.includes('early')) { color = 'orange'; text = t('attendance.earlyLeave') || '早退'; }
        else if (!record.morningTime && !record.eveningTime) { color = 'default'; text = t('attendance.absent') || '缺勤'; }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: t('attendance.location') || '打卡地点',
      width: 200,
      render: (_: any, record: AggregatedRecord) => (
        <div style={{ fontSize: 12 }}>
          {record.morningAddress && <div>⬆ {record.morningAddress}</div>}
          {record.eveningAddress && <div>⬇ {record.eveningAddress}</div>}
          {!record.morningAddress && !record.eveningAddress && <span style={{ color: '#aaa' }}>-</span>}
        </div>
      ),
    },
    {
      title: t('common.remark') || '备注',
      width: 120,
      render: (_: any, record: AggregatedRecord) => {
        const makeupCount = record.rawRecords.length;
        if (makeupCount > 2) return <span style={{ color: '#888' }}>共{makeupCount}次打卡</span>;
        return '-';
      },
    },
    {
      title: t('common.action') || '操作',
      width: 80,
      render: (_: any, record: AggregatedRecord) => (
        <Popconfirm
          title="删除当日所有打卡记录？"
          onConfirm={() => {
            // 删除该日最后一条（最新的）打卡记录
            const latest = record.rawRecords.sort((a, b) => (a.id > b.id ? -1 : 1))[0];
            if (latest) deleteMutation.mutate(latest.id);
          }}
          okText="确定"
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            {t('common.delete') || '删除'}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('attendance.title')}</h1>

      {/* 打卡卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col span={16}>
            <Row gutter={32}>
              <Col>
                <Statistic
                  title={t('attendance.todayStatus')}
                  value={todayStatus?.checkIn ? dayjs(todayStatus.checkIn).format('HH:mm') : '--:--'}
                  suffix={todayStatus?.checkIn ? ` (${t('attendance.clockedIn')})` : ''}
                />
              </Col>
              <Col>
                <Statistic
                  title={t('attendance.clockOutStatus')}
                  value={todayStatus?.checkOut ? dayjs(todayStatus.checkOut).format('HH:mm') : '--:--'}
                  suffix={todayStatus?.checkOut ? ` (${t('attendance.clockedOut')})` : ''}
                />
              </Col>
            </Row>
            <Space style={{ marginTop: 24 }}>
              <Button type="primary" size="large" icon={<LoginOutlined />} onClick={handleClockIn} loading={clockInMutation.isPending} disabled={!!todayStatus?.checkIn}>
                {t('attendance.clockIn')}
              </Button>
              <Button size="large" icon={<LogoutOutlined />} onClick={handleClockOut} loading={clockOutMutation.isPending} disabled={!todayStatus?.checkIn || !!todayStatus?.checkOut}>
                {t('attendance.clockOut')}
              </Button>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <div style={{ color: '#888', fontSize: 13 }}>
              <EnvironmentOutlined /> GPS: --, --
            </div>
          </Col>
        </Row>
      </Card>

      {/* 请假余额 */}
      {leaveBalance && (
        <Card title={t('attendance.leaveBalance')} style={{ marginBottom: 24 }} size="small">
          <Row gutter={24}>
            <Col><Statistic title={t('leave.annual') || '年假'} value={leaveBalance.annual?.remaining ?? 0} suffix="天" valueStyle={{ color: '#52c41a' }} /></Col>
            <Col><Statistic title={t('leave.sick') || '病假'} value={leaveBalance.sick?.remaining ?? 0} suffix="天" valueStyle={{ color: '#1890ff' }} /></Col>
            <Col><Statistic title={t('leave.personal') || '事假'} value={leaveBalance.personal?.remaining ?? 0} suffix="天" valueStyle={{ color: '#faad14' }} /></Col>
          </Row>
        </Card>
      )}

      {/* 筛选 */}
      <Space style={{ marginBottom: 12 }}>
        <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)} />
      </Space>

      {/* 打卡记录表格 */}
      <Table
        columns={columns}
        dataSource={aggregatedRecords}
        rowKey="date"
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
}