import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space, Card, Row, Col, Tabs, Switch, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '../../services/api';
import type { SystemConfig, Holiday } from '../../types';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [form] = Form.useForm();

  const queryClient = useQueryClient();

  // 系统配置
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: configService.get
  });

  // 节假日
  const { data: holidays = [], isLoading: holidayLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: configService.holidays
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: any }) => {
      const keyMap: Record<string, string> = {
        check_in_start: 'ATTENDANCE_WORK_START',
        check_out_end: 'ATTENDANCE_WORK_END',
        late_grace_minutes: 'LATE_GRACE_MINUTES',
        location_radius: 'ATTENDANCE_GPS_RADIUS_DEFAULT',
        max_makeup_per_month: 'MAX_MAKEUP_PER_MONTH',
        makeup_window_days: 'MAKEUP_WINDOW_DAYS',
        location_lat: 'ATTENDANCE_GPS_LAT',
        location_lng: 'ATTENDANCE_GPS_LNG',
      };
      return configService.update(keyMap[field] || field.toUpperCase(), String(value));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['systemConfig'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const createHolidayMutation = useMutation({
    mutationFn: (data: Omit<Holiday, 'id'>) => configService.createHoliday(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); message.success(t('common.success')); handleCloseHolidayModal(); },
    onError: () => message.error(t('common.error'))
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: number) => configService.deleteHoliday(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); message.success(t('common.success')); },
    onError: () => message.error(t('common.error'))
  });

  const handleCloseHolidayModal = () => { setIsHolidayModalOpen(false); form.resetFields(); };

  const handleSaveConfig = (field: string, value: any) => {
    updateConfigMutation.mutate({ field, value });
  };

  const handleSubmitHoliday = (values: any) => {
    createHolidayMutation.mutate({
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      is_workday: values.is_workday ?? false
    });
  };

  const holidayColumns = [
    { title: t('settings.holiday.date'), dataIndex: 'date', width: 140 },
    { title: t('settings.holiday.name'), dataIndex: 'name', width: 160 },
    {
      title: t('settings.holiday.type'),
      dataIndex: 'is_workday',
      width: 120,
      render: (val: boolean) => val ? t('settings.holiday.workday') : t('settings.holiday.offday')
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_: any, record: Holiday) => (
        <Popconfirm title={t('common.confirm')} onConfirm={() => deleteHolidayMutation.mutate(record.id!)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  const cfg = config as SystemConfig | undefined;

  return (
    <div style={{ padding: 24 }}>
      <h1>{t('settings.title')}</h1>

      <Tabs
        items={[
          {
            key: 'basic',
            label: t('settings.basicConfig'),
            children: (
              <Card loading={configLoading}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label={t('settings.workStartTime')} initialValue={cfg?.work_start_time}>
                      <Input type="time" defaultValue={cfg?.work_start_time}
                        onBlur={e => handleSaveConfig('work_start_time', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.workEndTime')} initialValue={cfg?.work_end_time}>
                      <Input type="time" defaultValue={cfg?.work_end_time}
                        onBlur={e => handleSaveConfig('work_end_time', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.locationRadius')} initialValue={cfg?.location_radius}>
                      <InputNumber defaultValue={cfg?.location_radius} min={50} max={2000}
                        onBlur={e => handleSaveConfig('location_radius', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.lateGraceMinutes')} initialValue={cfg?.late_grace_minutes}>
                      <InputNumber defaultValue={cfg?.late_grace_minutes} min={0} max={60}
                        onBlur={e => handleSaveConfig('late_grace_minutes', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.maxMakeupPerMonth')} initialValue={cfg?.max_makeup_per_month}>
                      <InputNumber defaultValue={cfg?.max_makeup_per_month} min={0} max={10}
                        onBlur={e => handleSaveConfig('max_makeup_per_month', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.makeupWindowDays')} initialValue={cfg?.makeup_window_days}>
                      <InputNumber defaultValue={cfg?.makeup_window_days} min={1} max={7}
                        onBlur={e => handleSaveConfig('makeup_window_days', e.target.value)} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={t('settings.locationLat')} initialValue={cfg?.location_lat}>
                      <InputNumber defaultValue={cfg?.location_lat} precision={7} style={{ width: '100%' }}
                        onBlur={e => handleSaveConfig('location_lat', e.target.value)} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={t('settings.locationLng')} initialValue={cfg?.location_lng}>
                      <InputNumber defaultValue={cfg?.location_lng} precision={7} style={{ width: '100%' }}
                        onBlur={e => handleSaveConfig('location_lng', e.target.value)} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )
          },
          {
            key: 'holiday',
            label: t('settings.holidayConfig'),
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsHolidayModalOpen(true)}>
                    {t('settings.addHoliday')}
                  </Button>
                </Space>
                <Table columns={holidayColumns} dataSource={holidays as Holiday[]} rowKey="id" loading={holidayLoading} pagination={false} />
              </>
            )
          }
        ]}
      />

      {/* 节假日弹窗 */}
      <Modal open={isHolidayModalOpen} title={t('settings.addHoliday')} onCancel={handleCloseHolidayModal} footer={null}>
        <Form form={form} onFinish={handleSubmitHoliday} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="date" label={t('settings.holiday.date')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="name" label={t('settings.holiday.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="is_workday" label={t('settings.holiday.type')} valuePropName="checked" initialValue={false}>
            <Switch checkedChildren={t('settings.holiday.workday')} unCheckedChildren={t('settings.holiday.offday')} />
          </Form.Item>
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={handleCloseHolidayModal}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createHolidayMutation.isPending}>{t('common.save')}</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
