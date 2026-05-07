import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService } from '../../services/api';
import type { Department } from '../../types';

export default function DepartmentPage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => departmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      departmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      message.success(t('common.success'));
    },
    onError: (err: any) => message.error(err?.message || t('common.error')),
  });

  const handleOpenModal = (record?: Department) => {
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
    { title: t('employee.department'), dataIndex: 'name', width: 200 },
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
      render: (_: any, record: Department) => (
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
      <h1>{t('department.title')}</h1>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => handleOpenModal()}
        style={{ marginBottom: 16 }}
      >
        {t('department.addDepartment')}
      </Button>

      <Table
        columns={columns}
        dataSource={departments as Department[]}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        open={isModalOpen}
        title={editingId ? t('department.editDepartment') : t('department.addDepartment')}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('employee.department')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('department.namePlaceholder')} />
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
