import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCurrentUser } = useAppStore();

  const handleSubmit = (values: { username: string; password: string }) => {
    if (values.username && values.password) {
      setCurrentUser({ id: 1, name: values.username });
      message.success(t('common.success'));
      navigate('/employee');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Attendance System</h1>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Login</Button>
        </Form>
      </Card>
    </div>
  );
}