import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, DatePicker, Select, Input, message, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService, makeupService } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import type { LeaveRequest, MakeupRequest } from '../../types';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function LeavePage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');
  const [form] = Form.useForm();
  const { currentUser } = useAppStore();
  const queryClient = useQueryClient();

  const { data: leaveList = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: leaveService.list
  });

  const { data: makeupList = [], isLoading: makeupLoading } = useQuery({
    queryKey: ['makeupRequests'],
    queryFn: makeupService.list
  });

  const leaveMutation = useMutation({
    mutationFn: (data: any) => leaveService.create({ ...data, employeeId: currentUser?.id || 1, status: 'pending' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }); message.success(t('common.success')); setIsModalOpen(false); form.resetFields(); }
  });

  const makeupMutation = useMutation({
    mutationFn: (data: any) => makeupService.create({ ...data, employeeId: currentUser?.id || 1, status: 'pending' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['makeupRequests'] }); message.success(t('common.success')); setIsModalOpen(false); form.resetFields(); }
  });

  const handleSubmit = (values: any) => {
    if (activeTab === 'leave') {
      leaveMutation.mutate(values);
    } else {
      makeupMutation.mutate(values);
    }
  };

  const leaveColumns = [
    { title: t('employee.name'), dataIndex: 'employeeName' },
    { title: t('leave.leaveType'), dataIndex: 'leaveType', render: (type: string) => t(`leave.${type}`) },
    { title: t('leave.startDate'), dataIndex: 'startDate' },
    { title: t('leave.endDate'), dataIndex: 'endDate' },
    { title: t('leave.reason'), dataIndex: 'reason' },
    {
      title: t('employee.status'),
      dataIndex: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
        return <span style={{ color: colors[status] }}>{t(`approval.${status}`)}</span>;
      }
    }
  ];

  const makeupColumns = [
    { title: t('employee.name'), dataIndex: 'employeeName' },
    { title: t('attendance.date'), dataIndex: 'date' },
    { title: t('attendance.clockInRecord'), dataIndex: 'clockInTime' },
    { title: t('attendance.clockOutRecord'), dataIndex: 'clockOutTime' },
    { title: t('leave.reason'), dataIndex: 'reason' },
    {
      title: t('employee.status'),
      dataIndex: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
        return <span style={{ color: colors[status] }}>{t(`approval.${status}`)}</span>;
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('leave.title')}</h1>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'leave', label: t('leave.title') },
        { key: 'makeup', label: t('leave.makeup') }
      ]} />
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ marginBottom: 16 }}>
        {activeTab === 'leave' ? t('leave.addLeave') : t('leave.applyMakeup')}
      </Button>
      {activeTab === 'leave' ? (
        <Table columns={leaveColumns} dataSource={leaveList as LeaveRequest[]} rowKey="id" loading={leaveLoading} />
      ) : (
        <Table columns={makeupColumns} dataSource={makeupList as MakeupRequest[]} rowKey="id" loading={makeupLoading} />
      )}
      <Modal open={isModalOpen} title={activeTab === 'leave' ? t('leave.addLeave') : t('leave.applyMakeup')} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          {activeTab === 'leave' ? (
            <>
              <Form.Item name="leaveType" label={t('leave.leaveType')} rules={[{ required: true }]}>
                <Select>
                  <Option value="annual">{t('leave.annual')}</Option>
                  <Option value="sick">{t('leave.sick')}</Option>
                  <Option value="personal">{t('leave.personal')}</Option>
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label={t('leave.startDate')} rules={[{ required: true }]}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="reason" label={t('leave.reason')} rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="date" label={t('attendance.date')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="clockInTime" label={t('attendance.clockInRecord')} rules={[{ required: true }]}>
                <Input type="time" />
              </Form.Item>
              <Form.Item name="clockOutTime" label={t('attendance.clockOutRecord')} rules={[{ required: true }]}>
                <Input type="time" />
              </Form.Item>
              <Form.Item name="reason" label={t('leave.reason')} rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </>
          )}
          <Button type="primary" htmlType="submit" loading={leaveMutation.isPending || makeupMutation.isPending}>{t('common.save')}</Button>
        </Form>
      </Modal>
    </div>
  );
}