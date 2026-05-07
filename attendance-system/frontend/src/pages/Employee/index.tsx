import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, Select, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../../services/api';
import type { Employee } from '../../types';

const { Option } = Select;

export default function EmployeePage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.list
  });

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Omit<Employee, 'id'>) => employeeService.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); message.success(t('common.success')); setIsModalOpen(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => employeeService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); message.success(t('common.success')); setIsModalOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); message.success(t('common.success')); }
  });

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({ title: t('common.confirm'), onOk: () => deleteMutation.mutate(id) });
  };

  const handleSubmit = (values: any) => {
    if (editingEmployee?.id) {
      updateMutation.mutate({ id: editingEmployee.id, data: values });
    } else {
      createMutation.mutate(values);
    }
    form.resetFields();
    setEditingEmployee(null);
  };

  const columns = [
    { title: t('employee.name'), dataIndex: 'name' },
    { title: t('employee.email'), dataIndex: 'email' },
    { title: t('employee.phone'), dataIndex: 'phone' },
    { title: t('employee.department'), dataIndex: 'department' },
    { title: t('employee.position'), dataIndex: 'position' },
    {
      title: t('employee.status'),
      dataIndex: 'status',
      render: (status: string) => status === 'active' ? t('employee.active') : t('employee.inactive')
    },
    {
      title: t('common.edit'),
      render: (_: any, record: Employee) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id!)} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('employee.title')}</h1>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEmployee(null); form.resetFields(); setIsModalOpen(true); }} style={{ marginBottom: 16 }}>
        {t('employee.addEmployee')}
      </Button>
      <Table columns={columns} dataSource={employees} rowKey="id" loading={isLoading} />
      <Modal open={isModalOpen} title={editingEmployee ? t('employee.editEmployee') : t('employee.addEmployee')} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="name" label={t('employee.name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label={t('employee.email')} rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label={t('employee.phone')}><Input /></Form.Item>
          <Form.Item name="department" label={t('employee.department')}><Input /></Form.Item>
          <Form.Item name="position" label={t('employee.position')}><Input /></Form.Item>
          <Form.Item name="status" label={t('employee.status')}>
            <Select><Option value="active">{t('employee.active')}</Option><Option value="inactive">{t('employee.inactive')}</Option></Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>{t('common.save')}</Button>
        </Form>
      </Modal>
    </div>
  );
}