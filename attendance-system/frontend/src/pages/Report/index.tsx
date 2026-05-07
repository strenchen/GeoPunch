import { useTranslation } from 'react-i18next';
import { Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { DataGrid } from 'react-data-grid';
import type { Column } from 'react-data-grid';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { reportService } from '../../services/api';

export default function ReportPage() {
  const { t } = useTranslation();

  const { data: summaryData = [] } = useQuery({
    queryKey: ['attendanceSummary'],
    queryFn: reportService.summary
  });

  const columns: Column<any>[] = [
    { name: t('employee.name'), key: 'employeeName' },
    { name: t('employee.department'), key: 'department' },
    { name: t('attendance.normal'), key: 'normalDays' },
    { name: t('attendance.late'), key: 'lateDays' },
    { name: 'Leave Early', key: 'leaveEarlyDays' },
    { name: 'Absent', key: 'absentDays' }
  ];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
    XLSX.writeFile(wb, `attendance_report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success(t('common.success'));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('report.title')}</h1>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          {t('report.export')}
        </Button>
      </Space>
      <DataGrid columns={columns} rows={summaryData} style={{ height: 400 }} />
    </div>
  );
}