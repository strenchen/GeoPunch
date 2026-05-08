import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '../../services/api';
import type { Role } from '../../types';

export default function RolePage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; permissions?: any }) => roleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; permissions?: any } }) =>
      roleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => roleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success(t('common.success'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const handleOpenModal = (record?: Role) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({ name: record.name });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleSubmit = (values: { name: string }) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: t('role.name') || '角色名称', dataIndex: 'name', width: 150 },
    {
      title: '权限',
      dataIndex: 'permissions',
      width: 200,
      render: (perms: any) => {
        if (!perms) return '-';
        return Object.entries(perms).map(([key, value]) =>
          value === true ? <Tag key={key}>{key}</Tag> : null
        );
      },
    },
    {
      title: '员工数',
      dataIndex: '_count',
      width: 80,
      render: (count: { employees: number }) => count?.employees ?? 0,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (_: any, record: Role) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('common.confirmDelete')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('common.ok')}
            cancelText={t('common.cancel')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('role.title') || '角色管理'}</h1>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => handleOpenModal()}
        style={{ marginBottom: 16 }}
      >
        {t('role.addRole') || '新增角色'}
      </Button>

      <Table
        columns={columns}
        dataSource={roles as Role[]}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={isModalOpen}
        title={editingId ? (t('role.editRole') || '编辑角色') : (t('role.addRole') || '新增角色')}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('role.name') || '角色名称'}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('role.namePlaceholder') || '请输入角色名称'} />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseModal}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {t('common.save')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}