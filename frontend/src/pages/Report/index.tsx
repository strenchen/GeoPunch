import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Space, Card, Row, Col, Statistic, DatePicker, message, Tabs, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { statisticsService } from '../../services/api';
import type { AttendanceSummary } from '../../types';

export default function ReportPage() {
  const { t } = useTranslation();
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'));

  const [year, month] = yearMonth.split('-').map(Number);

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['attendanceSummary', yearMonth],
    queryFn: () => statisticsService.monthly({ year, month }).then((list: any[]) =>
      (list as any[]).map(item => ({
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        department_name: item.department_name,
        total_work_days: item.total_work_days || 0,
        normal_days: item.normal_days || 0,
        late_days: item.late_days || 0,
        early_leave_days: item.early_leave_days || 0,
        absent_days: item.absent_days || 0,
        worked_days: item.worked_days || 0,
        leave_days: 0,
      }))
    ),
  });

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(summaryData as AttendanceSummary[]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
    XLSX.writeFile(wb, `attendance_report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success(t('common.success'));
  };

  // 统计数据
  const stats = {
    total: (summaryData as AttendanceSummary[]).length,
    normal: (summaryData as AttendanceSummary[]).reduce((sum, s) => sum + (s.normal_days || 0), 0),
    late: (summaryData as AttendanceSummary[]).reduce((sum, s) => sum + (s.late_days || 0), 0),
    earlyLeave: (summaryData as AttendanceSummary[]).reduce((sum, s) => sum + (s.early_leave_days || 0), 0),
    absent: (summaryData as AttendanceSummary[]).reduce((sum, s) => sum + (s.absent_days || 0), 0),
    leave: (summaryData as AttendanceSummary[]).reduce((sum, s) => sum + (s.leave_days || 0), 0)
  };

  const columns = [
    { title: t('employee.name'), dataIndex: 'employee_name', width: 120 },
    { title: t('employee.department'), dataIndex: 'department_name', width: 140 },
    { title: yearMonth, dataIndex: 'total_work_days', width: 100 },
    { title: t('attendance.normalDays'), dataIndex: 'normal_days', width: 90,
      render: (d: number) => <span style={{ color: '#52c41a' }}>{d}</span> },
    { title: t('attendance.lateDays'), dataIndex: 'late_days', width: 90,
      render: (d: number) => <span style={{ color: '#ff4d4f' }}>{d}</span> },
    { title: t('attendance.earlyLeaveDays'), dataIndex: 'early_leave_days', width: 100,
      render: (d: number) => <span style={{ color: '#faad14' }}>{d}</span> },
    { title: t('attendance.absentDays'), dataIndex: 'absent_days', width: 90,
      render: (d: number) => <span style={{ color: '#d9d9d9' }}>{d}</span> },
    { title: t('attendance.leaveDays'), dataIndex: 'leave_days', width: 90,
      render: (d: number) => <span style={{ color: '#1890ff' }}>{d}</span> }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('report.title')}</h1>

      {/* 操作栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker.MonthPicker
          value={dayjs(yearMonth)}
          onChange={(_, str) => setYearMonth(str || dayjs().format('YYYY-MM'))}
        />
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          {t('report.export')}
        </Button>
      </Space>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col><Card size="small"><Statistic title={t('report.totalEmployees')} value={stats.total} /></Card></Col>
        <Col><Card size="small"><Statistic title={t('attendance.normalDays')} value={stats.normal} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col><Card size="small"><Statistic title={t('attendance.lateDays')} value={stats.late} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col><Card size="small"><Statistic title={t('attendance.earlyLeaveDays')} value={stats.earlyLeave} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col><Card size="small"><Statistic title={t('attendance.absentDays')} value={stats.absent} valueStyle={{ color: '#d9d9d9' }} /></Card></Col>
        <Col><Card size="small"><Statistic title={t('attendance.leaveDays')} value={stats.leave} valueStyle={{ color: '#1890ff' }} /></Card></Col>
      </Row>

      {/* 导出/查看模式切换 */}
      <Tabs
        items={[
          {
            key: 'table',
            label: t('report.summary'),
            children: (
              <Table
                columns={columns}
                dataSource={summaryData as AttendanceSummary[]}
                rowKey="employee_id"
                loading={isLoading}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => `Total ${total}` }}
              />
            )
          }
        ]}
      />
    </div>
  );
}
