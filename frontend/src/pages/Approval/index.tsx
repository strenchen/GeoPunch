import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Tag, Space, message, Modal, Input, Form, Card, Statistic, Row, Col, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../../services/api';
import type { ApprovalItem, LeaveRequest, MakeupRequest } from '../../types';

const { TextArea } = Input;

export default function ApprovalPage() {
  const { t } = useTranslation();
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: pendingList = [], isLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: approvalService.list
  });



  const approveMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: 'leave' | 'makeup'; remark?: string }) =>
      approvalService.approve(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      message.success(t('common.success'));
      handleCloseRemarkModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: 'leave' | 'makeup'; remark?: string }) =>
      approvalService.reject(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      message.success(t('common.success'));
      handleCloseRemarkModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const handleAction = (item: ApprovalItem, type: 'approve' | 'reject') => {
    setCurrentItem(item);
    setActionType(type);
    setIsRemarkModalOpen(true);
  };

  const handleCloseRemarkModal = () => {
    setIsRemarkModalOpen(false);
    setCurrentItem(null);
    form.resetFields();
  };

  const handleSubmitRemark = (values: { remark?: string }) => {
    if (!currentItem) return;
    const payload = { id: currentItem.id, type: currentItem.type as 'leave' | 'makeup', remark: values.remark };
    if (actionType === 'approve') {
      approveMutation.mutate(payload);
    } else {
      rejectMutation.mutate(payload);
    }
  };

  const renderDetail = (item: ApprovalItem) => {
    if (item.type === 'leave') {
      const detail = item.detail as LeaveRequest;
      return (
        <Space direction="vertical" size="small">
          <span><strong>{t('leave.leaveType')}:</strong> {t(`leaveType.${detail.leave_type}`)}</span>
          <span><strong>{t('leave.startDate')}:</strong> {detail.start_date} ~ <strong>{t('leave.endDate')}:</strong> {detail.end_date}</span>
          <span><strong>{t('leave.duration')}:</strong> {detail.duration_days}天</span>
          <span><strong>{t('leave.reason')}:</strong> {detail.reason}</span>
        </Space>
      );
    } else {
      const detail = item.detail as MakeupRequest;
      return (
        <Space direction="vertical" size="small">
          <span><strong>{t('attendance.date')}:</strong> {detail.target_date}</span>
          <span><strong>{t('makeup.checkTime')}:</strong> {detail.check_time}</span>
          <span><strong>{t('leave.reason')}:</strong> {detail.reason}</span>
        </Space>
      );
    }
  };

  const pendingCount = (pendingList as ApprovalItem[]).length;
  const columns = [
    {
      title: t('employee.name'),
      dataIndex: 'employee_name',
      width: 120,
      render: (name: string) => <b>{name}</b>
    },
    {
      title: t('approval.type'),
      dataIndex: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'leave' ? 'blue' : 'purple'}>
          {type === 'leave' ? t('leave.title') : t('leave.makeup')}
        </Tag>
      )
    },
    {
      title: t('approval.detail'),
      dataIndex: 'detail',
      render: (_: any, record: ApprovalItem) => renderDetail(record)
    },
    {
      title: t('approval.createTime'),
      dataIndex: 'create_time',
      width: 170
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_: any, record: ApprovalItem) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleAction(record, 'approve')}
            loading={approveMutation.isPending}
          >
            {t('approval.approve')}
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={() => handleAction(record, 'reject')}
            loading={rejectMutation.isPending}
          >
            {t('approval.reject')}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('approval.title')}</h1>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Card size="small">
            <Statistic
              title={t('approval.pending')}
              value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 待审批列表 */}
      <Tabs
        items={[
          {
            key: 'pending',
            label: `${t('approval.pending')} (${pendingCount})`,
            children: (
              <Table
                columns={columns}
                dataSource={pendingList as ApprovalItem[]}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
              />
            )
          }
        ]}
      />

      {/* 审批意见弹窗 */}
      <Modal
        open={isRemarkModalOpen}
        title={actionType === 'approve' ? t('approval.approve') : t('approval.reject')}
        onCancel={handleCloseRemarkModal}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmitRemark} layout="vertical">
          <Form.Item label={t('approval.applicant')}>
            <Input value={currentItem?.employee_name} disabled />
          </Form.Item>
          <Form.Item label={t('approval.type')}>
            <Input value={currentItem?.type === 'leave' ? t('leave.title') : t('leave.makeup')} disabled />
          </Form.Item>
          <Form.Item label={t('leave.reason')}>
            <Input.TextArea value={currentItem?.detail?.reason || ''} disabled rows={2} />
          </Form.Item>
          <Form.Item name="remark" label={t('approval.remark')}>
            <TextArea rows={3} placeholder={t('approval.remarkPlaceholder')} />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseRemarkModal}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={approveMutation.isPending || rejectMutation.isPending}
              danger={actionType === 'reject'}
            >
              {t('common.confirm')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
