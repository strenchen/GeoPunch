import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, DatePicker, Space, Tag, Card, Row, Col, Statistic, message, Modal } from 'antd';
import { LoginOutlined, LogoutOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { attendanceService } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { AttendanceRecord } from '../../types';

const { RangePicker } = DatePicker;

export default function AttendancePage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();

  // 今日考勤状态
  const { data: todayStatus } = useQuery({
    queryKey: ['attendanceToday'],
    queryFn: attendanceService.today,
    refetchInterval: 30000 // 每30s刷新
  });

  // 打卡记录
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendanceRecords', dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: () => attendanceService.records({
      start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
      end_date: dateRange?.[1]?.format('YYYY-MM-DD')
    })
  });

  // 个人考勤统计
  const { data: personalSummary } = useQuery({
    queryKey: ['personalSummary'],
    queryFn: attendanceService.stats
  });

  // 请假余额
  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance', currentUser?.id],
    queryFn: () => attendanceService.leaveBalance(currentUser?.id || 1),
    enabled: !!currentUser?.id
  });

  // 上班打卡
  const clockInMutation = useMutation({
    mutationFn: () => attendanceService.clockIn({
      latitude: 0,   // TODO: 真实GPS
      longitude: 0,
      address: 'Office'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      message.success(t('attendance.clockInSuccess'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error'))
  });

  // 下班打卡
  const clockOutMutation = useMutation({
    mutationFn: () => attendanceService.clockOut({
      latitude: 0,
      longitude: 0,
      address: 'Office'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      message.success(t('attendance.clockOutSuccess'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error'))
  });

  const handleClockIn = () => {
    if (todayStatus?.checkedIn) {
      Modal.confirm({ title: t('attendance.alreadyClockIn'), onOk: () => clockInMutation.mutate() });
    } else {
      clockInMutation.mutate();
    }
  };

  const handleClockOut = () => {
    if (!todayStatus?.checkedIn) {
      message.warning(t('attendance.pleaseClockInFirst'));
      return;
    }
    if (todayStatus?.checkedOut) {
      Modal.confirm({ title: t('attendance.alreadyClockOut'), onOk: () => clockOutMutation.mutate() });
    } else {
      clockOutMutation.mutate();
    }
  };

  const columns = [
    { title: t('attendance.date'), dataIndex: 'work_date', width: 120 },
    {
      title: t('attendance.clockInRecord'),
      dataIndex: 'check_time',
      width: 180,
      render: (time: string, record: any) => {
        if (!time) return <Tag>{t('attendance.notClockIn')}</Tag>;
        const isLate = record.status === 'late';
        return <span style={{ color: isLate ? '#ff4d4f' : undefined }}>{time}{isLate && ` (${t('attendance.late')})`}</span>;
      }
    },
    {
      title: t('attendance.clockOutRecord'),
      dataIndex: 'check_time_evening',
      width: 180,
      render: (time: string) => time ? time : <Tag>{t('attendance.notClockOut')}</Tag>
    },
    {
      title: t('attendance.status'),
      width: 120,
      render: (_: any, record: AttendanceRecord) => {
        const map: Record<string, string> = {
          normal: 'green', late: 'red', early: 'orange', absent: 'default'
        };
        return <Tag color={map[record.status] || 'default'}>{t(`attendanceStatus.${record.status}`)}</Tag>;
      }
    },
    { title: t('attendance.location'), dataIndex: 'location_name', width: 160 },
    { title: t('common.remark'), dataIndex: 'remark', ellipsis: true }
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
                  value={todayStatus?.checkedIn ? dayjs().format('HH:mm') : '--:--'}
                  suffix={todayStatus?.checkedIn ? ` (${t('attendance.clockedIn')})` : ''}
                />
              </Col>
              <Col>
                <Statistic
                  title={t('attendance.clockOutStatus')}
                  value={todayStatus?.checkedOut ? dayjs().format('HH:mm') : '--:--'}
                  suffix={todayStatus?.checkedOut ? ` (${t('attendance.clockedOut')})` : ''}
                />
              </Col>
            </Row>
            <Space style={{ marginTop: 24 }}>
              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={handleClockIn}
                loading={clockInMutation.isPending}
                disabled={todayStatus?.checkedIn}
              >
                {t('attendance.clockIn')}
              </Button>
              <Button
                size="large"
                icon={<LogoutOutlined />}
                onClick={handleClockOut}
                loading={clockOutMutation.isPending}
                disabled={!todayStatus?.checkedIn || todayStatus?.checkedOut}
              >
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
            <Col><Statistic title={t('leave.annual')} value={leaveBalance.annual.remaining} suffix="天" valueStyle={{ color: '#52c41a' }} /></Col>
            <Col><Statistic title={t('leave.sick')} value={leaveBalance.sick.remaining} suffix="天" valueStyle={{ color: '#1890ff' }} /></Col>
            <Col><Statistic title={t('leave.personal')} value={leaveBalance.personal.remaining} suffix="天" valueStyle={{ color: '#faad14' }} /></Col>
          </Row>
        </Card>
      )}

      {/* 考勤统计概览 */}
      {personalSummary && (
        <Card title={t('attendance.monthSummary')} style={{ marginBottom: 24 }} size="small">
          <Row gutter={24}>
            <Col><Statistic title={t('attendance.totalWorkDays')} value={personalSummary.total_work_days} /></Col>
            <Col><Statistic title={t('attendance.normalDays')} value={personalSummary.normal_days} valueStyle={{ color: '#52c41a' }} /></Col>
            <Col><Statistic title={t('attendance.lateDays')} value={personalSummary.late_days} valueStyle={{ color: '#ff4d4f' }} /></Col>
            <Col><Statistic title={t('attendance.earlyLeaveDays')} value={personalSummary.early_leave_days} valueStyle={{ color: '#faad14' }} /></Col>
            <Col><Statistic title={t('attendance.absentDays')} value={personalSummary.absent_days} valueStyle={{ color: '#d9d9d9' }} /></Col>
            <Col><Statistic title={t('attendance.leaveDays')} value={personalSummary.leave_days} valueStyle={{ color: '#1890ff' }} /></Col>
          </Row>
        </Card>
      )}

      {/* 筛选 */}
      <Space style={{ marginBottom: 12 }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
        />
      </Space>

      {/* 打卡记录表格 */}
      <Table
        columns={columns}
        dataSource={records as AttendanceRecord[]}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
}
