import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, DatePicker, Select, Input, message, Tabs, Card, Row, Col, Statistic, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { leaveService, makeupService, attendanceService } from '../../services/api';
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

  // 请假余额
  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance', currentUser?.id],
    queryFn: () => attendanceService.leaveBalance(currentUser?.id || 1),
    enabled: !!currentUser?.id
  });

  // 请假列表
  const { data: leaveList = [], isLoading: leaveLoading } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => leaveService.list()
  });

  // 补卡列表
  const { data: makeupList = [], isLoading: makeupLoading } = useQuery({
    queryKey: ['makeupRequests'],
    queryFn: () => makeupService.list()
  });

  const leaveMutation = useMutation({
    mutationFn: (data: any) => leaveService.create({
      ...data,
      employee_id: currentUser?.id || 1,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const makeupMutation = useMutation({
    mutationFn: (data: any) => makeupService.create({
      ...data,
      employee_id: currentUser?.id || 1,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['makeupRequests'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (activeTab === 'leave') {
      const [start, end] = values.dateRange;
      leaveMutation.mutate({
        ...values,
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
        duration_days: end.diff(start, 'day') + 1
      });
    } else {
      makeupMutation.mutate({
        ...values,
        target_date: values.date.format('YYYY-MM-DD'),
        check_time: values.check_time
      });
    }
  };

  const statusColors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', cancelled: 'default' };

  const leaveColumns = [
    { title: t('employee.name'), dataIndex: 'employee_name', width: 120 },
    { title: t('leave.leaveType'), dataIndex: 'leave_type', width: 120,
      render: (type: string) => t(`leaveType.${type}`) },
    { title: t('leave.startDate'), dataIndex: 'start_date', width: 120 },
    { title: t('leave.endDate'), dataIndex: 'end_date', width: 120 },
    { title: t('leave.duration'), dataIndex: 'duration_days', width: 90,
      render: (d: number) => `${d}天` },
    { title: t('leave.reason'), dataIndex: 'reason', ellipsis: true },
    { title: t('employee.status'), dataIndex: 'status', width: 100,
      render: (s: string) => <span style={{ color: statusColors[s] }}>{t(`approvalStatus.${s}`)}</span> }
  ];

  const makeupColumns = [
    { title: t('employee.name'), dataIndex: 'employee_name', width: 120 },
    { title: t('attendance.date'), dataIndex: 'target_date', width: 120 },
    { title: t('makeup.checkTime'), dataIndex: 'check_time', width: 180 },
    { title: t('leave.reason'), dataIndex: 'reason', ellipsis: true },
    {
      title: t('employee.status'),
      dataIndex: 'status', width: 100,
      render: (s: string) => <span style={{ color: statusColors[s] }}>{t(`approvalStatus.${s}`)}</span>
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('leave.title')}</h1>

      {/* 请假余额展示 */}
      {leaveBalance && (
        <Card style={{ marginBottom: 24 }} size="small">
          <Row gutter={24}>
            <Col>
              <Statistic
                title={t('leave.annual')}
                value={leaveBalance.annual.remaining}
                suffix="天"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col>
              <Statistic
                title={t('leave.sick')}
                value={leaveBalance.sick.remaining}
                suffix="天"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col>
              <Statistic
                title={t('leave.personal')}
                value={leaveBalance.personal.remaining}
                suffix="天"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'leave', label: t('leave.title') },
          { key: 'makeup', label: t('leave.makeup') }
        ]}
        style={{ marginBottom: 12 }}
      />

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsModalOpen(true)}
        style={{ marginBottom: 12 }}
      >
        {activeTab === 'leave' ? t('leave.addLeave') : t('leave.applyMakeup')}
      </Button>

      {activeTab === 'leave' ? (
        <Table columns={leaveColumns} dataSource={leaveList as LeaveRequest[]} rowKey="id" loading={leaveLoading} pagination={{ pageSize: 10 }} />
      ) : (
        <Table columns={makeupColumns} dataSource={makeupList as MakeupRequest[]} rowKey="id" loading={makeupLoading} pagination={{ pageSize: 10 }} />
      )}

      <Modal
        open={isModalOpen}
        title={activeTab === 'leave' ? t('leave.addLeave') : t('leave.applyMakeup')}
        onCancel={handleCloseModal}
        footer={null}
        width={480}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          {activeTab === 'leave' ? (
            <>
              <Form.Item name="leave_type" label={t('leave.leaveType')} rules={[{ required: true }]}>
                <Select>
                  <Option value="年假">{t('leave.annual')}</Option>
                  <Option value="病假">{t('leave.sick')}</Option>
                  <Option value="事假">{t('leave.personal')}</Option>
                  <Option value="其他">{t('leave.other')}</Option>
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label={t('leave.dateRange')} rules={[{ required: true }]}>
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
              <Form.Item name="check_time" label={t('makeup.checkTime')} rules={[{ required: true }]}
                extra={t('makeup.checkTimeTip')}>
                <Input type="datetime-local" />
              </Form.Item>
              <Form.Item name="reason" label={t('leave.reason')} rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </>
          )}
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseModal}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={leaveMutation.isPending || makeupMutation.isPending}>
              {t('common.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
