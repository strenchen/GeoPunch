import { useTranslation } from 'react-i18next';
import { Table, Button, Tag, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../../services/api';

export default function ApprovalPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pendingList = [], isLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: approvalService.pending
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: string }) => approvalService.approve(id, type),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: string }) => approvalService.reject(id, type),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const columns = [
    { title: t('employee.name'), dataIndex: 'employeeName' },
    { title: 'Type', dataIndex: 'type', render: (type: string) => <Tag color={type === 'leave' ? 'blue' : 'purple'}>{type}</Tag> },
    { title: 'Content', dataIndex: 'content' },
    { title: 'Time', dataIndex: 'createTime' },
    {
      title: t('common.confirm'),
      render: (_: any, record: any) => (
        <Space>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => approveMutation.mutate({ id: record.id, type: record.type })} loading={approveMutation.isPending}>
            {t('approval.approve')}
          </Button>
          <Button danger icon={<CloseOutlined />} onClick={() => rejectMutation.mutate({ id: record.id, type: record.type })} loading={rejectMutation.isPending}>
            {t('approval.reject')}
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('approval.title')}</h1>
      <Table columns={columns} dataSource={pendingList} rowKey="id" loading={isLoading} />
    </div>
  );
}