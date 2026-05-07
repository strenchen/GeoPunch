import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Form, Input, Select, Space, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from 'react-data-grid';
import type { Column } from 'react-data-grid';
import { employeeService, departmentService } from '../../services/api';
import type { Employee, EmployeeStatus } from '../../types';
import 'react-data-grid/lib/styles.css';

const { Option } = Select;

export default function EmployeePage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterDept, setFilterDept] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | undefined>();

  // 查询
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.list()
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.list
  });

  // 过滤
  const filteredEmployees = useMemo(() => {
    return (employees as Employee[]).filter(emp => {
      const matchSearch = !searchText ||
        emp.name?.includes(searchText) ||
        emp.employee_id?.includes(searchText) ||
        emp.phone?.includes(searchText);
      const matchDept = !filterDept || emp.department_id === filterDept;
      const matchStatus = !filterStatus || emp.status === filterStatus;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchText, filterDept, filterStatus]);

  // CRUD mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<Employee, 'id'>) => employeeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => employeeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success(t('common.success'));
      handleCloseModal();
    },
    onError: () => message.error(t('common.error'))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success(t('common.success'));
    },
    onError: () => message.error(t('common.error'))
  });

  const handleOpenModal = (record?: Employee) => {
    if (record) {
      setEditingEmployee(record);
      form.setFieldsValue({
        ...record,
        department_id: record.department_id
      });
    } else {
      setEditingEmployee(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (editingEmployee?.id) {
      updateMutation.mutate({ id: editingEmployee.id, data: values });
    } else {
      createMutation.mutate(values as Omit<Employee, 'id'>);
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: t('common.confirm'),
      content: t('employee.deleteConfirm'),
      onOk: () => deleteMutation.mutate(id)
    });
  };

  const getDeptName = (idOrName: any) =>
    typeof idOrName === 'string' ? idOrName : ((departments as unknown) as string[]).find(d => d === idOrName) || String(idOrName);

  const columns: Column<Employee>[] = [
    { name: t('employee.employeeId'), key: 'employee_id', width: 120 },
    { name: t('employee.name'), key: 'name', width: 120 },
    { name: t('employee.phone'), key: 'phone', width: 140 },
    { name: t('employee.department'), key: 'department_id', width: 140,
      renderCell: ({ row }) => getDeptName(row.department_id) },
    { name: t('employee.employeeType'), key: 'employee_type', width: 130,
      renderCell: ({ row }) => {
        const colors: Record<string, string> = { leader: 'gold', sales: 'blue', rd_admin: 'green' };
        return <Tag color={colors[row.employee_type]}>{t(`employeeType.${row.employee_type}`)}</Tag>;
      }
    },
    { name: t('employee.role'), key: 'role', width: 130,
      renderCell: ({ row }) => {
        const colors: Record<string, string> = { super_admin: 'red', dept_admin: 'orange', employee: 'default' };
        return <Tag color={colors[row.role]}>{t(`systemRole.${row.role}`)}</Tag>;
      }
    },
    { name: t('employee.status'), key: 'status', width: 100,
      renderCell: ({ row }) => {
        const colors: Record<string, string> = { active: 'green', inactive: 'orange', left: 'red' };
        return <Tag color={colors[row.status]}>{t(`employeeStatus.${row.status}`)}</Tag>;
      }
    },
    {
      name: t('common.actions'),
      key: 'actions',
      width: 140,
      renderCell: ({ row }) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row.id!)} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{t('employee.title')}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          {t('employee.addEmployee')}
        </Button>
      </div>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          placeholder={t('common.search')}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder={t('employee.filterDept')}
          allowClear
          style={{ width: 160 }}
          onChange={val => setFilterDept(val)}
          value={filterDept}
        >
          {((departments as unknown) as string[]).map(d => (
            <Option key={d} value={d}>{d}</Option>
          ))}
        </Select>
        <Select
          placeholder={t('employee.filterStatus')}
          allowClear
          style={{ width: 120 }}
          onChange={val => setFilterStatus(val)}
          value={filterStatus}
        >
          <Option value="active">{t('employeeStatus.active')}</Option>
          <Option value="inactive">{t('employeeStatus.inactive')}</Option>
          <Option value="left">{t('employeeStatus.left')}</Option>
        </Select>
        <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); setFilterDept(undefined); setFilterStatus(undefined); }}>
          {t('common.reset')}
        </Button>
      </Space>

      {/* 表格 */}
      <DataGrid
        columns={columns}
        rows={filteredEmployees}
        style={{ height: 500 }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        open={isModalOpen}
        title={editingEmployee ? t('employee.editEmployee') : t('employee.addEmployee')}
        onCancel={handleCloseModal}
        footer={null}
        width={520}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="employee_id" label={t('employee.employeeId')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label={t('employee.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('employee.phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="department_id" label={t('employee.department')} rules={[{ required: true }]}>
            <Select>
              {((departments as unknown) as string[]).map(d => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="employee_type" label={t('employee.employeeType')} rules={[{ required: true }]}>
            <Select>
              <Option value="leader">{t('employeeType.leader')}</Option>
              <Option value="sales">{t('employeeType.sales')}</Option>
              <Option value="rd_admin">{t('employeeType.rd_admin')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="role" label={t('employee.role')} rules={[{ required: true }]}>
            <Select>
              <Option value="super_admin">{t('systemRole.super_admin')}</Option>
              <Option value="dept_admin">{t('systemRole.dept_admin')}</Option>
              <Option value="employee">{t('systemRole.employee')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label={t('employee.status')} initialValue="active">
            <Select>
              <Option value="active">{t('employeeStatus.active')}</Option>
              <Option value="inactive">{t('employeeStatus.inactive')}</Option>
              <Option value="left">{t('employeeStatus.left')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="position" label={t('employee.position')}>
            <Input />
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
