import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, DatePicker, Select, Input, message, Space, Tag, Tabs } from 'antd';
import { PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { scheduleService, employeeService } from '../../services/api';
import type { Schedule } from '../../types';

const { Option } = Select;

export default function SchedulePage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [form] = Form.useForm();
  const [shiftForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 本周日期
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));

  // 员工列表（用于下拉搜索）
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeeService.list({}).then((r: any) => r.employees || []),
  });

  const { data: scheduleList = [], isLoading } = useQuery({
    queryKey: ['schedules', weekStart.format('YYYY-MM-DD')],
    queryFn: () => scheduleService.list({
      start_date: weekStart.format('YYYY-MM-DD'),
      end_date: weekStart.add(6, 'day').format('YYYY-MM-DD')
    }).then((list: any[]) => list.map((s: any) => ({
      ...s,
      employee_name: s.employee?.name,
      schedule_date: s.scheduleDate?.slice(0, 10),
      shift_type: s.shiftType?.toLowerCase(),
    })))
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Schedule, 'id'>) => scheduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const applyShiftMutation = useMutation({
    mutationFn: (data: any) => scheduleService.applyShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      message.success(t('common.success'));
      handleCloseShiftModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const handleCloseModal = () => { setIsModalOpen(false); form.resetFields(); };
  const handleCloseShiftModal = () => { setIsShiftModalOpen(false); shiftForm.resetFields(); };

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      employee_id: values.employee_id,
      schedule_date: values.schedule_date.format('YYYY-MM-DD'),
      shift_type: values.shift_type,
      start_time: values.start_time,
      end_time: values.end_time,
    });
  };

  const handleApplyShift = (values: any) => {
    applyShiftMutation.mutate({
      ...values,
      original_date: values.original_date.format('YYYY-MM-DD'),
      target_date: values.target_date.format('YYYY-MM-DD')
    });
  };

  const columns = [
    {
      title: t('schedule.weekDay'),
      dataIndex: 'weekday',
      width: 120,
      render: (_: any, record: Schedule) => {
        const day = dayjs(record.schedule_date);
        const wdays = [t('weekdays.0'), t('weekdays.1'), t('weekdays.2'), t('weekdays.3'), t('weekdays.4'), t('weekdays.5'), t('weekdays.6')];
        return wdays[day.day()];
      }
    },
    { title: t('attendance.date'), dataIndex: 'schedule_date', width: 130 },
    { title: t('employee.name'), dataIndex: 'employee_name', width: 120 },
    {
      title: t('schedule.shiftType'),
      dataIndex: 'shift_type',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = { morning: 'blue', afternoon: 'green', full_day: 'cyan', off: 'default' };
        return <Tag color={colors[type]}>{t(`shiftType.${type}`)}</Tag>;
      }
    },
    { title: t('schedule.workStartTime'), dataIndex: 'start_time', width: 90 },
    { title: t('schedule.workEndTime'), dataIndex: 'end_time', width: 90 },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_: any, record: Schedule) => (
        <Space>
          <Button size="small" onClick={() => { shiftForm.setFieldsValue({ original_date: dayjs(record.schedule_date) }); setIsShiftModalOpen(true); }}>
            {t('schedule.applyShift')}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('schedule.title')}</h1>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => setWeekStart(weekStart.subtract(1, 'week'))}>{'<'}</Button>
        <span>{weekStart.format('YYYY-MM-DD')} ~ {weekStart.add(6, 'day').format('YYYY-MM-DD')}</span>
        <Button onClick={() => setWeekStart(weekStart.add(1, 'week'))}>{'>'}</Button>
        <Button onClick={() => setWeekStart(dayjs().startOf('week'))}>{t('schedule.thisWeek')}</Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'view',
            label: t('schedule.viewSchedule'),
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                    {t('schedule.addSchedule')}
                  </Button>
                  <Button icon={<SwapOutlined />} onClick={() => setIsShiftModalOpen(true)}>
                    {t('schedule.applyShift')}
                  </Button>
                </Space>
                <Table columns={columns} dataSource={scheduleList as Schedule[]} rowKey="id" loading={isLoading} pagination={false} />
              </>
            )
          }
        ]}
      />

      {/* 新增排班 */}
      <Modal open={isModalOpen} title={t('schedule.addSchedule')} onCancel={handleCloseModal} footer={null} width={480}>
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employee_id" label={t('employee.name')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="请选择员工"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map((emp: any) => (
                <Option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeNumber})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="schedule_date" label={t('attendance.date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="shift_type" label={t('schedule.shiftType')} rules={[{ required: true }]}>
            <Select>
              <Option value="morning">{t('shiftType.morning')}</Option>
              <Option value="afternoon">{t('shiftType.afternoon')}</Option>
              <Option value="full_day">{t('shiftType.full_day')}</Option>
              <Option value="off">{t('shiftType.off')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="start_time" label={t('schedule.workStartTime')}>
            <Input type="time" />
          </Form.Item>
          <Form.Item name="end_time" label={t('schedule.workEndTime')}>
            <Input type="time" />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseModal}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>{t('common.save')}</Button>
          </Space>
        </Form>
      </Modal>

      {/* 申请调班 */}
      <Modal open={isShiftModalOpen} title={t('schedule.applyShift')} onCancel={handleCloseShiftModal} footer={null} width={480}>
        <Form form={shiftForm} onFinish={handleApplyShift} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employee_id" label={t('employee.name')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="请选择员工"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map((emp: any) => (
                <Option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeNumber})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="original_date" label={t('schedule.originalDate')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="target_date" label={t('schedule.targetDate')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label={t('leave.reason')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseShiftModal}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={applyShiftMutation.isPending}>{t('common.save')}</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
